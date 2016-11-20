"use strict";

var machinomy = require("../index"),
    fs = require("fs");

var setup = function () {
    var baseDirPath = machinomy.configuration.baseDirPath();
    if (!fs.existsSync(baseDirPath)) {
        fs.mkdir(baseDirPath);
    }
};

module.exports = setup;
