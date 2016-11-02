var storage = require("./storage.js"),
    transport = require("./transport.js"),
    channel = require("./channel.js");

/**
 *
 * @param address
 * @param _storage
 * @constructor
 */
var Paywall = function (address, _storage) {
    _storage = _storage || new storage.Storage('./db.server.db.1');
    this.server = new transport.Server(address, 'http://localhost:3000/payments', _storage);
};

Paywall.TOKEN_NAME = 'paywall';

Paywall.prototype.paid = function (callback) {
    var self = this;
    return function (req, res) {
        var authorizationString = req.get('authorization');
        if (authorizationString) {
            var authorization = authorizationString.split(" ");
            var type = authorization[0].toLowerCase();
            var token = authorization[1];
            if (type == Paywall.TOKEN_NAME) {
                self.server.acceptToken(token, function (isOk) {
                    if (isOk) {
                        callback(req, res);
                    } else {
                        self.paymentRequired(req, res);
                    }
                });
            } else {
                self.fail(req, res);
            }
        } else {
            self.paymentRequired(req, res);
        }
    };
};

Paywall.prototype.fail = function (req, res) {
    res.status(400).end();
};

Paywall.prototype.paymentRequired = function (req, res) {
    var PRICE = 1000;
    res.status(402)
        .set(this.server.paywallHeaders(PRICE))
        .send('Payment Required')
        .end();
};

Paywall.prototype.middleware = function () {
    var self = this;
    var handler = function (req, res) {
        var payment = new channel.Payment(req.body);
        self.server.acceptPayment(payment, function (error, token) {
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
