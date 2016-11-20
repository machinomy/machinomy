"use strict";

var machinomy = require("../index"),
    fs = require("fs"),
    prompt = require("prompt");

var setup = function (command) {
    var namespace = command.namespace || "sender";

    var baseDirPath = machinomy.configuration.baseDirPath();
    if (!fs.existsSync(baseDirPath)) {
        fs.mkdir(baseDirPath);
    }

    var configuration;
    try {
        configuration = machinomy.configuration.configurationOptions();
    } catch (ex) {
        configuration = {};
    }

    console.log(configuration);

    prompt.start();
    console.log("Please, for a command line client insert you Ethereum account address, and optionally a password");
    prompt.get(["account", "password"], function (err, result) {
        configuration[namespace] = result;
        console.log("Full configuration:");
        console.log(configuration);
        var configurationString = JSON.stringify(configuration, null, 4);
        fs.writeFileSync(machinomy.configuration.configFilePath(), configurationString);
    });

    //console.log("You can override the specified parameters by providing env variables...")
};

module.exports = setup;
