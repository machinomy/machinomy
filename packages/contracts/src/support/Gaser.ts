import * as Web3 from 'web3'
import * as truffle from 'truffle-contract'
import Conversion from './Conversion'

export default class Gaser {
  web3: Web3
  conversion: Conversion
  isEnabled: boolean

  constructor (_web3: Web3) {
    this.web3 = _web3
    this.conversion = new Conversion(_web3)
    this.isEnabled = Boolean(process.env.LOG_GAS_COST)
  }

  async diff<A> (name: string, account: string, fn: () => A, forceLog?: boolean): Promise<A> {
    let before = this.web3.eth.getBalance(account)
    let result = fn()
    let after = this.web3.eth.getBalance(account)
    let gasCost = this.conversion.ethToGas(before.minus(after))
    this.log(gasCost, name, forceLog)
    return result
  }

  async tx (name: string, promisedTx: Promise<truffle.TransactionResult>, forceLog?: boolean): Promise<truffle.TransactionResult> {
    let tx = await promisedTx
    this.log(tx.receipt.gasUsed, name, forceLog)
    return tx
  }

  private log (gasCost: number, name: string, forceLog: boolean = false) {
    if (this.isEnabled || forceLog) {
      let usdCost = this.conversion.gasToUsd(gasCost).toFixed(2)
      console.log(`GAS: ${name}: ${gasCost} ($${usdCost})`)
    }
  }
}
