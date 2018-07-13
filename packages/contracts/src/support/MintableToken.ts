import { BigNumber } from 'bignumber.js'
import * as Web3 from 'web3'
import * as truffle from 'truffle-contract'

export namespace MintableToken {
  export interface Contract {
    address: string

    mint: {
      (to: string, amount: BigNumber | number, options?: Web3.CallData): Promise<truffle.TransactionResult>
      call (to: string, amount: BigNumber | number, options?: Web3.CallData): Promise<void>
      estimateGas (to: string, amount: BigNumber | number, options?: Web3.CallData): Promise<number>
    }

    finishMinting: {
      (options?: Web3.CallData): Promise<truffle.TransactionResult>
      call (options?: Web3.CallData): Promise<void>
      estimateGas (options?: Web3.CallData): Promise<number>
    }

    approve: {
      (receiver: string, value: BigNumber | number, options?: Web3.CallData): Promise<truffle.TransactionResult>
      call (receiver: string, value: BigNumber | number, options?: Web3.CallData): Promise<void>
      estimateGas (receiver: string, value: BigNumber | number, options?: Web3.CallData): Promise<number>
    }

    block: {
      (to: string, from: string, options?: Web3.CallData): Promise<truffle.TransactionResult>
      call (to: string, from: string, options?: Web3.CallData): Promise<void>
      estimateGas (to: string, from: string, options?: Web3.CallData): Promise<number>
    }

    unblock: {
      (to: string, from: string, options?: Web3.CallData): Promise<truffle.TransactionResult>
      call (to: string, from: string, options?: Web3.CallData): Promise<void>
      estimateGas (to: string, from: string, options?: Web3.CallData): Promise<number>
    }

    balanceOf: {
      (address: string): Promise<BigNumber>
      call (address: string): Promise<BigNumber>
    }
  }
}

export default MintableToken
