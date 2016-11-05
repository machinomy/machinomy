"use strict";

var machinomy = require("./index");
var web3 = machinomy.web3;

// Actually "Main account" on Mac machine
var CLIENT_ACCOUNT_ADDRESS = "0xede7E5A513E1669c25b522CDB285562A2169a473";

web3.personal.unlockAccount(CLIENT_ACCOUNT_ADDRESS, "G6cKyE8pBvMPhuo", 1000);

function step1_1() {
    var RESOURCE_URL = 'http://localhost:3000/resource';
    var transport = new machinomy.Transport();
    var storage = new machinomy.Storage('./db.client.db.0');
    var client = new machinomy.Client(CLIENT_ACCOUNT_ADDRESS, machinomy.contract, transport, storage);
    client.buy(RESOURCE_URL, function (error, price, callback) {
        if (error) throw error;
        var value = price * 10;
        callback(null, value, function (error, response) {
            if (error) throw error;
            console.log(response.body);
        });
    });
}

step1_1();
