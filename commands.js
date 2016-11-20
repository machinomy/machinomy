"use strict";

var commander = require("commander"),
    machinomy = require("./index"),
    buy = require("./commands/buy"),
    pry = require("./commands/pry"),
    channels = require("./commands/channels"),
    close = require("./commands/close"),
    configuration = require("./commands/configuration"),
    setup = require("./commands/setup");

var main = function (args) {
    var version = machinomy.NAME + " v" + machinomy.VERSION;
    var parser = commander
        .version(version)
        .option("-P, --password [password]", "password to unlock the account");

    parser.command("buy <uri>")
        .description("buy a resource at <uri>")
        .action(machinomy.configuration.ensure(buy));

    parser.command("pry <uri>")
        .description("see cost of a resource at <uri>")
        .action(pry);

    parser.command("channels")
        .option("-n, --namespace [value]", "find channels under namespace [sender]")
        .description("show open/closed channels")
        .action(channels);

    parser.command("close <channelId>")
        .option("-n, --namespace [value]", "find channels under namespace [sender]")
        .description("close the channel")
        .action(close);

    parser.command("configuration")
        .alias("config")
        .option("-n, --namespace [value]", "use snamespace [sender]")
        .description("display configuration")
        .action(configuration);

    parser.command("setup")
        .description("initial setup")
        .option("-n, --namespace [value]", "use namespace [sender]")
        .action(setup);

    parser.parse(args);
};

module.exports = {
    main: main
};
