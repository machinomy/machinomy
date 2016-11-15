"use strict";

var machinomy = require("../index"),
    web3 = machinomy.web3;

var buy = function (uri) {
    var CLIENT_ACCOUNT_ADDRESS = "0xede7E5A513E1669c25b522CDB285562A2169a473";

    web3.personal.unlockAccount(CLIENT_ACCOUNT_ADDRESS, "G6cKyE8pBvMPhuo", 1000);

    var transport = new machinomy.Transport();
    var storage = new machinomy.Storage('./db.client.db.0');
    var client = new machinomy.Client(CLIENT_ACCOUNT_ADDRESS, machinomy.contract, transport, storage);
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
