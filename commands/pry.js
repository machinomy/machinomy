"use strict";

var machinomy = require("../index"),
    web3 = machinomy.web3;

var pry = function (uri) {
    var settings = machinomy.configuration.sender();
    var transport = new machinomy.Transport();
    var storage = new machinomy.Storage(settings.databaseFile, "sender");
    var client = new machinomy.Client(settings.account, machinomy.contract, transport, storage);
    client.pry(uri, function (error, paymentRequired) {
       if (error) {
           console.log(error);
       } else {
           console.log(paymentRequired);
       }
    });
};

module.exports = pry;
