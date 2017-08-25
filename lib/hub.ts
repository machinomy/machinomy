import Storage from './storage'
import * as receiver from './receiver'
import * as channel from './channel'
import * as configuration from './configuration'
import * as express from 'express'
import Web3 = require('web3')
import { Receiver } from './receiver'
import Payment from './Payment'

export const HTTP_CODE_ACCEPTED = 202

export class Hub {
  receiverAccount: string
  gatewayUri: string
  server: Receiver

  /**
   * @param web3
   * @param account
   * @param address       full URI of the server, like 'http://example.com'
   * @param _storage
   */
  constructor (web3: Web3, account: string, _storage: Storage|null) {
    let settings = configuration.receiver()
    let s: Storage = _storage || new Storage(web3, settings.databaseFile, 'receiver')
    this.server = receiver.build(web3, account, s)
  }

  payment() {
    return (req: express.Request, res: express.Response, next: Function) => {
      let payment = new Payment(req.body)
      this.server.acceptPayment(payment).then(token => {
        res.status(HTTP_CODE_ACCEPTED)
          .header('Paywall-Token', token)
          .send('Accepted')
          .end()
      }).catch(error => {
        throw error
      })
    }
  }

  verify() {
   return (req: express.Request, res: express.Response, next: express.NextFunction):any => {
     let token = req.body.token
     if (token) {
       this.server.acceptToken(token).then(isOk => {
         if (isOk) {
           res.status(200).send({status: 'ok'});
         } else {
           res.status(500).send({status: 'token is invalid'});
         }
       })
     } else {
       res.status(500).json({status: 'no token accepted'});
     }
   }
  }
}
