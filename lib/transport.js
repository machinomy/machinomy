var request = require("request"),
    channel = require("./channel");

var VERSION = "machinomy.com/0.0.3";

var Transport = function () {

};

/**
 * Request URI sending a paywall token.
 * @param {string} uri
 * @param {string} token
 * @param {function(string, Object)} callback
 */
Transport.prototype.getWithToken = function (uri, token, callback) {
    var options = {
        method: 'GET',
        uri: uri,
        headers: {
            'authorization': 'Paywall ' + token
        }
    };
    console.log("Getting " + uri + " using access token");
    request(options, callback);
};

Transport.prototype.get = function (uri, headers, callback) {
    var options = {
        method: 'GET',
        uri: uri,
        headers: headers
    };
    console.log("Getting " + uri + " using headers: " + JSON.stringify(headers));
    request(options, callback);
};

/**
 * Request token from the server's gateway
 * @param {string} uri - Full url to the gateway.
 * @param {Payment} payment
 * @param {function(string, string|null)} callback - callback(error, token)
 */
Transport.prototype.requestToken = function (uri, payment, callback) {
    var options = {
        method: 'POST',
        uri: uri,
        json: true,
        body: payment
    };
    console.log("Getting request token in exchange for payment");
    request(options, function (error, response) {
        if (error) {
            console.log("Can not find a token in the response");
            callback(error, null);
        } else {
            var token = response.headers['paywall-token'];
            if (token) {
                console.log("Got token from the server");
                callback(error, token);
            } else {
                callback("Can not find a token in the response", null);
            }
        }
    });
};

var Client = function (account, contract, transport, storage) {
    /**
     * @type {string}
     */
    this.sender = account;

    /**
     * @type {ChannelContract}
     */
    this.contract = contract;

    /**
     * @type {Transport}
     */
    this.transport = transport;

    /**
     * @type {Storage}
     */
    this.storage = storage;
};

/**
 * Select handler based on version returned by server.
 * @param uri
 * @param response
 * @param valueCallback
 */
Client.prototype.handlePaymentRequired = function (uri, response, valueCallback) {
    console.log("Handling 402 Payment Required response");
    var self = this;
    var version = response.headers['paywall-version'];
    if (version == VERSION) {
        var receiver = response.headers['paywall-address'];
        var price = Number(response.headers['paywall-price']);
        var gateway = response.headers['paywall-gateway'];
        this.storage.channelsBySenderReceiver(self.sender, receiver, function (error, docs) {
            if (docs.length == 0) {
                // Build new channel
                valueCallback(null, price, function (error, value, callback) { // Determine value of the channel
                    self.contract.buildPaymentChannel(self.sender, receiver, value, function (error, paymentChannel) {
                        if (error) throw error;
                        self.storage.saveChannel(paymentChannel, function (error) {
                            if (error) throw error;
                            var payment = channel.Payment.fromPaymentChannel(paymentChannel, price);
                            var nextPaymentChannel = channel.PaymentChannel.fromPayment(payment);
                            self.storage.saveChannel(nextPaymentChannel, function (err) {
                                if (err) throw err;
                                self.transport.requestToken(gateway, payment, function (error, token) {
                                    self.transport.getWithToken(uri, token, callback);
                                });
                            });
                        });
                    });
                });
            } else if (docs.length == 1) {
                // Do Something: Reuse channel
                throw "Found a channel from " + self.sender + " to " + receiver;
            } else {
                // Do Something
                throw "Found more than one channel from " + self.sender + " to " + receiver;
            }
        });
    } else {
        // Do Something
        valueCallback("Unsupported version " + version + ", expected " + VERSION, null);
    }
};

Client.prototype.buy = function (uri, callback) {
    var self = this;
    self.transport.get(uri, {}, function (error, response) {
        if (error) {
            callback(error);
        } else {
            switch(response.statusCode) {
                case 402:
                    self.handlePaymentRequired(uri, response, callback);
                    break;
                default:
                    // Do Something
            }
        }
    });
};

/**
 * Server side.
 * @param {string} receiver
 * @param {string} gatewayUri - Full URI to the gateway, that responds back with a token.
 * @param {Storage} storage
 * @constructor
 */
var Server = function (receiver, gatewayUri, storage) {
    this.receiver = receiver;
    this.gatewayUri = gatewayUri;
    this.storage = storage;
};

Server.prototype.paywallHeaders = function (price) {
    var headers = {};
    headers['Paywall-Version'] = VERSION;
    headers['Paywall-Price'] = price;
    headers['Paywall-Address'] = this.receiver;
    headers['Paywall-Gateway'] = this.gatewayUri;
    return headers;
};

/**
 * Accept or reject payment.
 *
 * @param {Payment} payment
 * @param {function} callback
 */
Server.prototype.acceptPayment = function (payment, callback) {
    var self = this;

    if (payment.receiver != self.receiver) {
        throw ("Receiver must be " + self.receiver);
    }

    self.storage.channelsBySenderReceiverChannelId(payment.sender, payment.receiver, payment.channelId, function (err, docs) {
        if (docs.length == 0) {
            var token = channel.web3.sha3(JSON.stringify(payment));
            var paymentChannel = channel.PaymentChannel.fromPayment(payment);
            self.storage.saveChannel(paymentChannel, function (err) {
                if (err) throw err;
                self.storage.saveToken(token, payment, function (err) {
                    callback(err, token);
                });
            });
        } else if (docs.length > 1) {
            throw "More than one channel found. Must be an error"; // Do Something
        } else {
            throw "Exactly one channel found"; // Do Something
        }
    });
};

Server.prototype.acceptToken = function (token, callback) { // Do Something
    this.storage.checkToken(token, function (error, isOk) {
        if (error) throw error;
        callback(isOk);
    });
};

module.exports = {
    Server: Server,
    Transport: Transport,
    Client: Client
};
