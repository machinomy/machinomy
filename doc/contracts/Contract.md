# How the contract is supposed to work

Broker contract manages uni-directional payment channels. A payment channel lifecycle is depicted below:

![Channel States](https://cdn.rawgit.com/machinomy/machinomy-contracts/683e17f1/doc/channel-states.svg)

**No Channel → Open:**

Initiator, that is a sender, deposits money to the contract, calls `createChannel` method of the contract.

**Open:**

While the channel is open, the sender and the receiver (the parties), are free to exchange with IOU notes. Validity of IOU note is checked in `canClaim` contract method.

**Open → Settled:**

Settlement process that is initiated by the receiver. It provides IOU note to `settle` method. That triggers distribution of the deposited money to the parties, according to presented IOU note.

**Open → Settling → Settled:**

Settlement process that is initiated by the sender. It is driven by an assumption of an unresponsive receiver. The sender starts the settlement process by calling `startSettle` method, provides the expected payout to the receiver. If the latter does not respond indeed, the sender could finish the process by calling `finishSettle`. There is no constraint the payout amount provided by the sender. It could be zero. To mitigate that,  `createChannel`  accepts `settlementPeriod` param that specifies how long the channel waits for the receiver responds. The receiver is free not to accept payment and provide service, if she finds that period inadequate.

**Settled → Closed:**

A _settled_ channel is not _closed_. It could probably have money attached to it. Also, closed channel no longer occupies space in the list of payment channels. 

Either sender, or receiver, or _contract owner_ is free to call `close` to finally close the channel. That involves moving remaining money to the sender, and removing  the channel from the list maintained by the contract.
