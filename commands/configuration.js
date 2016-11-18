"use strict";

var machinomy = require("../index");

var configuration = function (options) {
    var namespace = options.namespace || "sender";
    var configuration = machinomy.configuration[namespace].call();

    console.log(configuration);
};

module.exports = configuration;
