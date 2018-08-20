# Machinomy Examples

[Machinomy](https://github.com/machinomy/machinomy/tree/master/packages/machinomy) examples.

[`client.ts`](./src/client.ts) - Example of Machinomy client. It sends a payment and buys a content from server.

[`server.ts`](./src/server.ts) - Example of a server. Uses Machinomy to accept payments for content.

[`machinomy.ts`](./src/machinomy.ts) - Self-contained emulation of buying and selling a content.

[`sender.ts`](./src/sender.ts) - Sending payments through channels. Example of a sender.

[`receiver.ts`](./src/receiver.ts) - Sending payments through channels. Example of a receiver.
Usage:
``` 
  $ cd machinomy/packages/examples/
  $ DEBUG=* yarn sender && yarn receiverTokens
```

[`senderTokens.ts`](./src/senderTokens.ts) - Sending tokens through channels. Example of a sender.

[`receiverTokens.ts`](./src/receiverTokens.ts) - Sending tokens through channels. Example of a receiver.
Usage:
``` 
  $ cd machinomy/packages/examples/
  $ DEBUG=* yarn senderTokens && yarn receiverTokens
```

Web site: [machinomy.com](http://machinomy.com).
Twitter: [@machinomy](http://twitter.com/machinomy).
Support/Discussion: [Gitter](https://gitter.im/machinomy/machinomy).

:exclamation:
Please, pay attention, this package is the part of [Machinomy Lerna Monorepo](https://github.com/machinomy/machinomy) and it's intended to use with other monorepo's packages. 

:no_entry: You **should not** git clone this repository alone

:white_check_mark: You **should** git clone the main repository via
```
git clone https://github.com/machinomy/machinomy.git
or 
git clone git@github.com:machinomy/machinomy.git
```

**For documentation, usage and contributing please see [Machinomy Monorepo](https://github.com/machinomy/machinomy).**
