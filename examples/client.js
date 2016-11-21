"use strict";

var machinomy = require("../index");

var uri = process.argv.pop();

var settings = machinomy.configuration.sender();
machinomy.buy(uri, settings.account, settings.password, function (err, contents) {
    if (err) throw err;
    console.log(contents);
});
