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

The website contains [Getting Started](https://machinomy.com/documentation/getting-started/) guide.
It is more illustrative than instructions below.

Machinomy provides a simple [JS API](https://machinomy.com/documentation/api/classes/_index_.machinomy.html).

To run Machinomy against a local Ethereum test network, see the [Running with Ganache CLI](docs/ganache-cli.md) Guide.

## Installation

    $ npm install -g machinomy

Assumptions:
* [geth](https://github.com/ethereum/go-ethereum) node runs on `http://localhost:8545`,
* geth runs [Ropsten](https://blog.ethereum.org/2016/11/20/from-morden-to-ropsten/) network.

The library supports currently Ropsten network only. It is early days, we would like to avoid
losses by mistake on your side. Ether on Ropsten cost nothing. One could get some from [ZeroGox Faucet](https://zerogox.com/ethereum/wei_faucet) for free.

## Set up

To only play with CLI a command below is enough:

    $ machinomy setup

If you also intend to _sell_ services via HTTP, set up "receiver" side:

    $ machinomy setup --namespace receiver
    
### Environment Variables

Machinomy can be configured on the CLI using a few environment variables. Specifically:

| Variables  | Use |
| ------------- | ------------- |
| `MACHINOMY_GETH_ADDR`  | Tells the CLI where `geth`'s RPC server is running. Defaults to `http://localhost:8545`. |
| `MACHINOMY_SENDER_ENGINE`  | Tells the CLI which database engine to use. Default to `nedb`, but can also be `mongo` or `postgres`.  |

## Usage

### Buy

    $ machinomy buy http://playground.machinomy.com/hello

Buys a service provided by a respective endpoint. You could buy the service from JavaScript as well:

```javascript
'use strict'

const machinomy = require('machinomy')
const uri = 'http://playground.machinomy.com/hello'

const settings = machinomy.configuration.sender()
machinomy.buy(uri, settings.account, settings.password).then(contents => {
  console.log(contents)
}).catch(error => {
  throw error
})
```

### Sell

Machinomy allows you to sell a service over HTTP. The library provides [Express](http://expressjs.com) middleware
to abstract details of payment handling from the business logic.

A code like below runs on `http://playground.machinomy.com/hello`:

```javascript
"use strict";

const express    = require("express"),
      bodyParser = require("body-parser"),
      machinomy  = require("machinomy");

const BASE = "http://localhost:3000";

const settings = machinomy.configuration.receiver();
let paywall = new machinomy.Paywall(settings.account, BASE);

let app = express();
app.use(bodyParser.json());
app.use(paywall.middleware());

app.get("/hello", paywall.guard(1000, function (req, res) {
    res.write("Have just received 1000 wei.\n");
    res.end("Hello, meat world!");
}));

app.listen(8080, function(_) {
    console.log(`Waiting at ${BASE}/hello ...`);
});
```

You could test it with `machinomy buy` command described above.

## Contributing

**Developers:** Machinomy is for you. Feel free to use it, break it, fork it, and make the world better. The code is standard TypeScript, no special skills required:

    $ yarn install

**Non-Developers:** You are lovely. As a starter, help us spread the word! Tell a friend right now.
If not enough, developers need flesh-world guidance. It starts with proper documentation and a pinch of fantasy.
Really anything, whether it is a short post on a use case of IoT micropayments, addition to the documentation (code comments, yay!),
or an elaborate analysis of machine economy implications. Do not hesitate to share any idea with us on [Gitter](https://gitter.im/machinomy/machinomy).

## License

Licensed under [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0).
