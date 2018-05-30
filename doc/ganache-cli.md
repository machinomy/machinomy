# Running with Ganache CLI (formerly TestRPC)

[Ganache CLI](https://github.com/trufflesuite/ganache-cli), formerly called TestRPC, provides a fast and easy way to develop and test an Ethereum Dapp. It provides
all the features of a full-blown Ethereum network, while delivering unprecedented
speed of transactions.

## Prerequisites

1. Install [Ganache CLI](https://github.com/trufflesuite/ganache-cli)
2. Clone [`machinomy`](https://github.com/machinomy/machinomy) repository from GitHub
3. Do ```yarn install && yarn bootstrap```

## Running Ganache CLI and Loading Contracts

1\. Start Ganache CLI.

```
$ ganache-cli --networkId 1024
```

Please, set network id to something less then 2 millions. The contract assumes network id to be of `uint32` type.
By default, Ganache CLI sets the network id to some very big number that does not fit the type.

2\. Deploy contracts onto the Ganache CLI Ethereum network.

```shell
cd packages/contracts
yarn truffle:compile
yarn truffle:migrate --reset
```

3\. Make `contracts` package available as a local dependency.

```shell
yarn link && yarn prepublish
```

`yarn prepublish` compiles the TypeScript files into JavaScript.

4\. Make `machinomy` package use custom `contracts`.

```shell
cd packages/machinomy
yarn link @machinomy/contracts
```

5\. Make `machinomy` available as a local dependency.

```shell
yarn link && yarn prepublish
```

6\. Use the package in your project as a dependency.

```
$ cd your-awesome-project/
$ yarn add machinomy && yarn link machinomy
```

7\. Ready!

Now point Machinomy to the local provider running at `http://localhost:8545` and you'll be sending micropayments in no time!

# Propagating Contract Changes

If you modify `contracts`, you need to rebuild it in order for `your-awesome-project` to reflect the changes:

```shell
cd packages/contracts
yarn prepublish
```
