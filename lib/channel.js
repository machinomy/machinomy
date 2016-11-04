"use strict";

var Web3 = require('web3');
var request = require('request');

var web3 = new Web3();
web3.setProvider(new Web3.providers.HttpProvider('http://localhost:8545'));

var CONTRACT_ADDRESS = "0x102446BA0cf50767f4E6b800d85F7B6F1E5Fbf1b";
var CONTRACT_INTERFACE = [ { "constant": false, "inputs": [ { "name": "channelId", "type": "bytes32" }, { "name": "value", "type": "uint256" }, { "name": "v", "type": "uint8" }, { "name": "r", "type": "bytes32" }, { "name": "s", "type": "bytes32" } ], "name": "claim", "outputs": [], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "channelId", "type": "bytes32" }, { "name": "value", "type": "uint256" } ], "name": "getHash", "outputs": [ { "name": "", "type": "bytes32", "value": "0xad3228b676f7d3cd4284a5443f17f1962b36e491b30a40b2405849e597ba5fb5" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "channelId", "type": "bytes32" }, { "name": "value", "type": "uint256" }, { "name": "v", "type": "uint8" }, { "name": "r", "type": "bytes32" }, { "name": "s", "type": "bytes32" } ], "name": "verify", "outputs": [ { "name": "", "type": "bool", "value": false } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "channelId", "type": "bytes32" } ], "name": "close", "outputs": [ { "name": "", "type": "bool" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [], "name": "kill", "outputs": [], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "receiver", "type": "address" } ], "name": "createChannel", "outputs": [], "payable": true, "type": "function" }, { "constant": false, "inputs": [ { "name": "channelId", "type": "bytes32" } ], "name": "deposit", "outputs": [], "payable": true, "type": "function" }, { "constant": true, "inputs": [ { "name": "channelId", "type": "bytes32" } ], "name": "isOpenChannel", "outputs": [ { "name": "", "type": "bool", "value": false } ], "payable": false, "type": "function" }, { "inputs": [], "type": "constructor" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "sender", "type": "address" }, { "indexed": true, "name": "receiver", "type": "address" }, { "indexed": false, "name": "channelId", "type": "bytes32" } ], "name": "DidCreateChannel", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channelId", "type": "address" }, { "indexed": false, "name": "value", "type": "uint256" } ], "name": "DidDeposit", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channelId", "type": "bytes32" }, { "indexed": false, "name": "value", "type": "uint256" } ], "name": "DidClaim", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channelId", "type": "address" } ], "name": "DidClose", "type": "event" } ];

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

/**
 * Cost of creating a channel.
 * @type {number}
 */
ChannelContract.CREATE_CHANNEL_GAS = 300000;

/**
 * FIXME Settlement period for the contract.
 * @type {number}
 */
ChannelContract.SETTLEMENT_PERIOD = 10;

/**
 * Initiate payment channel between `sender` and `receiver`, with initial amount set to `value`.
 * @param sender
 * @param receiver
 * @param value
 * @param callback
 */
ChannelContract.prototype.buildPaymentChannel = function (sender, receiver, value, callback) {
    var self = this;
    console.log("Building payment channel");
    console.log("from " + sender + " to " + receiver + ", initial amount set to " + value);
    var settlementPeriod = ChannelContract.SETTLEMENT_PERIOD;
    var options = {
        from: sender,
        value: value,
        gas: ChannelContract.CREATE_CHANNEL_GAS
    };
    this.contract.createChannel(receiver, settlementPeriod, options);
    var didCreateChannelEvent = this.contract.DidCreateChannel({owner: sender});
    console.log("Waiting for the channel to be created on the blockchain: watching for DidCreateChannel event");
    didCreateChannelEvent.watch(function (error, result) {
        var channelId = result.args.channelId;
        console.log("The channel " + channelId + " is created");
        var paymentChannel = new PaymentChannel(sender, receiver, channelId, self);
        didCreateChannelEvent.stopWatching();
        console.log("No longer watching for DidCreateChannel event");
        callback(error, paymentChannel);
    });
};

/**
 * The Payment Channel
 * @param {string} sender - Ethereum address of the client.
 * @param {string} receiver - Ethereum address of the server.
 * @param {string} channelId - Identifier of the channel.
 * @param {ChannelContract} contract - Payment channel contract.
 * @constructor
 */
var PaymentChannel = function (sender, receiver, channelId, contract) {
    this.sender = sender;
    this.receiver = receiver;
    this.contract = contract;
    this.channelId = channelId;
};

/**
 * Sign value transfer.
 * @param {number} value - Transferred value.
 * @returns {{r: string, s: string, v: string}}
 */
PaymentChannel.prototype.sign = function (value) {
    var hash = this.contract.getHash(this.channelId, value);
    var signature = web3.eth.sign(this.sender, hash);
    signature = signature.substr(2, signature.length);

    return {
        r: "0x" + signature.substr(0, 64),
        s: "0x" + signature.substr(64, 64),
        v: web3.toHex(web3.toDecimal(signature.substr(128, 2)) + 27)
    }
};

/**
 * @param {Object} options
 * @constructor
 */
var Payment = function (options) {
    this.channelId = options.channelId;
    this.sender = options.sender;
    this.receiver = options.receiver;
    this.value = options.value;
    this.v = options.v;
    this.r = options.r;
    this.s = options.s;
};

Payment.prototype.signature = function () {
    return {
        v: this.v,
        r: this.r,
        s: this.s
    }
};

/**
 * Build {Payment} based on PaymentChannel and monetary value to send.
 *
 * @param {PaymentChannel} paymentChannel
 * @param {number} value
 * @returns {Payment}
 */
Payment.fromPaymentChannel = function (paymentChannel, value) {
    var signature = paymentChannel.sign(value);
    var options = {
        channelId: paymentChannel.channelId,
        sender: paymentChannel.sender,
        receiver: paymentChannel.receiver,
        value: value,
        v: signature.v,
        r: signature.r,
        s: signature.s
    };
    return new Payment(options);
};

module.exports = {
    web3: web3,
    contract: new ChannelContract(CONTRACT_ADDRESS, CONTRACT_INTERFACE),
    Payment: Payment
};
