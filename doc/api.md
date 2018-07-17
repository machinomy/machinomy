# Machinomy API

Machinomy is a library for ETH and ERC20 micropayments. The library could be freely embedded into your software both in browser and server environments.

The library implements unidirectional payment channel pattern. It works like a bar tab. A sender opens a channel and deposits the funds there. Over time she sends promised payments to a receiver. A promised payment is a signed data structure that the receiver could redeem at the smart contract.

## Initialization

Work with Machinomy starts with constructor.

```typescript
import Machinomy from 'machinomy'
const machinomy = new Machinomy(account, web3, options)
```

Arguments:

| Argument   | Type               | Description                                                  |
| ---------- | ------------------ | ------------------------------------------------------------ |
| `account`  | `string`           | Ethereum address for the acting party, that will send or receive the funds. |
| `web3`     | `Web3`             | Instance of [web3](https://github.com/ethereum/web3.js) object, note _0.20.x is supported only_. |
| `options?` | `MachinomyOptions` | Optional arguments.                                          |

`MachinomyOptions` is a hash with the following fields:

| Field                     | Type                 | Description                                                  |
| ------------------------- | -------------------- | ------------------------------------------------------------ |
| `databaseUrl`             | `string`             | URL to connect to database. For example, `postgresql://localhost:5432/database`. Supported database protocols are `nedb`, `sqlite`, `postgresql`. |
| `minimumChannelAmount`    | `number | BigNumber` | Minumum amount of funds to be initially deposited to a channel, in [Wei](https://gwei.io). |
| `minimumSettlementPeriod` | `number`             | If settlement period for a proposed channel is less than `minimumSettlementPeriod`, that channel is refused. |
| `settlementPeriod`        | `number`             | Period of dispute resolution, in blocks.                     |
| `closeOnInvalidPayment`   | `boolean`            | If set to `true`, a receiver reacts on invalid payment with closing a corresponding channel. |
| `migrate`                 | `silent | raise`     | The library stores some data in a database, and uses migrations for updates to schema and/or data. If set to `raise`, the library throws an exception when migration is required. `silent` runs the migration automatically. Default is `silent`. |

## Send Payments

The functions related to payments operate on ancillary interfaces for parameters and outputs.

`BuyOptions`:

```typescript
import { BuyOptions } from 'machinomy'
```

| Field      | Type                 | Description                                       |
| ---------- | -------------------- | ------------------------------------------------- |
| `receiver` | `string`             | Ethereum address of the receiver.                 |
| `price`    | `number | BigNumber` | Payment value, in [Wei](https://gwei.io).         |
| `gateway`  | `string`             | Endpoint for offchain payment to send.            |
| `meta`     | `string`             | Optional free-form data to accompany the payment. |

`Payment`:

```typescript
import { Payment } from 'machinomy'
```

| Field             | Type        | Description                                                  |
| ----------------- | ----------- | ------------------------------------------------------------ |
| `channelId`       | `string`    | Identifier of the channel, as hex string.                    |
| `sender`          | `string`    | Ethereum address of the sender, as hex string.               |
| `receiver`        | `string`    | Ethereum address of the receiver, as hex string.             |
| `price`           | `BigNumber` | Amount of the payment.                                       |
| `value`           | `BigNumber` | Total amount to be paid. Remember, single payment in Unidirectional channel represents the total redeemable amount. |
| `signature`       | `Signature` | Signature of the payment by the sender.                      |
| `meta`            | `string`    | Optional free-form data to accompany the payment.            |
| `tokenContract`   | `string`    | Token contract address.                                      |
| `createdAt`       | `number`    | When the payment was created, as unix timestamp.             |
| `token`           | `string`    | Unique identifier of the payment.                            |

`BuyResult`:

```typescript
import { BuyResult } from 'machinomy'
```

| Field       | Type     | Description                               |
| ----------- | -------- | ----------------------------------------- |
| `channelId` | `string` | Identifier of the channel, as hex string. |
| `token`     | `string` | Token to be vaidated against a gateway.   |

`NextPaymentResult`:

```typescript
import { NextPaymentResult } from 'machinomy'
```

| Field     | Type     | Description         |
| --------- | -------- | ------------------- |
| `payment` | `object` | Serialised Payment. |

### Raw Payment

```typescript
machinomy.payment (options: BuyOptions): Promise<NextPaymentResult>
```

Returns the payment to be sent over the wire. Stores the payment in a local database.

### Buy

```typescript
machinomy.buy (options: BuyOptions): Promise<BuyResult>
```

[Prepares](#raw-payment) a payment, and sends it to a gateway. Gateway then responds back with a token. It is up to a user to send the token to the content server, or receiver. The receiver then calls the gateway to verify if the token is valid or not. The scenario is revealed fully in [client example](https://github.com/machinomy/machinomy/blob/master/packages/examples/src/client.ts).

### Find channel by id

```typescript
machinomy.paymentById (token): Promise<Payment | null>
```

Returns a `Payment` with the specified `token` identifier.

## Receive Payments

### Accept Payment

```typescript
machinomy.acceptPayment (req): Promise<AcceptPaymentResponse>
```

Accept serialised payment, and issue a token.

`req` structure:

| Field          | Type                       | Description                                          |
| -------------- | -------------------------- | ---------------------------------------------------- |
| `payment`      | JSON-serialised `Payment`  | Payment that is sent over the wire.                  |
| `purchaseMeta` | `object & {type: string} ` | JSON-serialised object that accompanies the payment. |

Structure of `AcceptPaymentResponse`:

| Field   | Type     | Description                                                  |
| ------- | -------- | ------------------------------------------------------------ |
| `token` | `string` | Unique identifier of the payment, that can be checked against the Gateway. |

### Accept Token

```typescript
machinomy.acceptToken (req): Promise<AcceptTokenResponse>
```

Accept and verify the token that was issued in response to payment being sent.

Structure of `req` argument:

| Field   | Type     | Description                                                  |
| ------- | -------- | ------------------------------------------------------------ |
| `token` | `string` | Unique identifier of the payment, that can be checked against the Gateway. |

Structure of `AcceptTokenResponse`:

| Field    | Type      | Description                                                  |
| -------- | --------- | ------------------------------------------------------------ |
| `status` | `boolean` | `true` means the token is ok, `false` is for invalid token, i.e. for invalid payment. |

## Channels

Here come functions related to channels. Basic `PaymentChannel` structure is described below:

| Field             | Type        | Description                                                  |
| ----------------- | ----------- | ------------------------------------------------------------ |
| `sender`          | `string`    | Ethereum address of the channel sender party.                |
| `receiver`        | `string`    | Ethereum address of the channel receiver party.              |
| `channelId`       | `string`    | Identifier of the channel, as hex string.                    |
| `value`           | `BigNumber` | Amount of funds deposited to the channel by the sender.      |
| `spent`           | `BigNumber` | Amount of funds spent on the channel, that is redeemable by the receiver. |
| `state`           | `number`    | State of the channel: `0` - open, `1` - settling, `2` - closed or non-existing. |
| `tokenContract`   | `string`    | Token contract address.                                      |

### Open

Opens a channel. It is a lower level function. One probably would not ever need to invoke the function. `buy` or `payment` both open a channel for you, if it is not present yet.

```typescript
machinomy.open (receiver, value, channelId?, tokenContract?): Promise<PaymentChannel>
```

Parameters:

| Argument         | Type                 | Description                               |
| ------------     | -------------------- | ----------------------------------------- |
| `receiver`       | `string`             | Ethereum address of the channel receiver. |
| `value`          | `BigNumber | number` | Amount of initial deposit to the channel. |
| `channelId?`     | `string`             | Proposed identifier of the channel.       |
| `tokenContract?` | `string`             | Token contract address.                   |

### Deposit

Deposit more funds to the channel. One might use it after the channel is depleted, that is the funds are fully moved to the receiver side. It returns result of transaction execution, as returned by usual Truffle calls.

```typescript
machinomy.deposit (channelId, value): Promise<TransactionResult>
```

Parameters:

| Argument    | Type                 | Description                |
| ----------- | -------------------- | -------------------------- |
| `channelId` | `string`             | Identifier of the channel. |
| `value`     | `BigNumber | number` | Deposit amount, in wei.    |

### Close

Share the money between sender and reciver according to payments made.

For example a channel was opened with 10 Ether. Sender makes 6 purchases, 1 Ether each. Total value transferred is 6 Ether. If a party closes the channel, the money deposited to the channel are split. The receiver gets 6 Ether. 4 unspent Ethers return to the sender.

A channel can be closed in two ways, according to what party initiates that. The method nicely abstracts over that, so you do not need to know what is really going on under the hood. For more details on how payment channels work refer to a [website](https://machinomy.com).

```typescript
machinomy.close(channelId): Promise<TransactionResult>
```

Parameters:

| Argument    | Type     | Description                         |
| ----------- | -------- | ----------------------------------- |
| `channelId` | `string` | Identifier of the channel to close. |

### List all channels

```typescript
machinomy.channels(): Promise<Array<PaymentChannel>>
```

### List open channels

```typescript
machinomy.openChannels(): Promise<Array<PaymentChannel>>
```

### List settling channels

```typescript
machinomy.settlingChannels(): Promise<Array<PaymentChannel>>
```

### Find channel by id

```
machinomy.channelById(channelId): Promise<Array<PaymentChannel>>
```

Parameters:

| Argument    | Type     | Description                         |
| ----------- | -------- | ----------------------------------- |
| `channelId` | `string` | Identifier of the channel to close. |

## Teardown

As Machinomy uses a database inside, it might be necessary to tear down a connection to the database. We recommend invoking `machinomy.shutdown()` after work is done.

Interface: 

```typescript
machinomy.shutdown(): Promise<void>
```
