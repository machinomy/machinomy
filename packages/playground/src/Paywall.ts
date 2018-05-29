import * as BigNumber from 'bignumber.js'
import * as debug from 'debug'
import * as express from 'express'
import * as urljoin from 'url-join'
import Machinomy from 'machinomy'
import { URL } from 'url'

const log = debug('paywall')

const HEADER_NAME = 'authorization'
const TOKEN_NAME = 'paywall'
const PREFIX = '/.well-known/machinomy'

function acceptUrl (base: URL) {
  return urljoin(base.toString(), PREFIX, 'accept')
}

function isAcceptUrl (url: string) {
  return url === PREFIX + '/accept'
}

function paywallHeaders (receiverAccount: string, gatewayUri: string, price: BigNumber.BigNumber) {
  let headers = {} as any
  headers['Paywall-Version'] = '0.1'
  headers['Paywall-Price'] = price
  headers['Paywall-Address'] = receiverAccount
  headers['Paywall-Gateway'] = gatewayUri
  return headers
}

function parseToken (req: express.Request, callback: (error: string | null, token?: string) => void) {
  let content = req.get(HEADER_NAME)
  if (content) {
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

export default class Paywall {
  receiverAccount: string
  base: URL
  machinomy: Machinomy

  constructor (machinomy: Machinomy, receiverAccount: string, base: URL) {
    this.machinomy = machinomy
    this.receiverAccount = receiverAccount
    this.base = base
  }

  paymentRequired (price: BigNumber.BigNumber, req: express.Request, res: express.Response): void {
    log('Require payment ' + price.toString() + ' for ' + req.path)
    res.status(402)
      .set(paywallHeaders(this.receiverAccount, acceptUrl(this.base), price))
      .send('Payment Required')
      .end()
  }

  guard (price: BigNumber.BigNumber, callback: express.RequestHandler): express.RequestHandler {
    let _guard = async (fixedPrice: BigNumber.BigNumber, req: express.Request, res: express.Response, next: express.NextFunction, error: any, token?: string) => {
      if (error || !token) {
        log(error)
        this.paymentRequired(fixedPrice, req, res)
      } else {
        this.machinomy.acceptToken({ token }).then(canAccept => {
          let isOk = canAccept.status
          if (isOk) {
            log('Got valid paywall token')
            callback(req, res, next)
          } else {
            log('Got invalid paywall token')
            this.paymentInvalid(fixedPrice, req, res)
          }
        }).catch(error => {
          next(error)
        })
      }
    }

    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      log(`Requested ${req.path}`)
      parseToken(req, (error, token) => {
        return _guard(price, req, res, next, error, token)
      })
    }
  }

  paymentInvalid (price: BigNumber.BigNumber, req: express.Request, res: express.Response) {
    res.status(409) // Conflict
      .set(paywallHeaders(this.receiverAccount, acceptUrl(this.base), price))
      .send('Payment Invalid')
      .end()
  }

  middleware () {
    let handler: express.RequestHandler = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      log('Called payment handler')
      try {
        const body = await this.machinomy.acceptPayment(req.body)
        log('Accept request')
        res.status(202).header('Paywall-Token', body.token).send(body)
      } catch (e) {
        log('Reject request', e)
        next(e)
      }
    }

    return function (req: express.Request, res: express.Response, next: express.NextFunction) {
      if (isAcceptUrl(req.url)) {
        handler(req, res, next)
      } else {
        next()
      }
    }
  }

}
