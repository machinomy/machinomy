# Machinomy [![Build Status][travis-img]][travis] [![Coverage Status][coveralls-img]][coveralls] [![Greenkeeper badge](https://badges.greenkeeper.io/machinomy/machinomy.svg)](https://greenkeeper.io/) [![Chat][gitter-img]][gitter]

[travis]: https://travis-ci.org/machinomy/machinomy
[travis-img]: https://img.shields.io/travis/machinomy/machinomy.svg
[coveralls]: https://coveralls.io/github/machinomy/machinomy?branch=master
[coveralls-img]: https://coveralls.io/repos/github/machinomy/machinomy/badge.svg?branch=master
[gitter]: https://gitter.im/machinomy/machinomy
[gitter-img]: https://img.shields.io/gitter/room/machinomy/machinomy.js.svg

Machinomy is a Node.js library for micropayments in Ether over HTTP. It allows you to send and receive a minuscule
amount of money instantly.

Web site: [machinomy.com](http://machinomy.com).
Twitter: [@machinomy](http://twitter.com/machinomy).
Support/Discussion: [Gitter](https://gitter.im/machinomy/machinomy).

## Documentation

## Installation

    $ yarn add machinomy

The library supports mainnet, Ropsten, and [Rinkeby](https://www.rinkeby.io/) networks.

## Tinkering

It takes two to tango: a seller and a buyer. Seller is `examples/server.ts` script. Build it or run through node-ts.
```
$ git clone https://github.com/machinomy/machinomy
$ yarn install && yarn build
$ node examples/server.js
```

And then run client script:

```
$ node examples/client.js
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

The process is more convoluted than buying. Better consult [examples/server.ts](examples/server.ts) file.

## Contributing

**Developers:** Machinomy is for you. Feel free to use it, break it, fork it, and make the world better. The code is standard TypeScript, no special skills required:

    $ yarn install

**Non-Developers:** You are lovely. As a starter, help us spread the word! Tell a friend right now.
If not enough, developers need flesh-world guidance. It starts with proper documentation and a pinch of fantasy.
Really anything, whether it is a short post on a use case of IoT micropayments, addition to the documentation (code comments, yay!),
or an elaborate analysis of machine economy implications. Do not hesitate to share any idea with us on [Gitter](https://gitter.im/machinomy/machinomy).

## License

Licensed under [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0).
