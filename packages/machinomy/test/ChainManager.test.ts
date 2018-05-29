import * as Web3 from 'web3'
import * as sinon from 'sinon'
import ChainManager from '../lib/ChainManager'
import Signature from '../lib/Signature'

const expect = require('expect')

describe('ChainManager', () => {
  const SIGNATURE = '0xd8a923b39ae82bb39d3b64d58f06e1d776bcbcae34e5b4a6f4a952e8892e6a5b4c0f88833c06fe91729057035161e599fda536e8ce0ab4be2c214d6ea961e93a01'
  const ADDRESS = '0xaddr'
  const DATA = 'some data'

  let web3: Web3

  let manager: ChainManager

  beforeEach(() => {
    web3 = {} as Web3
    manager = new ChainManager(web3)
  })

  describe('sign', () => {
    it('should sign the data with the address\'s private key', async () => {
      (web3 as any).eth = {
        sign: sinon.stub().withArgs(ADDRESS, DATA, sinon.match.func).callsFake((addr: string, data: string, cb: Function) => {
          cb(null, SIGNATURE)
        })
      }

      let signature = await manager.sign(ADDRESS, DATA)
      expect(signature).toEqual(new Signature(SIGNATURE))
    })
  })
})
