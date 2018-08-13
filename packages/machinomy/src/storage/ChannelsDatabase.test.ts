import ChannelId from '../ChannelId'
import { PaymentChannel, PaymentChannelJSON } from '../PaymentChannel'
import { BigNumber } from 'bignumber.js'
import expectsRejection from '../util/expects_rejection'
import * as expect from 'expect'
import IChannelsDatabase from './IChannelsDatabase'
import { tmpStorage } from '../util/tmpStorage'
import ChannelInflator from '../ChannelInflator'
import * as sinon from 'sinon'
import ChannelContract from '../ChannelContract'

describe('ChannelsDatabase', () => {
  let channels: IChannelsDatabase
  let inflator = {
    inflate: async (paymentChannelJSON: PaymentChannelJSON) => {
      return new PaymentChannel(
        paymentChannelJSON.sender,
        paymentChannelJSON.receiver,
        paymentChannelJSON.channelId,
        paymentChannelJSON.value,
        paymentChannelJSON.spent,
        paymentChannelJSON.state,
        paymentChannelJSON.tokenContract
      )
    }
  } as ChannelInflator
  let fakeContract: ChannelContract

  before(async () => {
    let storage = await tmpStorage(inflator)
    await storage.migrator.sync()
    channels = storage.channelsDatabase
  })

  beforeEach(async () => {
    fakeContract = {} as ChannelContract
    fakeContract.channelById = sinon.stub()
    fakeContract.getState = (): Promise<number> => {
      return Promise.resolve(0)
    }

    (fakeContract.channelById as sinon.SinonStub).resolves([null, null, '2'])
  })

  describe('#updateState', () => {
    it('updates the state value', async () => {
      const id = ChannelId.random().toString()
      await channels.save(new PaymentChannel('sender', 'receiver', id, new BigNumber(69), new BigNumber(8), 0, ''))
      await channels.updateState(id, 2)
      let chan = await channels.firstById(id)
      expect(chan).toBeTruthy()
      expect(chan!.state).toBe(2)
    })
  })

  describe('#spend', () => {
    it('update spent amount', async () => {
      const channelId = ChannelId.random()
      const hexChannelId = channelId.toString()
      const paymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber(10), new BigNumber(0), undefined, '')
      const spent = new BigNumber(33)

      await channels.save(paymentChannel)
      await channels.spend(channelId, spent)
      let updated = await channels.firstById(channelId)
      expect(updated!.channelId).toBe(hexChannelId)
      expect(updated!.spent).toEqual(spent)
    })
  })

  describe('#save and #firstById', () => {
    it('match', async () => {
      const channelId = ChannelId.random()
      const hexChannelId = channelId.toString()
      const paymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber(10), new BigNumber(0), 0, '')

      await channels.save(paymentChannel)
      let saved = await channels.firstById(channelId)
      expect(saved!.toString()).toBe(paymentChannel.toString())
    })
  })

  describe('#firstById', () => {
    it('return null if not found', async () => {
      const channelId = ChannelId.random()
      let found = await channels.firstById(channelId)
      expect(found).toBeNull()
    })
  })

  describe('#saveOrUpdate', () => {
    it('save new PaymentChannel', async () => {
      const channelId = ChannelId.random()
      const hexChannelId = channelId.toString()
      const paymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber(3), new BigNumber(0), 0, '')
      let notFound = await channels.firstById(channelId)
      expect(notFound).toBeNull()
      await channels.saveOrUpdate(paymentChannel)
      let found = await channels.firstById(channelId)
      expect(JSON.stringify(found)).toBe(JSON.stringify(paymentChannel))
    })

    it('update spent value on existing PaymentChannel', async () => {
      const channelId = ChannelId.random()
      const hexChannelId = channelId.toString()
      const spent = new BigNumber(5)
      const paymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber(3), new BigNumber(0), undefined)
      const updatedPaymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber(3), spent, undefined)
      await channels.save(paymentChannel)
      await channels.saveOrUpdate(updatedPaymentChannel)
      let found = await channels.firstById(channelId)
      expect(found!.spent).toEqual(spent)
    })
  })

  describe('#deposit', () => {
    it('updates the channel value to the sum of the old value and new', async () => {
      const channelId = ChannelId.random()
      const hexChannelId = channelId.toString()
      const newValue = new BigNumber(15)
      const paymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber(10), new BigNumber(0), undefined, '')
      await channels.save(paymentChannel)
      await channels.deposit(hexChannelId, new BigNumber(5))
      let found = await channels.firstById(channelId)
      expect(found!.value).toEqual(newValue)
    })

    it('throws an error if the channel does not exist', () => {
      return expectsRejection(channels.deposit('123-abc', new BigNumber(10)))
    })
  })

  describe('#all', () => {
    it('return all the channels', async () => {
      const channelId = ChannelId.random()
      const hexChannelId = channelId.toString()
      const paymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber(10), new BigNumber(0), undefined, '')

      await channels.save(paymentChannel)
      let found = await channels.all()
      expect(found.map(p => p.channelId).includes(channelId.toString())).toBeTruthy()
    })
  })

  describe('#allSettling', () => {
    it('returns all settling channels', () => {
      const channelId1 = ChannelId.random()
      const channelId2 = ChannelId.random()
      const hexChannelId1 = channelId1.toString()
      const hexChannelId2 = channelId2.toString()
      const paymentChannel1 = new PaymentChannel('sender', 'receiver', hexChannelId1, new BigNumber(10), new BigNumber(0), 0, '')
      const paymentChannel2 = new PaymentChannel('sender', 'receiver', hexChannelId2, new BigNumber(10), new BigNumber(0), 1, '')

      fakeContract.getState = sinon.stub().withArgs(hexChannelId2).resolves(1)

      return Promise.all([
        channels.save(paymentChannel1),
        channels.save(paymentChannel2)
      ]).then(() => {
        return channels.allSettling()
      }).then(found => {
        expect(found.map(p => p.channelId).includes(paymentChannel2.channelId.toString())).toBeTruthy()
      })
    })
  })

  describe('#allOpen', () => {
    it('returns all open channels', () => {
      const channelId1 = ChannelId.random()
      const channelId2 = ChannelId.random()
      const channelId3 = ChannelId.random()
      const hexChannelId1 = channelId1.toString()
      const hexChannelId2 = channelId2.toString()
      const hexChannelId3 = channelId3.toString()
      const paymentChannel1 = new PaymentChannel('sender', 'receiver', hexChannelId1, new BigNumber(10), new BigNumber(0), 0, '')
      const paymentChannel2 = new PaymentChannel('sender', 'receiver', hexChannelId2, new BigNumber(10), new BigNumber(0), 1, '')
      const paymentChannel3 = new PaymentChannel('sender', 'receiver', hexChannelId3, new BigNumber(10), new BigNumber(0), 2, '')

      return Promise.all([
        channels.save(paymentChannel1),
        channels.save(paymentChannel2),
        channels.save(paymentChannel3)
      ]).then(() => {
        return channels.allOpen()
      }).then(found => {
        expect(found.map(p => p.channelId).includes(paymentChannel1.channelId.toString())).toBeTruthy()
      })
    })
  })
})
