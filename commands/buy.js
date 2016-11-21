"use strict";

var machinomy = require("../index");

var buy = function (uri, command) {
    var settings = machinomy.configuration.sender();
    var password = command.parent.password || settings.password;
    machinomy.buy(uri, settings.account, password, function (err, contents) {
        if (err) throw err;
        console.log(contents);
    });
};

module.exports = buy;
