declare module 'web3-fake-provider' {
  import * as Web3 from 'web3'

  namespace FakeProvider {

  }

  class FakeProvider implements Web3.Provider {
    sendAsync (payload: Web3.JSONRPCRequestPayload, callback: (err: Error, result: Web3.JSONRPCResponsePayload) => void): void
  }

  export = FakeProvider
}
