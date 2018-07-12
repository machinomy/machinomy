import * as Web3 from 'web3'
import * as chai from 'chai'
import * as BigNumber from 'bignumber.js'
import * as asPromised from 'chai-as-promised'
import * as contracts from './index'
import * as support from './support'
import Units from './Units'
import Gaser from './support/Gaser'
import MintableToken from './support/MintableToken'

chai.use(asPromised)

const web3 = (global as any).web3 as Web3
const assert = chai.assert
const gaser = new Gaser(web3)

const TokenUnidirectional = artifacts.require<contracts.TokenUnidirectional.Contract>('TokenUnidirectional.sol')
const Token = artifacts.require<MintableToken.Contract>('support/MintableToken.sol')

const WRONG_CHANNEL_ID = '0xdeadbeaf'
const WRONG_SIGNATURE = '0xcafebabe'

contract('TokenUnidirectional', accounts => {
  const sender = accounts[0]
  const receiver = accounts[1]
  const alien = accounts[2]
  const channelValue = Units.convert(1, 'eth', 'wei')
  const settlingPeriod = 0

  let payment = Units.convert(0.1, 'eth', 'wei')
  let instance: contracts.TokenUnidirectional.Contract
  let token: MintableToken.Contract

  before(async () => {
    token = await Token.new()
    await token.mint(sender, channelValue.mul(100))
    await token.finishMinting()
    instance = await TokenUnidirectional.deployed()
  })

  async function createChannelRaw (channelId: string, _settlingPeriod: number = settlingPeriod) {
    let options = {
      from: sender
    }
    let value = Units.convert(1, 'eth', 'wei')
    await token.approve(instance.address, value, { from: sender })
    return instance.open(channelId, receiver, new BigNumber.BigNumber(_settlingPeriod), token.address, value, options)
  }

  async function createChannel (settlingPeriod?: number) {
    let channelId = contracts.channelId(sender, receiver)
    let log = await createChannelRaw(channelId, settlingPeriod)
    return log.logs[0].args
  }

  async function paymentSignature (sender: string, channelId: string, payment: BigNumber.BigNumber): Promise<string> {
    let digest = await instance.paymentDigest(channelId, payment, token.address)
    return web3.eth.sign(sender, digest)
  }

  describe('.open', () => {
    specify('emit DidOpen event', async () => {
      let channelId = contracts.channelId(sender, receiver)
      const log = await gaser.tx('TokenUnidirectional.open', createChannelRaw(channelId))
      assert(contracts.TokenUnidirectional.isDidOpenEvent(log.logs[0]))
      let event = log.logs[0].args as contracts.TokenUnidirectional.DidOpen
      assert.equal(event.channelId, channelId)
      assert.equal(event.sender, sender)
      assert.equal(event.receiver, receiver)
      assert.equal(event.value.toString(), channelValue.toString())
      assert.equal(event.tokenContract.toString(), token.address.toString())
    })

    specify('open channel', async () => {
      let event = await createChannel()
      let channel = await instance.channels(event.channelId)
      assert.equal(channel[0], sender)
      assert.equal(channel[1], receiver)
      assert.equal(channel[2].toString(), channelValue.toString())
      assert.equal(channel[3].toString(), settlingPeriod.toString())
      assert.equal(channel[4].toString(), '0')
      assert.equal(channel[5], token.address)

      assert.isTrue(await instance.isPresent(event.channelId))
      assert.isTrue(await instance.isOpen(event.channelId))
      assert.isFalse(await instance.isSettling(event.channelId))
      assert.isFalse(await instance.isAbsent(event.channelId))
    })

    specify('increase contract balance', async () => {
      let before = await token.balanceOf(instance.address)
      await createChannel()
      let after = await token.balanceOf(instance.address)
      let delta = after.minus(before)
      assert.equal(delta.toString(), channelValue.toString())
    })

    specify('decrease sender balance', async () => {
      let before = await token.balanceOf(sender)
      await createChannel()
      let after = await token.balanceOf(sender)
      let delta = before.minus(after)
      assert.equal(delta.toString(), channelValue.toString())
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
      let didOpenEvent = await createChannel()
      let signature = await paymentSignature(sender, didOpenEvent.channelId, payment)
      let tx = await gaser.tx('TokenUnidirectional.claim', instance.claim(didOpenEvent.channelId, payment, signature, { from: receiver }))
      assert.isTrue(contracts.Unidirectional.isDidClaimEvent(tx.logs[0]))

      let event = tx.logs[0].args as contracts.TokenUnidirectional.DidClaim
      assert.equal(event.channelId, didOpenEvent.channelId)
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
      assert.equal(channel[5], '0x0000000000000000000000000000000000000000')

      assert.isTrue(await instance.isAbsent(channelId))
      assert.isFalse(await instance.isPresent(channelId))
      assert.isFalse(await instance.isOpen(channelId))
      assert.isFalse(await instance.isSettling(channelId))
    })

    specify('decrease contract balance', async () => {
      let didOpenEvent = await createChannel()
      let before = await token.balanceOf(instance.address)
      let signature = await paymentSignature(sender, didOpenEvent.channelId, payment)
      await instance.claim(didOpenEvent.channelId, payment, signature, { from: receiver })
      let after = await token.balanceOf(instance.address)
      let delta = before.minus(after)
      assert.equal(delta.toString(), channelValue.toString())
    })

    specify('send money to receiver', async () => {
      let didOpenEvent = await createChannel()
      let signature = await paymentSignature(sender, didOpenEvent.channelId, payment)

      let before = await token.balanceOf(receiver)
      await instance.claim(didOpenEvent.channelId, payment, signature, { from: receiver })
      let after = await token.balanceOf(receiver)
      let delta = after.minus(before)
      assert.equal(delta.toString(), payment.toString())
    })

    specify('send channel value to receiver', async () => {
      let didOpenEvent = await createChannel()
      let _payment = channelValue.plus(payment)
      let signature = await paymentSignature(sender, didOpenEvent.channelId, _payment)
      let before = await token.balanceOf(receiver)
      await instance.claim(didOpenEvent.channelId, _payment, signature, { from: receiver })
      let after = await token.balanceOf(receiver)
      let delta = after.minus(before)
      assert.equal(delta.toString(), channelValue.toString())
    })

    specify('send change to sender', async () => {
      let didOpenEvent = await createChannel()
      let signature = await paymentSignature(sender, didOpenEvent.channelId, payment)
      let before = await token.balanceOf(sender)
      await instance.claim(didOpenEvent.channelId, payment, signature, { from: receiver })
      let after = await token.balanceOf(sender)
      let delta = after.minus(before)
      assert.equal(delta.toString(), channelValue.minus(payment).toString())
    })

    specify('refuse if sender', async () => {
      let didOpenEvent = await createChannel()
      let signature = await paymentSignature(sender, didOpenEvent.channelId, payment)
      return assert.isRejected(instance.claim(didOpenEvent.channelId, payment, signature, { from: sender }))
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
      let log = await gaser.tx('TokenUnidirectional.startSettling', instance.startSettling(didOpenEvent.channelId, { from: sender }))
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
})
