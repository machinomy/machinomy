import Storage from './storage'
import * as receiver from './receiver'
import * as channel from './channel'
import * as configuration from './configuration'
import * as express from 'express'
import { Log } from 'typescript-logger'
import Web3 = require('web3')

import urljoin = require('url-join')
import { Receiver } from './receiver'

const log = Log.create('middleware')

export const HTTP_CODE_CONFLICT = 409
export const HTTP_CODE_PAYMENT_REQUIRED = 402
export const HTTP_CODE_ACCEPTED = 202

export const HEADER_NAME = 'authorization'
export const TOKEN_NAME = 'paywall'

type GotTokenCallback = (error: string|null, token?: string) => void

const parseToken = (req: express.Request, callback: GotTokenCallback) => {
  let content = req.get(HEADER_NAME)
  if (content) {
    log.debug('Authorization header: ' + content)
    let authorization = content.split(' ')
    let type = authorization[0].toLowerCase()
    let token = authorization[1]
    if (type === TOKEN_NAME) {
      callback(null, token)
    } else {
      callback(`Invalid ${HEADER_NAME} token name present. Expected ${TOKEN_NAME}, got ${type}`)
    }
  } else {
    callback(`No ${HEADER_NAME} header present`)
  }
}

export type PriceFunction = (req: express.Request, callback: (fixedPrice: number) => void) => void

export class Paywall {
  receiverAccount: string
  gatewayUri: string
  server: Receiver

  /**
   * @param web3
   * @param account
   * @param address       full URI of the server, like 'http://example.com'
   * @param _storage
   */
  constructor (web3: Web3, account: string, address: string, _storage: Storage|null) {
    let settings = configuration.receiver()
    log.debug('Use settings for receiver', settings)
    this.receiverAccount = account
    this.gatewayUri = urljoin(address, configuration.PAYWALL_PATH)
    let s: Storage = _storage || new Storage(web3, settings.databaseFile, 'receiver')
    this.server = receiver.build(web3, account, s)
  }

  /**
   * Require payment before serving the request.
   */
  guard (price: number|PriceFunction, callback: (req: express.Request, res: express.Response) => void) {
    let _guard = (fixedPrice: number, req: express.Request, res: express.Response, error: any, token?: string) => {
      if (error) {
        log.error(error)
        this.paymentRequired(fixedPrice, req, res)
      } else if (token) {
        this.server.acceptToken(token).then(isOk => {
          if (isOk) {
            log.info('Got valid paywall token')
            callback(req, res)
          } else {
            log.warn('Got invalid paywall token')
            this.paymentInvalid(fixedPrice, req, res)
          }
        })
      }
    }

    return (req: express.Request, res: express.Response) => {
      log.info(`Requested ${req.path}`)
      parseToken(req, (error, token) => {
        if (typeof price === 'function') {
          price(req, fixedPrice => {
            _guard(fixedPrice, req, res, error, token)
          })
        } else {
          _guard(price, req, res, error, token)
        }
      })
    }
  }

  paymentInvalid (price: number, req: express.Request, res: express.Response) {
    res.status(HTTP_CODE_CONFLICT)
      .set(paywallHeaders(this.receiverAccount, this.gatewayUri, price))
      .send('Payment Invalid')
      .end()
  }

  paymentRequired (price: number, req: express.Request, res: express.Response) {
    log.info('Require payment ' + price + ' for ' + req.path)
    res.status(HTTP_CODE_PAYMENT_REQUIRED)
      .set(paywallHeaders(this.receiverAccount, this.gatewayUri, price))
      .send('Payment Required')
      .end()
  }

  middleware () {
    let handler = (req: express.Request, res: express.Response) => {
      let payment = new channel.Payment(req.body)
      this.server.acceptPayment(payment).then(token => {
        res.status(HTTP_CODE_ACCEPTED)
          .header('Paywall-Token', token)
          .send('Accepted')
          .end()
      }).catch(error => {
        throw error
      })
    }

    return (req: express.Request, res: express.Response, next: Function) => {
      let isHandlerAddres = req.url === '/' + configuration.PAYWALL_PATH
      if (isHandlerAddres) {
        handler(req, res)
      } else {
        next()
      }
    }
  }
}

/**
 * Server-side headers that require payments.
 */
const paywallHeaders = (receiverAccount: string, gatewayUri: string, price: number): object => {
  let headers: { [index: string]: string } = {}
  headers['Paywall-Version'] = configuration.VERSION.toString()
  headers['Paywall-Price'] = price.toString()
  headers['Paywall-Address'] = receiverAccount
  headers['Paywall-Gateway'] = gatewayUri
  return headers
}
