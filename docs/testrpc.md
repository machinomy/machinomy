Running against TestRPC
=======================

TestRPC provides a fast and easy way to develop and test an Ethereum Dapp. It provides
all the features of a full-blown Ethereum network, while delivering unprecedented
speed of transactions.

Usually one follows Truffle process FIXME Link. Machinomy is a _library_, not an app. To develop an application with
Machinomy micropayments one has to follow a different process, described below. For a starter, clone
[machinomy] and [machinomy-contracts] repositories from GitHub.

1\. Start TestRPC.

```
$ testrpc --networkId 1024
```

Please, set network id to something less then 2 millions. The contract assumes network id to be of `uint32` type.
By default, TestRPC sets network id to some very big number that does not fit the type.  

2\. Deploy machinomy-contracts onto TestRPC Ethereum network.

```
$ cd machinomy-contracts/
$ yarn truffle:migrate
```

3\. Make `machinomy-contracts` package available as a local dependency.

```
$ yarn link && yarn build
```

One have to invoke `yarn build` and compile TypeScript into JavaScript, as Node could not run the former directly. 

4\. Make `machinomy` package use custom `machinomy-contracts`.

```
$ cd machinomy/
$ yarn link @machinomy/contracts
```

5\. Make `machinomy` available as a local dependency. 

```
$ yarn link && yarn build
```

6\. Use the package in your project as a dependency.

```
$ cd awesome/
$ yarn add machinomy && yarn link machinomy
```

# Propagating Changes

To reflect any changes in a linked package you have to rebuild it.
For example, you changed something in `machinomy-contract`. To use that update in `awesome` package:
```
$ cd machinomy-contract/ && yarn build
```
Now `awesome` is aware of the changes.
