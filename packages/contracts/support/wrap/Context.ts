import * as Web3 from 'web3'

export interface MethodAbi extends Web3.MethodAbi {
  singleReturnValue: boolean
}

export default interface Context {
  artifact: string
  contractName: string
  relativeArtifactPath: string
  getters: Array<MethodAbi>
  functions: Array<MethodAbi>
  events: Array<Web3.EventAbi>
}
