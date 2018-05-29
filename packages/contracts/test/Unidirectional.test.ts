import * as Web3 from 'web3'
import * as chai from 'chai'
import * as BigNumber from 'bignumber.js'
import * as asPromised from 'chai-as-promised'
import * as contracts from '../src/index'
import * as support from './support'
import Units from '../src/Units'
import Gaser from './support/Gaser'

chai.use(asPromised)

const web3 = (global as any).web3 as Web3
const assert = chai.assert
const gaser = new Gaser(web3)

const Unidirectional = artifacts.require<contracts.Unidirectional.Contract>('Unidirectional.sol')

const WRONG_CHANNEL_ID = '0xdeadbeaf'
const WRONG_SIGNATURE = '0xcafebabe'

contract('Unidirectional', accounts => {
  const sender = accounts[0]
  const receiver = accounts[1]
  const alien = accounts[2]
  const channelValue = Units.convert(1, 'eth', 'wei')
  const settlingPeriod = 0
  let payment = Units.convert(0.1, 'eth', 'wei')
  let instance: contracts.Unidirectional.Contract

  async function createChannelRaw (channelId: string, _settlingPeriod: number = settlingPeriod) {
    let options = {
      from: sender,
      value: Units.convert(1, 'eth', 'wei')
    }
    return instance.open(channelId, receiver, new BigNumber.BigNumber(_settlingPeriod), options)
  }

  async function createChannel (settlingPeriod?: number) {
    let channelId = contracts.channelId(sender, receiver)
    let log = await createChannelRaw(channelId, settlingPeriod)
    return log.logs[0].args
  }

  async function paymentSignature (sender: string, channelId: string, payment: BigNumber.BigNumber): Promise<string> {
    let digest = await instance.paymentDigest(channelId, payment)
    return web3.eth.sign(sender, digest)
  }

  before(async () => {
    instance = await Unidirectional.deployed()
  })

  describe('.open', () => {
    specify('emit DidOpen event', async () => {
      let channelId = contracts.channelId(sender, receiver)
      const log = await gaser.tx('Unidirectional.open', createChannelRaw(channelId))
      assert(contracts.Unidirectional.isDidOpenEvent(log.logs[0]))
      let event = log.logs[0].args as contracts.Unidirectional.DidOpen
      assert.equal(event.channelId, channelId)
      assert.equal(event.sender, sender)
      assert.equal(event.receiver, receiver)
      assert.equal(event.value.toString(), channelValue.toString())
    })

    specify('open channel', async () => {
      let event = await createChannel()
      let channel = await instance.channels(event.channelId)
      assert.equal(channel[0], sender)
      assert.equal(channel[1], receiver)
      assert.equal(channel[2].toString(), channelValue.toString())
      assert.equal(channel[3].toString(), settlingPeriod.toString())
      assert.equal(channel[4].toString(), '0')

      assert.isTrue(await instance.isPresent(event.channelId))
      assert.isTrue(await instance.isOpen(event.channelId))
      assert.isFalse(await instance.isSettling(event.channelId))
      assert.isFalse(await instance.isAbsent(event.channelId))
    })

    specify('increase contract balance', async () => {
      let before = web3.eth.getBalance(instance.address)
      await createChannel()
      let after = web3.eth.getBalance(instance.address)
      let delta = after.minus(before)
      assert.equal(delta.toString(), channelValue.toString())
    })

    specify('decrease sender balance', async () => {
      let before = web3.eth.getBalance(sender)
      let channelId = contracts.channelId(sender, receiver)
      let log = await createChannelRaw(channelId)
      let after = web3.eth.getBalance(sender)
      let txCost = support.txPrice(web3, log)
      let actual = after.minus(before)
      let expected = channelValue.plus(txCost).neg()
      assert.equal(actual.toString(), expected.toString())
    })

    specify('respect previous channelId', async () => {
      let channelId = contracts.channelId(sender, receiver)
      await createChannelRaw(channelId)
      return assert.isRejected(createChannelRaw(channelId))
    })
  })

  describe('.claim', () => {
    async function openAndClaim () {
      let didOpenEvent = await createChannel()
      let signature = await paymentSignature(sender, didOpenEvent.channelId, payment)
      return instance.claim(didOpenEvent.channelId, payment, signature, { from: receiver })
    }

    specify('emit DidClaim event', async () => {
      let tx = await gaser.tx('Unidirectional.claim', openAndClaim())
      assert.isTrue(contracts.Unidirectional.isDidClaimEvent(tx.logs[0]))
    })
    specify('remove channel', async () => {
      let tx = await openAndClaim()
      let event = tx.logs[0].args
      let channelId = event.channelId

      let channel = await instance.channels(channelId)
      assert.equal(channel[0], '0x0000000000000000000000000000000000000000')
      assert.equal(channel[1], '0x0000000000000000000000000000000000000000')
      assert.equal(channel[2].toString(), '0')
      assert.equal(channel[3].toString(), '0')
      assert.equal(channel[4].toString(), '0')

      assert.isTrue(await instance.isAbsent(channelId))
      assert.isFalse(await instance.isPresent(channelId))
      assert.isFalse(await instance.isOpen(channelId))
      assert.isFalse(await instance.isSettling(channelId))
    })
    specify('decrease contract balance', async () => {
      let didOpenEvent = await createChannel()
      let before = web3.eth.getBalance(instance.address)
      let signature = await paymentSignature(sender, didOpenEvent.channelId, payment)
      await instance.claim(didOpenEvent.channelId, payment, signature, { from: receiver })
      let after = web3.eth.getBalance(instance.address)
      let delta = before.minus(after)
      assert.equal(delta.toString(), channelValue.toString())
    })
    specify('send money to receiver', async () => {
      let didOpenEvent = await createChannel()
      let signature = await paymentSignature(sender, didOpenEvent.channelId, payment)
      let before = web3.eth.getBalance(receiver)
      let tx = await instance.claim(didOpenEvent.channelId, payment, signature, { from: receiver })
      let txCost = support.txPrice(web3, tx)
      let after = web3.eth.getBalance(receiver)
      let delta = after.minus(before).plus(txCost)
      assert.equal(delta.toString(), payment.toString())
    })
    specify('send channel value to receiver', async () => {
      let didOpenEvent = await createChannel()
      let _payment = channelValue.plus(payment)
      let signature = await paymentSignature(sender, didOpenEvent.channelId, _payment)
      let before = web3.eth.getBalance(receiver)
      let tx = await instance.claim(didOpenEvent.channelId, _payment, signature, { from: receiver })
      let txCost = support.txPrice(web3, tx)
      let after = web3.eth.getBalance(receiver)
      let delta = after.minus(before).plus(txCost)
      assert.equal(delta.toString(), channelValue.toString())
    })
    specify('send change to sender', async () => {
      let didOpenEvent = await createChannel()
      let signature = await paymentSignature(sender, didOpenEvent.channelId, payment)
      let before = web3.eth.getBalance(sender)
      await instance.claim(didOpenEvent.channelId, payment, signature, { from: receiver })
      let after = web3.eth.getBalance(sender)
      let delta = after.minus(before)
      assert.equal(delta.toString(), channelValue.minus(payment).toString())
    })
    specify('refuse if sender', async () => {
      let didOpenEvent = await createChannel()
      let signature = await paymentSignature(sender, didOpenEvent.channelId, payment)
      let before = web3.eth.getBalance(sender)
      await instance.claim(didOpenEvent.channelId, payment, signature, { from: receiver })
      let after = web3.eth.getBalance(sender)
      let delta = after.minus(before)
      assert.equal(delta.toString(), channelValue.minus(payment).toString())
    })
    specify('refuse if alien', async () => {
      let didOpenEvent = await createChannel()
      let signature = await paymentSignature(sender, didOpenEvent.channelId, payment)
      return assert.isRejected(instance.claim(didOpenEvent.channelId, payment, signature, { from: alien }))
    })
    specify('refuse if no channel', async () => {
      let signature = await paymentSignature(sender, WRONG_CHANNEL_ID, payment)
      return assert.isRejected(instance.claim(WRONG_CHANNEL_ID, payment, signature, { from: receiver }))
    })
    specify('refuse if wrong signature', async () => {
      let didOpenEvent = await createChannel()
      return assert.isRejected(instance.claim(didOpenEvent.channelId, payment, WRONG_SIGNATURE, { from: receiver }))
    })
  })

  describe('.startSettling', () => {
    specify('emit DidStartSettling event', async () => {
      let didOpenEvent = await createChannel()
      let log = await gaser.tx('Unidirectional.startSettling', instance.startSettling(didOpenEvent.channelId, { from: sender }))
      assert.isTrue(contracts.Unidirectional.isDidStartSettlingEvent(log.logs[0]))
    })
    specify('set settlingUntil', async () => {
      let settlingPeriod = 3
      let didOpenEvent = await createChannel(settlingPeriod)
      let channelId = didOpenEvent.channelId
      let tx = await instance.startSettling(channelId, { from: sender })
      let channel = await instance.channels(channelId)
      let expected = tx.receipt.blockNumber + settlingPeriod
      let actual = channel[4]
      assert.equal(actual.toString(), expected.toString())
    })
    specify('refuse if receiver', async () => {
      let didOpenEvent = await createChannel()
      return assert.isRejected(instance.startSettling(didOpenEvent.channelId, { from: receiver }))
    })
    specify('refuse if alien', async () => {
      let didOpenEvent = await createChannel()
      return assert.isRejected(instance.startSettling(didOpenEvent.channelId, { from: alien }))
    })
    specify('refuse if no channel', async () => {
      return assert.isRejected(instance.startSettling(WRONG_CHANNEL_ID, { from: sender }))
    })
    specify('refuse if settling', async () => {
      let settlingPeriod = 3
      let didOpenEvent = await createChannel(settlingPeriod)
      let channelId = didOpenEvent.channelId
      await instance.startSettling(channelId, { from: sender })
      return assert.isRejected(instance.startSettling(channelId, { from: sender }))
    })
  })

  describe('.settle', () => {
    specify('emit DidSettle event', async () => {
      let didOpenEvent = await createChannel()
      await instance.startSettling(didOpenEvent.channelId, { from: sender })
      let log = await gaser.tx('Unidirectional.settle', instance.settle(didOpenEvent.channelId))
      assert.isTrue(contracts.Unidirectional.isDidSettleEvent(log.logs[0]))
    })
    specify('send money to sender', async () => {
      let didOpenEvent = await createChannel()
      await instance.startSettling(didOpenEvent.channelId, { from: sender })
      let before = web3.eth.getBalance(sender)
      let log = await instance.settle(didOpenEvent.channelId)
      let txCost = support.txPrice(web3, log)
      let after = web3.eth.getBalance(sender)
      let actual = after.minus(before)
      assert.equal(actual.toString(), channelValue.minus(txCost).toString())
    })
    specify('remove channel', async () => {
      let didOpenEvent = await createChannel()
      let channelId = didOpenEvent.channelId
      await instance.startSettling(didOpenEvent.channelId, { from: sender })
      await instance.settle(didOpenEvent.channelId)
      assert.isTrue(await instance.isAbsent(channelId))
      assert.isFalse(await instance.isPresent(channelId))
      assert.isFalse(await instance.isOpen(channelId))
      assert.isFalse(await instance.isSettling(channelId))
    })
    specify('refuse if no channel', async () => {
      return assert.isRejected(instance.startSettling(WRONG_CHANNEL_ID, { from: sender }))
    })
    specify('refuse if still settling', async () => {
      let didOpenEvent = await createChannel(30)
      await instance.startSettling(didOpenEvent.channelId, { from: sender })
      return assert.isRejected(instance.settle(didOpenEvent.channelId, { from: sender }))
    })
  })

  describe('.deposit', () => {
    specify('emit DidDeposit event', async () => {
      let didOpenEvent = await createChannel()
      let channelId = didOpenEvent.channelId
      let tx = await gaser.tx('Unidirectional.deposit', instance.deposit(channelId, { value: payment, from: sender }))
      assert(contracts.Unidirectional.isDidDepositEvent(tx.logs[0]))
      let event = tx.logs[0].args as contracts.Unidirectional.DidDeposit
      assert.equal(event.channelId, channelId)
    })

    specify('increase contract balance', async () => {
      let before = web3.eth.getBalance(instance.address)
      let channelId = (await createChannel()).channelId
      await instance.deposit(channelId, { value: payment, from: sender })
      let after = web3.eth.getBalance(instance.address)
      let delta = after.minus(before)
      assert.equal(delta.toString(), channelValue.plus(payment).toString())
    })

    specify('increase channel value', async () => {
      let channelId = (await createChannel()).channelId
      let before = (await instance.channels(channelId))[2]
      await instance.deposit(channelId, { value: payment, from: sender })
      let after = (await instance.channels(channelId))[2]
      let delta = after.minus(before)
      assert.equal(delta.toString(), payment.toString())
    })

    specify('decrease sender balance', async () => {
      let channelId = (await createChannel()).channelId
      let before = web3.eth.getBalance(sender)
      let log = await instance.deposit(channelId, { value: payment, from: sender })
      let after = web3.eth.getBalance(sender)
      let txCost = support.txPrice(web3, log)
      let actual = before.minus(after)
      let expected = txCost.plus(payment)
      assert.equal(actual.toString(), expected.toString())
    })

    specify('not if no channel', async () => {
      return assert.isRejected(instance.deposit(WRONG_CHANNEL_ID, { value: payment, from: sender }))
    })

    specify('not if settling', async () => {
      let didOpenEvent = await createChannel(30)
      await instance.startSettling(didOpenEvent.channelId, { from: sender })
      return assert.isRejected(instance.deposit(didOpenEvent.channelId, { value: payment, from: sender }))
    })

    specify('not if receiver', async () => {
      let channelId = contracts.channelId(sender, receiver)
      await createChannelRaw(channelId)
      return assert.isRejected(instance.deposit(channelId, { value: payment, from: receiver }))
    })

    specify('not if alien', async () => {
      let channelId = contracts.channelId(sender, receiver)
      await createChannelRaw(channelId)
      return assert.isRejected(instance.deposit(channelId, { value: payment, from: alien }))
    })
  })
})
