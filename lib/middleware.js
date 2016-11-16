var storage = require("./storage"),
    transport = require("./transport"),
    channel = require("./channel"),
    configuration = require("./configuration");

/**
 *
 * @param address
 * @param _storage
 * @constructor
 */
var Paywall = function (address, _storage) {
    var settings = configuration.receiver();
    _storage = _storage || new storage.Storage(settings.databaseFile, "receiver");
    this.server = new transport.Server(address, 'http://localhost:3000/payments', _storage);
};

Paywall.TOKEN_NAME = 'paywall';

Paywall.prototype.guard = function (price, callback) {
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
                        self.paymentInvalid(price, req, res);
                    }
                });
            } else {
                self.fail(req, res);
            }
        } else {
            self.paymentRequired(price, req, res);
        }
    };
};

Paywall.prototype.fail = function (req, res) {
    res.status(400).end();
};

Paywall.prototype.paymentRequired = function (price, req, res) {
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
