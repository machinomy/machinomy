// import * as support from './support'
// import mongo from '../lib/mongo'
// let expect = require('expect')
// import Machinomy from '../index'

// const engineName = process.env.ENGINE_NAME || 'nedb'

// describe('receiver', () => {
//   before((done) => {
//     if (process.env.ENGINE_NAME === 'mongo') {
//       mongo.connectToServer(() => {
//         done()
//       })
//     } else {
//       done()
//     }
//   })

//   beforeEach((done) => {
//     if (process.env.ENGINE_NAME === 'mongo') {
//       mongo.db().dropDatabase(() => {
//         done()
//       })
//     } else {
//       done()
//     }
//   })

//   after((done) => {
//     if (process.env.ENGINE_NAME === 'mongo') {
//       mongo.db().close()
//     }
//     done()
//   })

//   let web3 = support.fakeWeb3()

//   describe('.build', () => {
//     it('build Receiver', async (done) => {
//       let machinomy = new Machinomy(sender, web3, { engine: 'mongo' })
//       let result = await machinomy.buy({
//         receiver: receiver,
//         price: 1,
//         gateway: 'http://localhost:3001/machinomy',
//         contractAddress: '0x8ad5c3cd38676d630b060a09baa40b0a3cb0b4b5'
//       }).catch((e: Error) => {
//         console.log(e)
//       })
//     })
//   })
// })
