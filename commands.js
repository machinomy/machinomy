"use strict";

var commander = require("commander"),
    machinomy = require("./index"),
    buy = require("./commands/buy"),
    pry = require("./commands/pry");

var main = function (args) {
    var version = machinomy.NAME + " v" + machinomy.VERSION;
    var parser = commander.version(version);

    parser.command("buy <uri>")
        .description("buy a resource at <uri>")
        .action(buy);

    parser.command("pry <uri>")
        .description("see cost of a resource at <uri>")
        .action(pry);

    parser.parse(args);
};

module.exports = {
    main: main
};
