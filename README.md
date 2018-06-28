# Machinomy Monorepo [![Build Status][travis-img]][travis] [![Coverage Status][codecov-img]][codecov] [![Greenkeeper badge](https://badges.greenkeeper.io/machinomy/machinomy.svg)](https://greenkeeper.io/) [![Chat][gitter-img]][gitter]

[travis]: https://travis-ci.org/machinomy/machinomy
[travis-img]: https://img.shields.io/travis/machinomy/machinomy.svg
[codecov]: https://codecov.io/gh/machinomy/machinomy
[codecov-img]: https://codecov.io/gh/machinomy/machinomy/branch/master/graph/badge.svg 
[gitter]: https://gitter.im/machinomy/machinomy
[gitter-img]: https://img.shields.io/gitter/room/machinomy/machinomy.js.svg

Machinomy Lerna Monorepo repository.

Available sub-projects:
- [Machinomy](packages/machinomy) is a Node.js library for micropayments in Ether over HTTP. It allows you to send and receive a minuscule amount of money instantly.
- [Contracts](packages/contracts) is a TypeScript interface for Ethereum contracts managed by [Truffle](https://github.com/trufflesuite/truffle) used by [Machinomy](packages/machinomy).
- [Examples](packages/examples) is [Machinomy](packages/machinomy) examples.
- [Playground](packages/playground) contains code of playground.machinomy.com



Web site: [machinomy.com](http://machinomy.com).
Twitter: [@machinomy](http://twitter.com/machinomy).
Support/Discussion: [Gitter](https://gitter.im/machinomy/machinomy).
FAQ: [GitHub Wiki Page](https://github.com/machinomy/machinomy/wiki/Frequently-Asked-Questions).

## Installation

Using [yarn](https://yarnpkg.com/lang/en/) is mandatory (**don't use npm!**)

    $ yarn add machinomy

The library supports mainnet, Ropsten, and [Rinkeby](https://www.rinkeby.io/) networks.

## Tinkering

It takes two to tango: a seller and a buyer. Seller is `packages/examples/src/server.ts` script. Build it or run through node-ts.
```
$ git clone https://github.com/machinomy/machinomy
$ yarn install && yarn bootstrap && yarn build
$ node packages/examples/src/server.js
```

And then run client script:

```
$ node packages/examples/src/client.js
```

## Usage

### Buy

Using TypeScript

```typescript
import Machinomy from 'machinomy'
const uri = 'http://localhost:3000/content'

const machinomy = new Machinomy(SENDER_ACCOUNT, web3)
const contents = await machinomy.buy({ receiver: RECEIVER_ACCOUNT, price: 100, gateway: 'http://localhost:3001/accept' })
console.log(contents)
```

### Sell

The process is more convoluted than buying. Better consult [packages/examples/src/server.ts](packages/examples/src/server.ts) file.

## Documentation

For more advanced documentation go to [doc/](doc/) folder.

## Contributing

**Developers:** Machinomy is for you. Feel free to use it, break it, fork it, and make the world better. The code is standard TypeScript, no special skills required:

    $ yarn install && yarn bootstrap

Using [yarn](https://yarnpkg.com/lang/en/) is mandatory (**don't use npm!**)

**Non-Developers:** You are lovely. As a starter, help us spread the word! Tell a friend right now.
If not enough, developers need flesh-world guidance. It starts with proper documentation and a pinch of fantasy.
Really anything, whether it is a short post on a use case of IoT micropayments, addition to the documentation (code comments, yay!),
or an elaborate analysis of machine economy implications. Do not hesitate to share any idea with us on [Gitter](https://gitter.im/machinomy/machinomy).

## License

Licensed under [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0).
