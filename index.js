var channel = require("./lib/channel"),
    middleware = require("./lib/middleware"),
    transport = require("./lib/transport"),
    storage = require("./lib/storage");

module.exports = {
    NAME: "machinomy",
    VERSION: "0.0.9",
    Paywall: middleware.Paywall,
    Transport: transport.Transport,
    Client: transport.Client,
    Storage: storage.Storage,
    web3: channel.web3,
    contract: channel.contract,
    Payment: channel.Payment
};
