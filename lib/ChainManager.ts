import * as Web3 from 'web3'
import Signature from './Signature'

export default class ChainManager {
  private web3: Web3

  constructor (web3: Web3) {
    this.web3 = web3
  }

  async sign (address: string, data: string): Promise<Signature> {
    return new Promise<Signature>((resolve, reject) => {
      this.web3.eth.sign(address, data, (error, signature) => {
        error ? reject(error) : resolve(new Signature(signature))
      })
    })
  }
}
