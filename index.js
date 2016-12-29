var channel = require("./lib/channel"),
    middleware = require("./lib/middleware"),
    transport = require("./lib/transport"),
    storage = require("./lib/storage"),
    configuration = require("./lib/configuration"),
    log = require("./lib/log");

/**
 * Shortcut for Client.buy.
 *
 * @param {String} uri
 * @param {String} account
 * @param {String} password
 * @param _callback
 */
var buy = function (uri, account, password, _callback) {
    var settings = configuration.sender();

    channel.web3.personal.unlockAccount(account, password, 1000);

    var _transport = new transport.Transport();
    var _storage = new storage.Storage(settings.databaseFile, "sender");
    var client = new transport.Client(account, channel.contract, _transport, _storage);
    client.buy(uri, function (error, price, callback) {
        if (error) throw error;
        var value = price * 10;
        callback(null, value, function (error, response) {
            _callback(error, response.body);
        });
    });
};

module.exports = {
    NAME: "machinomy",
    VERSION: "0.1",
    Paywall: middleware.Paywall,
    Transport: transport.Transport,
    Client: transport.Client,
    Storage: storage.Storage,
    web3: channel.web3,
    contract: channel.contract,
    configuration: configuration,
    Payment: channel.Payment,
    log: log,
    buy: buy
};
