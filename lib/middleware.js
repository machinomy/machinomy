"use strict";

var storage = require("./storage"),
    transport = require("./transport"),
    channel = require("./channel"),
    configuration = require("./configuration"),
    log = require("./log");

var HEADER_NAME = 'authorization';
var TOKEN_NAME = 'paywall';

/**
 * @callback gotTokenCallback
 * @param {null|string} error
 * @param {string|null} token
 */

/**
 * @param {Object} req - Incoming http request.
 * @param {gotTokenCallback} callback
 */
var parseToken = function (req, callback) {
    var content = req.get(HEADER_NAME);
    if (content) {
        log.debug("Authorization header: " + content);
        var authorization = content.split(" ");
        var type = authorization[0].toLowerCase();
        var token = authorization[1];
        if (type == TOKEN_NAME) {
            callback(null, token)
        } else {
            callback("Invalid '" + HEADER_NAME + "' token name present. Expected '" + TOKEN_NAME + "', got '" + type + "'", null);
        }
    } else {
        callback("No '" + HEADER_NAME + "' header present", null);
    }
};

/**
 *
 * @param {String} address
 * @param {Storage|null} _storage
 * @constructor
 */
var Paywall = function (address, _storage) {
    var settings = configuration.receiver();
    log.debug("Use settings for receiver", settings);
    _storage = _storage || new storage.Storage(settings.databaseFile, "receiver");
    this.server = new transport.Server(address, 'http://localhost:3000/payments', _storage);
};

Paywall.TOKEN_NAME = 'paywall';

/**
 * Require payment before serving the request.
 *
 * @param {Number} price
 * @param {Function} callback
 * @returns {Function}
 */
Paywall.prototype.guard = function (price, callback) {
    return (req, res) => {
        log.info("Requested " + req.path);
        parseToken(req, (error, token) => {
            if (error) {
                log.error(error);
                this.paymentRequired(price, req, res);
            } else {
                this.server.acceptToken(token, (isOk) => {
                    if (isOk) {
                        log.verbose("Got valid paywall token");
                        callback(req, res);
                    } else {
                        log.warn("Got invalid paywall token");
                        this.paymentInvalid(price, req, res);
                    }
                })
            }
        })
    }
};

Paywall.prototype.fail = function (req, res) {
    res.status(400).end();
};

Paywall.prototype.paymentRequired = function (price, req, res) {
    log.info("Require payment " + price + " for " + req.path);
    res.status(402)
        .set(this.server.paywallHeaders(price))
        .send('Payment Required')
        .end();
};

Paywall.prototype.paymentInvalid = function (price, req, res) {
    res.status(409) // Conflict
        .set(this.server.paywallHeaders(price))
        .send('Payment Invalid')
        .end();
};

Paywall.prototype.middleware = function () {
    var self = this;
    var handler = function (req, res) {
        var payment = new channel.Payment(req.body);
        self.server.acceptPayment(payment, function (error, token) {
            if (error) throw error;
            res.status(202)
                .append('Paywall-Token', token)
                .send('Accepted')
                .end();
        });
    };
    return function (req, res, next) {
        if (req.url == "/payments") {
            handler(req, res);
        } else {
            next();
        }
    };
};

module.exports = {
    Paywall: Paywall
};
