import * as debug from 'debug'
import * as dotenv from 'dotenv'
import * as express from 'express'
import { URL } from 'url'
import * as urljoin from 'url-join'
import fetcher from 'machinomy/lib/util/fetcher'
import * as BigNumber from 'bignumber.js'

const log = debug('paywall')

const HEADER_NAME = 'authorization'
const TOKEN_NAME = 'paywall'
const PREFIX = '/payments'

dotenv.config()

const GATEWAY_URL = process.env.GATEWAY_URL

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

function parseToken (req: express.Request, callback: (error: string | null, token?: string, meta?: string, price?: BigNumber.BigNumber) => void) {
  let content = req.get(HEADER_NAME)
  if (content) {
    let authorization = content.split(' ')
    let type = authorization[0].toLowerCase()
    let token = authorization[1]
    let meta = authorization[2]
    let price = new BigNumber.BigNumber(authorization[3])
    if (type === TOKEN_NAME) {
      callback(null, token, meta, price)
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

  constructor (receiverAccount: string, base: URL) {
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
    let _guard = async (fixedPrice: BigNumber.BigNumber, req: express.Request, res: express.Response, next: express.NextFunction, error: any, token?: string, meta?: string) => {
      if (error || !token) {
        log(error)
        this.paymentRequired(fixedPrice, req, res)
      } else {
        const response = await fetcher.fetch(`${GATEWAY_URL}${PREFIX}/verify/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        })

        if (response.status >= 200 && response.status < 300) {
          log('Got valid paywall token')
          callback(req, res, next)
        } else {
          log('Got invalid paywall token')
          this.paymentInvalid(fixedPrice, req, res)
        }
      }
    }

    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      log(`Requested ${req.path}`)
      parseToken(req, (error, token, meta) => {
        return _guard(price, req, res, next, error, token!, meta!)
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
        const response = await fetcher.fetch(`${GATEWAY_URL}${PREFIX}/accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(req.body)
        })
        log('Accept request')
        const json = await response.json()
        res.status(202).header('Paywall-Token', json.token).send(json)
      } catch (e) {
        log('Reject request', e)
        next(e)
      }
    }

    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (isAcceptUrl(req.url)) {
        handler(req, res, next)
      } else {
        next()
      }
    }
  }

}
