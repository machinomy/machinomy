"use strict";

var machinomy = require("../index"),
    web3 = machinomy.web3;

var buy = function (uri) {
    var configuration = machinomy.configuration.sender();

    web3.personal.unlockAccount(configuration.account, configuration.password, 1000);

    var transport = new machinomy.Transport();
    var storage = new machinomy.Storage('./db.client.db.0');
    var client = new machinomy.Client(configuration.account, machinomy.contract, transport, storage);
    client.buy(uri, function (error, price, callback) {
        if (error) throw error;
        var value = price * 10;
        callback(null, value, function (error, response) {
            if (error) throw error;
            console.log(response.body);
        });
    });
};

module.exports = buy;
