"use strict";

var path = require("path"),
    homedir = require("homedir"),
    fs = require("fs");

var VERSION = "0.0.3";
var PROTOCOL = "machinomy/" + VERSION;
var PAYWALL_PATH = "paywall" + PROTOCOL;
var BASE_DIR = ".machinomy";
var COFNGIRATION_FILE = "config.json";
var DATABASE_FILE = "storage.db";

var CONTRACTS = {
    ropsten: "0xDA8b3276CdE6D768A44B9daC659faa339A41ac55",
    homestead: null
};

var CONTRACT_INTERFACE = [ { "constant": true, "inputs": [ { "name": "channelId", "type": "bytes32" } ], "name": "getState", "outputs": [ { "name": "", "type": "uint8", "value": "0" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "channelId", "type": "bytes32" }, { "name": "payment", "type": "uint256" }, { "name": "v", "type": "uint8" }, { "name": "r", "type": "bytes32" }, { "name": "s", "type": "bytes32" } ], "name": "claim", "outputs": [], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "channelId", "type": "bytes32" }, { "name": "value", "type": "uint256" } ], "name": "getHash", "outputs": [ { "name": "", "type": "bytes32", "value": "0xad3228b676f7d3cd4284a5443f17f1962b36e491b30a40b2405849e597ba5fb5" } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "channelId", "type": "bytes32" } ], "name": "close", "outputs": [], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "sender", "type": "address" }, { "name": "channelId", "type": "bytes32" } ], "name": "canFinishSettle", "outputs": [ { "name": "", "type": "bool", "value": false } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [], "name": "kill", "outputs": [], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "receiver", "type": "address" }, { "name": "duration", "type": "uint256" }, { "name": "settlementPeriod", "type": "uint256" } ], "name": "createChannel", "outputs": [], "payable": true, "type": "function" }, { "constant": true, "inputs": [ { "name": "sender", "type": "address" }, { "name": "channelId", "type": "bytes32" } ], "name": "canStartSettle", "outputs": [ { "name": "", "type": "bool", "value": true } ], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "channelId", "type": "bytes32" } ], "name": "finishSettle", "outputs": [], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "channelId", "type": "bytes32" }, { "name": "payment", "type": "uint256" } ], "name": "settle", "outputs": [], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "channelId", "type": "bytes32" }, { "name": "payment", "type": "uint256" } ], "name": "startSettle", "outputs": [], "payable": false, "type": "function" }, { "constant": false, "inputs": [ { "name": "channelId", "type": "bytes32" } ], "name": "deposit", "outputs": [], "payable": true, "type": "function" }, { "constant": true, "inputs": [ { "name": "channelId", "type": "bytes32" }, { "name": "payment", "type": "uint256" }, { "name": "v", "type": "uint8" }, { "name": "r", "type": "bytes32" }, { "name": "s", "type": "bytes32" } ], "name": "canClaim", "outputs": [ { "name": "", "type": "bool", "value": false } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "channelId", "type": "bytes32" } ], "name": "isOpenChannel", "outputs": [ { "name": "", "type": "bool", "value": false } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "sender", "type": "address" }, { "name": "channelId", "type": "bytes32" } ], "name": "canDeposit", "outputs": [ { "name": "", "type": "bool", "value": true } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "channelId", "type": "bytes32" } ], "name": "getPayment", "outputs": [ { "name": "", "type": "uint256", "value": "0" } ], "payable": false, "type": "function" }, { "constant": true, "inputs": [ { "name": "channelId", "type": "bytes32" } ], "name": "getUntil", "outputs": [ { "name": "", "type": "uint256", "value": "0" } ], "payable": false, "type": "function" }, { "inputs": [], "type": "constructor" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "sender", "type": "address" }, { "indexed": true, "name": "receiver", "type": "address" }, { "indexed": false, "name": "channelId", "type": "bytes32" } ], "name": "DidCreateChannel", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channelId", "type": "bytes32" }, { "indexed": false, "name": "value", "type": "uint256" } ], "name": "DidDeposit", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channelId", "type": "bytes32" }, { "indexed": false, "name": "payment", "type": "uint256" } ], "name": "DidStartSettle", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channelId", "type": "bytes32" }, { "indexed": false, "name": "payment", "type": "uint256" }, { "indexed": false, "name": "oddValue", "type": "uint256" } ], "name": "DidSettle", "type": "event" } ];

var contractAddress = function () {
    var network = process.env.MACHINOMY_NETWORK || "homestead"; // FIXME Document this
    return CONTRACTS[network];
};

var contractInterface = function () {
    return CONTRACT_INTERFACE;
};

var baseDirPath = function () {
    return path.resolve(path.join(homedir(), BASE_DIR));
};

var configFilePath = function () {
    return path.join(baseDirPath(), COFNGIRATION_FILE);
};

var databaseFilePath = function () {
    return path.join(baseDirPath(), DATABASE_FILE);
};

var Configuration =  function (options) {
    this.account = options.account;
    this.password = options.password;
    this.databaseFile = databaseFilePath();
    this.path = configFilePath();
};

/**
 * @returns {object}
 */
var configurationOptions = function () {
    return JSON.parse(fs.readFileSync(configFilePath(), 'utf8'));
};

/**
 * @returns {Configuration}
 */
var sender = function () {
    try {
        var options = configurationOptions();
        return new Configuration({
            account: process.env.MACHINOMY_SENDER_ACCOUNT || options['sender']['account'],
            password: process.env.MACHINOMY_SENDER_PASSWORD || options['sender']['password']
        });
    } catch (ex) {
        return new Configuration({});
    }
};

/**
 * @returns {Configuration}
 */
var receiver = function () {
    try {
        var options = configurationOptions();
        return new Configuration({
            account: process.env.MACHINOMY_RECEIVER_ACCOUNT || options['receiver']['account'],
            password: process.env.MACHINOMY_RECEIVER_PASSWORD || options['receiver']['password']
        })
    } catch (ex) {
        return new Configuration({});
    }
};

var canReadConfig = function () {
    try {
        fs.accessSync(configFilePath(), fs.constants.R_OK);
        return true;
    } catch (ex) {
        return false;
    }
};

var canParseConfig = function () {
    try {
        configurationOptions();
        return true;
    } catch (ex) {
        return false;
    }
};

var canCreateDatabase = function () {
    try {
        fs.accessSync(baseDirPath(), fs.constants.R_OK | fs.constants.W_OK);
        return true;
    } catch (ex) {
        return false;
    }
};

var ensureBaseDirPresent = function () {
    if (!fs.existsSync(baseDirPath())) {
        fs.mkdir(baseDirPath());
    }
};

var ensure = function (command) {
    return function () {
        ensureBaseDirPresent();

        if (!canCreateDatabase()) {
            console.error("Can not create database file in " + baseDirPath() + ". Please, check if one can create a file there.");
        } else if (!canReadConfig()) {
            console.error("Can not read configuration file. Please, check if it exists, or run `machinomy setup` command for an initial configuration");
        } else if (!canParseConfig()) {
            console.error("Can not parse configuration file. Please, ")
        } else {
            command.apply(null, arguments);
        }
    }
};

module.exports = {
    VERSION: VERSION,
    PAYWALL_PATH: PAYWALL_PATH,
    contractAddress: contractAddress,
    contractInterface: contractInterface,
    sender: sender,
    receiver: receiver,
    ensure: ensure,
    baseDirPath: baseDirPath,
    configFilePath: configFilePath,
    configurationOptions: configurationOptions
};
