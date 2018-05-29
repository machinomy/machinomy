import Signature from './Signature'

const expect = require('expect')

describe('Signature', () => {
  const SIGNATURE = '0xd8a923b39ae82bb39d3b64d58f06e1d776bcbcae34e5b4a6f4a952e8892e6a5b4c0f88833c06fe91729057035161e599fda536e8ce0ab4be2c214d6ea961e93a01'

  function verify (inst: Signature) {
    expect(inst.toString()).toEqual(SIGNATURE)
    expect(inst.toParts()).toEqual({
      v: 28,
      r: '0xd8a923b39ae82bb39d3b64d58f06e1d776bcbcae34e5b4a6f4a952e8892e6a5b',
      s: '0x4c0f88833c06fe91729057035161e599fda536e8ce0ab4be2c214d6ea961e93a'
    })
  }

  describe('direct construction', () => {
    it('should return the correct parts and string representation', () => {
      const inst = new Signature(SIGNATURE)
      verify(inst)
    })
  })

  describe('fromRpcSig', () => {
    it('should return the correct parts and string representation', () => {
      const inst = Signature.fromRpcSig(SIGNATURE)
      verify(inst)
    })
  })

  describe('fromParts', () => {
    it('should return the correct parts and string representation', () => {
      const inst = Signature.fromParts({
        v: 28,
        r: '0xd8a923b39ae82bb39d3b64d58f06e1d776bcbcae34e5b4a6f4a952e8892e6a5b',
        s: '0x4c0f88833c06fe91729057035161e599fda536e8ce0ab4be2c214d6ea961e93a'
      })

      verify(inst)
    })
  })
})
