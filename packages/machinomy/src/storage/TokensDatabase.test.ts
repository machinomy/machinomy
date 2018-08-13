import * as support from '../support'
import ChannelId from '../ChannelId'
import { PaymentChannel } from '../PaymentChannel'
import * as BigNumber from 'bignumber.js'
import ITokensDatabase from './ITokensDatabase'
import * as expect from 'expect'
import IChannelsDatabase from './IChannelsDatabase'
import ChannelInflator from '../ChannelInflator'
import { tmpStorage } from '../util/tmpStorage'

describe('TokensDatabase', () => {
  let tokens: ITokensDatabase
  let channels: IChannelsDatabase

  const inflator = {} as ChannelInflator

  beforeEach(async () => {
    const storage = await tmpStorage(inflator)
    tokens = storage.tokensDatabase
    channels = storage.channelsDatabase
  })

  describe('#isPresent', () => {
    it('check if non-existent token is absent', () => {
      const randomToken = support.randomInteger().toString()
      return tokens.isPresent(randomToken).then((isPresent: boolean) => {
        expect(isPresent).toBeFalsy()
      })
    })

    it('check if existing token is present', () => {
      const randomToken = support.randomInteger().toString()
      const channelId = ChannelId.random()

      return channels.save(new PaymentChannel('sender', 'receiver', channelId.toString(), new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), undefined, ''))
        .then(() => {
          return tokens.save(randomToken, channelId).then(() => {
            return tokens.isPresent(randomToken)
          }).then((isPresent: boolean) => {
            expect(isPresent).toBeTruthy()
          })
        })
    })
  })
})
