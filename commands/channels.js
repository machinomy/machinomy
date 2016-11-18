"use strict";

var machinomy = require("../index"),
    web3 = machinomy.web3;

var channels = function (command) {
    var namespace = command.namespace || "sender";
    var settings = machinomy.configuration.sender();

    var storage = new machinomy.Storage(settings.databaseFile, namespace);

    storage.channels(function (err, paymentChannels) {
        var state;
        for (var paymentChannel of paymentChannels) {
            state = machinomy.contract.getState(paymentChannel.channelId);
            paymentChannel.state = state;
            console.log(paymentChannel);
        }
    });
};

module.exports = channels;
