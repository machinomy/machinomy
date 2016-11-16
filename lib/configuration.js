"use strict";

var path = require("path"),
    homedir = require("homedir"),
    fs = require("fs");

var BASE_DIR = ".machinomy";
var COFNGIRATION_FILE = "config.json";
var DATABASE_FILE = "storage.db";

var Configuration =  function (options) {
    this.account = options.account;
    this.password = options.password;
    this.databaseFile = path.resolve(path.join(homedir(), BASE_DIR, DATABASE_FILE));
};

/**
 * @returns {object}
 */
var configurationOptions = function () {
    var configurationFile = path.join(homedir(), BASE_DIR, COFNGIRATION_FILE);
    return JSON.parse(fs.readFileSync(configurationFile, 'utf8'));
};

/**
 * @returns {Configuration}
 */
var sender = function () {
    var options = configurationOptions();
    return new Configuration({
        account: process.env.MACHINOMY_SENDER_ACCOUNT || options['sender']['account'],
        password: process.env.MACHINOMY_SENDER_PASSWORD || options['sender']['password']
    });
};

/**
 * @returns {Configuration}
 */
var receiver = function () {
    var options = configurationOptions();
    return new Configuration({
        account: process.env.MACHINOMY_RECEIVER_ACCOUNT || options['receiver']['account'],
        password: process.env.MACHINOMY_RECEIVER_PASSWORD || options['receiver']['password']
    })
};

module.exports = {
    sender: sender,
    receiver: receiver
};
