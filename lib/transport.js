"use strict";

var request = require("request"),
    channel = require("./channel"),
    log = require("./log");

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
    log.verbose("Getting " + uri + " using access token");
    request(options, callback);
};

Transport.prototype.get = function (uri, headers, callback) {
    var options = {
        method: 'GET',
        uri: uri,
        headers: headers
    };
    log.verbose("Getting " + uri + " using headers: " + JSON.stringify(headers));
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
    log.verbose("Getting request token in exchange for payment");
    request(options, function (error, response) {
        if (error) {
            log.verbose("Can not find a token in the response");
            callback(error, null);
        } else {
            var token = response.headers['paywall-token'];
            if (token) {
                log.verbose("Got token from the server");
                callback(error, token);
            } else {
                callback("Can not find a token in the response", null);
            }
        }
    });
};

var PaymentRequired = function (headers) {
    this.receiver = headers['paywall-address'];
    this.price = Number(headers['paywall-price']);
    this.gateway = headers['paywall-gateway'];
};

/**
 * @param {Object} headers
 * @returns {PaymentRequired}
 */
PaymentRequired.parse = function (headers) {
    return new PaymentRequired(headers);
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

Client.prototype.freshChannel = function (uri, response, paymentRequired, valueCallback) {
    var self = this;
    valueCallback(null, paymentRequired.price, function (error, value, callback) { // Determine value of the channel
        self.contract.buildPaymentChannel(self.sender, paymentRequired.receiver, value, function (error, paymentChannel) {
            if (error) throw error;
            self.storage.saveChannel(paymentChannel, function (error) {
                if (error) throw error;
                var payment = channel.Payment.fromPaymentChannel(paymentChannel, paymentRequired.price);
                var nextPaymentChannel = channel.PaymentChannel.fromPayment(payment);
                self.storage.saveChannel(nextPaymentChannel, function (err) {
                    if (err) throw err;
                    self.transport.requestToken(paymentRequired.gateway, payment, function (error, token) {
                        self.transport.getWithToken(uri, token, callback);
                    });
                });
            });
        });
    });
};

Client.prototype.existingChannel = function (uri, response, paymentRequired, raw, valueCallback) {
    var self = this;
    valueCallback(null, paymentRequired.price, function (error, value, callback) {
        var paymentChannel = new channel.PaymentChannel(raw.sender, raw.receiver, raw.channelId, null, raw.value, raw.spent);
        var payment = channel.Payment.fromPaymentChannel(paymentChannel, paymentRequired.price);
        var nextPaymentChannel = channel.PaymentChannel.fromPayment(payment);
        self.storage.saveChannel(nextPaymentChannel, function (err) {
            if (err) throw err;
            self.transport.requestToken(paymentRequired.gateway, payment, function (error, token) {
                self.transport.getWithToken(uri, token, callback);
            });
        });
    });
};

Client.prototype.canUseChannel = function (paymentChannel, paymentRequired) {
    var isOpen = this.contract.getState(paymentChannel.channelId) == 0;
    var funded = paymentChannel.value > (paymentChannel.spent + paymentRequired.price);
    return isOpen && funded;
};

/**
 * Select handler based on version returned by server.
 * @param uri
 * @param response
 * @param valueCallback
 */
Client.prototype.handlePaymentRequired = function (uri, response, valueCallback) {
    log.verbose("Handling 402 Payment Required response");
    var self = this;
    var version = response.headers['paywall-version'];
    if (version == VERSION) {
        var paymentRequired = PaymentRequired.parse(response.headers);
        this.storage.channelsBySenderReceiver(self.sender, paymentRequired.receiver, function (error, docs) {
            var openChannels = [];
            for (let doc of docs) {
                if (self.canUseChannel(doc, paymentRequired)) {
                    openChannels.push(doc);
                }
            }
            if (openChannels.length == 0) {
                // Build new channel
                self.freshChannel(uri, response, paymentRequired, valueCallback);
            } else if (openChannels.length == 1) {
                self.existingChannel(uri, response, paymentRequired, openChannels[0], valueCallback);
            } else {
                // Do Something
                throw "Found more than one channel from " + self.sender + " to " + paymentRequired.receiver;
            }
        });
    } else {
        // Do Something
        valueCallback("Unsupported version " + version + ", expected " + VERSION, null);
    }
};

Client.prototype.pry = function (uri, callback) {
    var self = this;
    self.transport.get(uri, {}, function (error, response) {
        if (error) {
            callback(error);
        } else {
            switch(response.statusCode) {
                case 402:
                    var version = response.headers['paywall-version'];
                    if (version == VERSION) {
                        var paymentRequired = PaymentRequired.parse(response.headers);
                        callback(null, paymentRequired);
                    } else {
                        callback("Unsupported version " + version + ", expected " + VERSION, null);
                    }
                    break;
                default:
                    callback("No payment required", null);
            }
        }
    });
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
 * @param {Payment} payment
 * @param {PaymentChannel} paymentChannel
 */
var isPaymentValid = function (payment, paymentChannel) {
    var validIncrement = (paymentChannel.spent + payment.price) <= paymentChannel.value;
    var validChannelValue = paymentChannel.value == payment.channelValue;
    var validPaymentValue = paymentChannel.value <= payment.channelValue;
    return validIncrement && validChannelValue && validPaymentValue;
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
        var token, paymentChannel;
        if (docs.length == 0) {
            token = channel.web3.sha3(JSON.stringify(payment));
            paymentChannel = channel.PaymentChannel.fromPayment(payment);
            self.storage.saveChannel(paymentChannel, function (err) {
                if (err) throw err;
                self.storage.saveToken(token, payment, function (err) {
                    callback(err, token);
                });
            });
        } else if (docs.length == 1) {
            var doc = docs[0];
            paymentChannel = new channel.PaymentChannel(doc.sender, doc.receiver, doc.channelId, null, doc.value, doc.spent);
            log.debug(paymentChannel);
            if (isPaymentValid(payment, paymentChannel)) {
                token = channel.web3.sha3(JSON.stringify(payment));
                var nextPaymentChannel = channel.PaymentChannel.fromPayment(payment);
                self.storage.saveChannel(nextPaymentChannel, function (err) {
                    if (err) throw err;
                    self.storage.saveToken(token, payment, function (err) {
                        callback(err, token);
                    });
                });
            } else {
                log.error("Invalid payment. Closing the channel " + paymentChannel.channelId);
                self.storage.lastPaymentDoc(paymentChannel.channelId, function (err, paymentDoc) {
                    callback(err, null);
                    channel.contract.claim(self.receiver, paymentDoc.channelId, paymentDoc.value, paymentDoc.v, paymentDoc.r, paymentDoc.s, function (error, claimedValue) {
                        log.info("Claimed " + claimedValue + " from channel " + paymentDoc.channelId);
                    });
                });
            }
        } else {
            throw "More than one channel found. Must be an error"; // Do Something
        }
    });
};

Server.prototype.acceptToken = function (token, callback) {
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
