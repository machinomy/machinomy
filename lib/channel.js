"use strict";

var Web3 = require('web3');
var request = require('request');
var log = require("./log");

var web3 = new Web3();
web3.setProvider(new Web3.providers.HttpProvider('http://localhost:8545'));

var CONTRACT_ADDRESS = "0xDA8b3276CdE6D768A44B9daC659faa339A41ac55";
var CONTRACT_INTERFACE = [ { "constant": true, "inputs": [ { "name": "channelId", "type": "bytes32" } ], "name": "getState", "outputs": [ { "name": "", "type": "uint8", "value": "0" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "channelId", "type": "bytes32" }, { "name": "payment", "type": "uint256" }, { "name": "v", "type": "uint8" }, { "name": "r", "type": "bytes32" }, { "name": "s", "type": "bytes32" } ], "name": "claim", "outputs": [], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "channelId", "type": "bytes32" }, { "name": "value", "type": "uint256" } ], "name": "getHash", "outputs": [ { "name": "", "type": "bytes32", "value": "0xad3228b676f7d3cd4284a5443f17f1962b36e491b30a40b2405849e597ba5fb5" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "channelId", "type": "bytes32" } ], "name": "close", "outputs": [], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "sender", "type": "address" }, { "name": "channelId", "type": "bytes32" } ], "name": "canFinishSettle", "outputs": [ { "name": "", "type": "bool", "value": false } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [], "name": "kill", "outputs": [], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "receiver", "type": "address" }, { "name": "duration", "type": "uint256" }, { "name": "settlementPeriod", "type": "uint256" } ], "name": "createChannel", "outputs": [], "payable": true, "type": "function" }, { "constant": true, "inputs": [ { "name": "sender", "type": "address" }, { "name": "channelId", "type": "bytes32" } ], "name": "canStartSettle", "outputs": [ { "name": "", "type": "bool", "value": true } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "channelId", "type": "bytes32" } ], "name": "finishSettle", "outputs": [], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "channelId", "type": "bytes32" }, { "name": "payment", "type": "uint256" } ], "name": "settle", "outputs": [], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "channelId", "type": "bytes32" }, { "name": "payment", "type": "uint256" } ], "name": "startSettle", "outputs": [], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "channelId", "type": "bytes32" } ], "name": "deposit", "outputs": [], "payable": true, "type": "function" }, { "constant": true, "inputs": [ { "name": "channelId", "type": "bytes32" }, { "name": "payment", "type": "uint256" }, { "name": "v", "type": "uint8" }, { "name": "r", "type": "bytes32" }, { "name": "s", "type": "bytes32" } ], "name": "canClaim", "outputs": [ { "name": "", "type": "bool", "value": false } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "channelId", "type": "bytes32" } ], "name": "isOpenChannel", "outputs": [ { "name": "", "type": "bool", "value": false } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "sender", "type": "address" }, { "name": "channelId", "type": "bytes32" } ], "name": "canDeposit", "outputs": [ { "name": "", "type": "bool", "value": true } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "channelId", "type": "bytes32" } ], "name": "getPayment", "outputs": [ { "name": "", "type": "uint256", "value": "0" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "channelId", "type": "bytes32" } ], "name": "getUntil", "outputs": [ { "name": "", "type": "uint256", "value": "0" } ], "payable": false, "type": "function" }, { "inputs": [], "type": "constructor" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "sender", "type": "address" }, { "indexed": true, "name": "receiver", "type": "address" }, { "indexed": false, "name": "channelId", "type": "bytes32" } ], "name": "DidCreateChannel", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channelId", "type": "bytes32" }, { "indexed": false, "name": "value", "type": "uint256" } ], "name": "DidDeposit", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channelId", "type": "bytes32" }, { "indexed": false, "name": "payment", "type": "uint256" } ], "name": "DidStartSettle", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channelId", "type": "bytes32" }, { "indexed": false, "name": "payment", "type": "uint256" }, { "indexed": false, "name": "oddValue", "type": "uint256" } ], "name": "DidSettle", "type": "event" } ];

/**
 * Wrapper for the payment channel contract.
 *
 * @param {string} address - Address of the deployed contract.
 * @param {Object[]} abi - Interface of the deployed contract.
 * @constructor
 */
var ChannelContract = function (address, abi) {
    this.contract = web3.eth.contract(abi).at(address);
};

ChannelContract.prototype.getHash = function (channelId, value) {
  return this.contract.getHash(channelId, value);
};

var CONTRACT = new ChannelContract(CONTRACT_ADDRESS, CONTRACT_INTERFACE);

/**
 * Cost of creating a channel.
 * @type {number}
 */
ChannelContract.CREATE_CHANNEL_GAS = 300000;

var DAY_IN_SECONDS = 86400;

/**
 * FIXME Settlement period for the contract.
 * @type {number}
 */
ChannelContract.SETTLEMENT_PERIOD = 2 * DAY_IN_SECONDS;

/**
 * @type {number}
 */
ChannelContract.DURATION = 2 * DAY_IN_SECONDS;

/**
 * Initiate payment channel between `sender` and `receiver`, with initial amount set to `value`.
 * @param sender
 * @param receiver
 * @param value
 * @param callback
 */
ChannelContract.prototype.buildPaymentChannel = function (sender, receiver, value, callback) {
    var self = this;
    log.verbose("Building payment channel from " + sender + " to " + receiver + ", initial amount set to " + value);
    var settlementPeriod = ChannelContract.SETTLEMENT_PERIOD;
    var duration = ChannelContract.DURATION;
    var options = {
        from: sender,
        value: value,
        gas: ChannelContract.CREATE_CHANNEL_GAS
    };
    this.contract.createChannel(receiver, duration, settlementPeriod, options);
    var didCreateChannelEvent = this.contract.DidCreateChannel({sender: sender, receiver: receiver});
    log.info("Waiting for the channel to be created on the blockchain: watching for DidCreateChannel event");
    didCreateChannelEvent.watch(function (error, result) {
        var channelId = result.args.channelId;
        log.verbose("The channel " + channelId + " is created");
        var paymentChannel = new PaymentChannel(sender, receiver, channelId, self, value, 0);
        didCreateChannelEvent.stopWatching();
        log.verbose("No longer watching for DidCreateChannel event");
        callback(error, paymentChannel);
    });
};

ChannelContract.prototype.claim = function (receiver, channelId, value, v, r, s, callback) {
    this.contract.claim(channelId, value, parseInt(v), r, s, {from: receiver});
    var didSetle = this.contract.DidSettle({channelId: channelId});
    didSetle.watch(function (error, result) {
        didSetle.stopWatching();
        if (error) {
            callback(error, null);
        } else {
            log.info("Claimed " + result.args.payment + " from " + result.args.channelId);
            callback(null, result.args.payment);
        }
    });
};

/**
 * @param {String} account
 * @param {String} channelId
 * @returns Boolean
 */
ChannelContract.prototype.canStartSettle = function (account, channelId) {
    return this.contract.canStartSettle(account, channelId);
};

/**
 * @param {String} channelId
 * @param {Number} payment
 * @param {Number} v
 * @param {String} r
 * @param {String} s
 */
ChannelContract.prototype.canClaim = function (channelId, payment, v, r, s) {
    return this.contract.canClaim(channelId, payment, v, r, s);
};

/**
 * @param {String} sender
 * @param {String} channelId
 */
ChannelContract.prototype.canFinishSettle = function (sender, channelId) {
    return this.contract.canFinishSettle(sender, channelId);
};

ChannelContract.prototype.getState = function (channelId) {
    return Number(this.contract.getState(channelId));
};

ChannelContract.prototype.getUntil = function (channelId) {
    return this.contract.getUntil(channelId);
};

ChannelContract.prototype.startSettle = function (account, channelId, payment, callback) {
    var self = this;
    self.contract.startSettle(channelId, payment, {from: account});
    log.verbose("Triggered Start Settle on the contract for channel " + channelId + " from " + account);
    var didStartSettleEvent = self.contract.DidStartSettle({channelId: channelId, payment: payment});
    didStartSettleEvent.watch(function (error) {
        log.verbose("Received DidStartSettle event for channel " + channelId);
        didStartSettleEvent.stopWatching();
        callback(error);
    });
};

ChannelContract.prototype.finishSettle = function (account, channelId) {
    var self = this;
    self.contract.finishSettle(channelId, {from: account});
    log.verbose("Triggered Finish Settle on the contract");
    var didSettle = this.contract.DidSettle({channelId: channelId});
    didSettle.watch(function (error, result) {
        didSettle.stopWatching();
        log.verbose("Received DidSettle event for channel " + channelId);
        if (error) {
            callback(error, null);
        } else {
            callback(null, result.args.payment);
        }
    });
};

/**
 * The Payment Channel
 * @param {String} sender - Ethereum address of the client.
 * @param {String} receiver - Ethereum address of the server.
 * @param {String} channelId - Identifier of the channel.
 * @param {ChannelContract} contract - Payment channel contract.
 * @param {Number} value - Total value of the channel.
 * @param {Number} spent - Value sent by {sender} to {receiver}.
 * @param {String} state - "open", "settling", "settled"
 * @constructor
 */
var PaymentChannel = function (sender, receiver, channelId, contract, value, spent, state) { // FIXME remove contract parameter
    this.sender = sender;
    this.receiver = receiver;
    this.channelId = channelId;
    this.value = value;
    this.spent = spent;
    this.state = state || 0;
};

/**
 * Sign value transfer.
 * @param {number} value - Transferred value.
 * @returns {{r: string, s: string, v: string}}
 */
PaymentChannel.prototype.sign = function (value) {
    var hash = CONTRACT.getHash(this.channelId, value);
    var signature = web3.eth.sign(this.sender, hash);
    signature = signature.substr(2, signature.length);

    return {
        r: "0x" + signature.substr(0, 64),
        s: "0x" + signature.substr(64, 64),
        v: web3.toHex(web3.toDecimal(signature.substr(128, 2)) + 27)
    }
};

/**
 *
 * @param {Payment} payment
 * @returns {PaymentChannel}
 */
PaymentChannel.fromPayment = function (payment) {
    return new PaymentChannel(payment.sender, payment.receiver, payment.channelId, null, payment.channelValue, payment.value);
};

/**
 * @param {Object} options
 * @constructor
 */
var Payment = function (options) {
    this.channelId = options.channelId;
    this.sender = options.sender;
    this.receiver = options.receiver;
    this.price = options.price;
    this.value = options.value;
    this.channelValue = options.channelValue;
    this.v = Number(options.v);
    this.r = options.r;
    this.s = options.s;
};

/**
 * Build {Payment} based on PaymentChannel and monetary value to send.
 *
 * @param {PaymentChannel} paymentChannel
 * @param {number} price
 * @returns {Payment}
 */
Payment.fromPaymentChannel = function (paymentChannel, price) {
    var value = price + paymentChannel.spent; // TICK
    var signature = paymentChannel.sign(value);
    var options = {
        channelId: paymentChannel.channelId,
        sender: paymentChannel.sender,
        receiver: paymentChannel.receiver,
        price: price,
        value: value,
        channelValue: paymentChannel.value,
        v: signature.v,
        r: signature.r,
        s: signature.s
    };
    return new Payment(options);
};

module.exports = {
    web3: web3,
    contract: CONTRACT,
    Payment: Payment,
    PaymentChannel: PaymentChannel
};
