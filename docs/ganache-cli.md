# Running with Ganache CLI (formerly TestRPC)

[Ganache CLI](https://github.com/trufflesuite/ganache-cli), formerly called TestRPC, provides a fast and easy way to develop and test an Ethereum Dapp. It provides
all the features of a full-blown Ethereum network, while delivering unprecedented
speed of transactions.

## Prerequisites

1. Install [Ganache CLI](https://github.com/trufflesuite/ganache-cli)
2. Clone [`machinomy`](https://github.com/machinomy/machinomy) and [`machinomy-contracts`](https://github.com/machinomy/machinomy-contracts) repositories from GitHub

## Running Ganache CLI and Loading Contracts

1\. Start Ganache CLI.

```
$ ganache-cli --networkId 1024
```

Please, set network id to something less then 2 millions. The contract assumes network id to be of `uint32` type.
By default, Ganache CLI sets the network id to some very big number that does not fit the type.

2\. Deploy machinomy-contracts onto the Ganache CLI Ethereum network.

```shell
cd machinomy-contracts/
yarn
yarn truffle:migrate
```

3\. Make `machinomy-contracts` package available as a local dependency.

```shell
yarn link && yarn build
```

`yarn build` compiles the TypeScript files into JavaScript.

4\. Make `machinomy` package use custom `machinomy-contracts`.

```shell
cd machinomy/
yarn link @machinomy/contracts
```

5\. Make `machinomy` available as a local dependency.

```shell
yarn link && yarn build
```

6\. Use the package in your project as a dependency.

```
$ cd your-awesome-project/
$ yarn add machinomy && yarn link machinomy
```

7\. Ready!

Now point Machinomy to the local provider running at `http://localhost:8545` and you'll be sending micropayments in no time!

# Propagating Contract Changes

If you modify `machinomy-contract`, you need to rebuild it in order for `your-awesome-project` to reflect the changes:

```shell
cd machinomy-contract/ && yarn build
```
