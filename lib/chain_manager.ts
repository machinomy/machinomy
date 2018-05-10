import Web3 = require('web3')
import pify from './util/pify'
import Signature from './Signature'

export default class ChainManager {
  private web3: Web3

  constructor (web3: Web3) {
    this.web3 = web3
  }

  async sign (address: string, data: string): Promise<Signature> {
    const sig = await pify<string>((cb: (err: Error, sig: string) => void) => this.web3.eth.sign(address, data, cb))
    return new Signature(sig)
  }
}
