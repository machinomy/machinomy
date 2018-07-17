import * as sinon from 'sinon'
import * as BigNumber from 'bignumber.js'
import { PaymentChannel } from './PaymentChannel'
import PaymentManager from './PaymentManager'
import Signature from './Signature'
import Payment from './payment'

const expect = require('expect')

describe('PaymentManager', () => {
  let chainManager: any

  let channelContract: any

  let options: any

  let manager: PaymentManager

  beforeEach(() => {
    chainManager = {}
    channelContract = {}
    options = {}
    manager = new PaymentManager(chainManager, channelContract, options)
  })

  describe('#buildPaymentForChannel', () => {
    it('builds a signed payment', () => {
      const chan: PaymentChannel = new PaymentChannel('send', 'recv', 'id', new BigNumber.BigNumber(100), new BigNumber.BigNumber(10), 0, '0xcabdab')

      channelContract.paymentDigest = sinon.stub().withArgs('id', new BigNumber.BigNumber(15)).resolves('digest')
      chainManager.sign = sinon.stub().withArgs('sender', 'digest').resolves(Signature.fromParts({
        v: 27,
        r: '0x01',
        s: '0x02'
      }))

      const expSig = Signature.fromParts({
        v: 27,
        r: '0x01',
        s: '0x02'
      })

      return manager.buildPaymentForChannel(chan, new BigNumber.BigNumber(5), new BigNumber.BigNumber(6), 'meta').then((pmt: Payment) => {
        expect(pmt.channelId).toBe('id')
        expect(pmt.sender).toBe('send')
        expect(pmt.receiver).toBe('recv')
        expect(pmt.price).toEqual(new BigNumber.BigNumber(5))
        expect(pmt.value).toEqual(new BigNumber.BigNumber(6))
        expect(pmt.channelValue).toEqual(new BigNumber.BigNumber(100))
        expect(pmt.signature.isEqual(expSig)).toBe(true)
        expect(pmt.meta).toBe('meta')
        expect(pmt.tokenContract).toBe('0xcabdab')
        expect(pmt.token).toBe(undefined)
      })
    })
  })
})
