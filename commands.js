"use strict";

var commander = require("commander"),
    machinomy = require("./index"),
    buy = require("./commands/buy"),
    pry = require("./commands/pry"),
    channels = require("./commands/channels"),
    close = require("./commands/close");

var main = function (args) {
    var version = machinomy.NAME + " v" + machinomy.VERSION;
    var parser = commander.version(version);

    parser.command("buy <uri>")
        .description("buy a resource at <uri>")
        .action(buy);

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

    parser.parse(args);
};

module.exports = {
    main: main
};
