"use strict";

var path = require("path"),
    homedir = require("homedir"),
    fs = require("fs");

var BASE_DIR = ".machinomy";
var COFNGIRATION_FILE = "config.json";
var DATABASE_FILE = "storage.db";

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
    fs.mkdir(baseDirPath());
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
            command.apply(arguments);
        }
    }
};

module.exports = {
    sender: sender,
    receiver: receiver,
    ensure: ensure,
    baseDirPath: baseDirPath,
    configFilePath: configFilePath,
    configurationOptions: configurationOptions
};
