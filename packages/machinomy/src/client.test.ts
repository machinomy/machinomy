import * as sinon from 'sinon'
import * as BigNumber from 'bignumber.js'
import { Transport } from './transport'
import { ClientImpl } from './client'
import expectsRejection from './util/expects_rejection'
import { PaymentSerde } from './payment'
import { AcceptPaymentRequestSerde } from './accept_payment_request'
import { AcceptPaymentResponse } from './accept_payment_response'
import { AcceptTokenResponse } from './accept_token_response'
import IChannelManager from './IChannelManager'
import { PaymentRequiredResponse, PaymentRequiredResponseSerializer, TRANSPORT_VERSION } from './PaymentRequiredResponse'
import Signature from './Signature';

const expect = require('expect')

describe('ClientImpl', () => {
  let transport: Transport

  let channelManager: IChannelManager

  let client: ClientImpl

  beforeEach(() => {
    transport = {} as Transport
    channelManager = {} as IChannelManager
    client = new ClientImpl(transport, channelManager)
  })

  describe('doPreflight', () => {
    it('returns payment required when a payment required or OK response comes back', () => {
      transport.paymentRequired = sinon.stub().resolves(PaymentRequiredResponseSerializer.instance.deserialize({
        'paywall-version': TRANSPORT_VERSION,
        'paywall-address': '0x1234',
        'paywall-price': '1000',
        'paywall-gateway': 'http://honkhost:8080/machinomy',
        'paywall-meta': 'hello',
        'paywall-token-contract': '0xbeef',
        'paywall-channels': '[{"channelId": "0x111", "spent": "10", "lastPayment": "11", "sign": "0xbabe"}]'
      }))

      return client.doPreflight('0xcafe', 'http://honkhost:1234/site').then((res: PaymentRequiredResponse) => {
        expect(res.receiver).toBe('0x1234')
        expect(res.price).toEqual(new BigNumber.BigNumber(1000))
        expect(res.gateway).toBe('http://honkhost:8080/machinomy')
        expect(res.meta).toBe('hello')
        expect(res.tokenContract).toBe('0xbeef')
        expect(res.remoteChannelInfo.channels.length).toBe(1)
        expect(res.remoteChannelInfo.channels[0].channelId).toBe('0x111')
        expect(res.remoteChannelInfo.channels[0].spent).toEqual(new BigNumber.BigNumber(10))
        expect(res.remoteChannelInfo.channels[0].lastPayment).toEqual(new BigNumber.BigNumber(11))
        expect(res.remoteChannelInfo.channels[0].sign).toEqual(Signature.fromRpcSig('0xbabe'))
      })
    })

    it('throws an error for any other status code', () => {
      transport.paymentRequired = sinon.stub().rejects()

      return expectsRejection(client.doPreflight('0xcafe', 'http://honkhost:1234/site'))
    })

  })

  describe('doPayment', () => {
    let paymentJson: any

    beforeEach(() => {
      transport.doPayment = sinon.stub().resolves(new AcceptPaymentResponse('beep'))
      paymentJson = {
        channelId: '0x1234',
        value: '1000',
        sender: '0xbeef',
        receiver: '0xdead',
        price: '100',
        channelValue: '1000',
        v: 27,
        r: '0x000000000000000000000000000000000000000000000000000000000000000a',
        s: '0x000000000000000000000000000000000000000000000000000000000000000a',
        contractAddress: '0xab',
        token: '0x123'
      }
    })

    it('returns an AcceptPaymentResponse on success', () => {
      const payment = PaymentSerde.instance.deserialize(paymentJson)

      return client.doPayment(payment, 'gateway').then((res: AcceptPaymentResponse) => {
        expect(res.token).toBe('beep')
      })
    })

    it('emits willSendPayment and didSendPayment', () => {
      const payment = PaymentSerde.instance.deserialize(paymentJson)
      const will = sinon.stub()
      const did = sinon.stub()

      client.addListener('willSendPayment', will)
      client.addListener('didSendPayment', did)

      return client.doPayment(payment, 'gateway').then((res: AcceptPaymentResponse) => {
        expect(will.called).toBe(true)
        expect(did.called).toBe(true)
      })
    })

    it('throws an error if transport reject', () => {
      const payment = PaymentSerde.instance.deserialize(paymentJson)

      transport.doPayment = sinon.stub().rejects()

      return expectsRejection(client.doPayment(payment, 'gateway'))
    })

    it('throws an error if transport throw', () => {
      const payment = PaymentSerde.instance.deserialize(paymentJson)

      transport.doPayment = sinon.stub().throws('any')

      return expectsRejection(client.doPayment(payment, 'gateway'))
    })

  })

  describe('acceptPayment', () => {
    it('returns an AcceptPaymentResponse from the channel manager', () => {
      const req = AcceptPaymentRequestSerde.instance.deserialize({
        payment: {
          channelId: '0x1234',
          value: '1000',
          sender: '0xbeef',
          receiver: '0xdead',
          price: '100',
          channelValue: '1000',
          v: 27,
          r: '0xa',
          s: '0xb',
          contractAddress: '0xab',
          token: '0x123'
        }
      })

      channelManager.acceptPayment = sinon.stub().withArgs(req.payment).resolves('token')

      return client.acceptPayment(req).then((res: AcceptPaymentResponse) => {
        expect(res.token).toBe('token')
      })
    })
  })

  describe('doVerify', () => {

    it('returns an AcceptTokenResponse if the token is accepted', () => {
      transport.doVerify = sinon.stub().resolves(new AcceptTokenResponse(true))

      return client.doVerify('token', 'gateway').then((res: AcceptTokenResponse) => {
        expect(res.status).toBe(true)
      })
    })

    it('returns an AcceptTokenResponse if the token is rejected', () => {
      transport.doVerify = sinon.stub().resolves(new AcceptTokenResponse(false))

      return client.doVerify('token', 'gateway').then((res: AcceptTokenResponse) => {
        expect(res.status).toBe(false)
      })
    })

    it('returns a false AcceptTokenResponse if an error occurs', () => {
      transport.doVerify = sinon.stub().throws()

      return client.doVerify('token', 'gateway').then((res: AcceptTokenResponse) => {
        expect(res.status).toBe(false)
      })
    })
  })

  describe('acceptVerify', () => {
    it('returns an AcceptTokenResponse based on the request', () => {
      channelManager.verifyToken = sinon.stub().withArgs('token').resolves(true)

      return client.acceptVerify({ token: 'token' }).then((res: AcceptTokenResponse) => {
        expect(res.status).toBe(true)
      })
    })
  })
})
