"use strict";

var Datastore = require('nedb');

/**
 * @param {string} path
 * @param {string} namespace
 * @constructor
 */
var Storage = function (path, namespace) {
    this.namespace = namespace;
    this.db = new Datastore({filename: path, autoload: true});
};

/**
 * Find channels by sender and receiver accounts.
 * @param {string} sender - Ethereum account of the sender.
 * @param {string} receiver - Ethereum account of the receiver.
 * @param {function} callback
 */
Storage.prototype.channelsBySenderReceiver = function (sender, receiver, callback) {
    var query = {
        kind: this.ns('channel'),
        sender: sender,
        receiver: receiver
    };
    this.db.find(query, callback);
};

/**
 * Find channels by sender, receiver accounts, and channel id.
 * @param {string} sender - Ethereum account of the sender.
 * @param {string} receiver - Ethereum account of the receiver.
 * @param {string} channelId - Identifier of the channel to find.
 * @param {function} callback
 */
Storage.prototype.channelsBySenderReceiverChannelId = function (sender, receiver, channelId, callback) {
    var query = {
        kind: this.ns('channel'),
        sender: sender,
        receiver: receiver,
        channelId: channelId
    };
    this.db.find(query, callback);
};

/**
 * Save token to the database, to check against later.
 * @param {string} token
 * @param {Payment} payment
 * @param {function(string|null)} callback
 */
Storage.prototype.saveToken = function (token, payment, callback) {
    var self = this;
    var tokenDoc = {
        kind: this.ns('token'),
        token: token,
        channelId: payment.channelId
    };
    var paymentDoc = {
        kind: this.ns('payment'),
        token: token,
        channelId: payment.channelId,
        value: payment.value,
        v: payment.v,
        r: payment.r,
        s: payment.s
    };
    self.db.insert(tokenDoc, function (err, _) {
        if (err) {
            callback(err);
        } else {
            self.db.insert(paymentDoc, function (err, _) {
                if (err) {
                    callback(err);
                } else {
                    callback(null);
                }
            });
        }
    });
};

Storage.prototype.lastPaymentDoc = function (channelId, callback) {
    var self = this;
    var query = { kind: this.ns('payment'), channelId: channelId };
    console.log("Trying to find last payment for channelId " + channelId);
    self.db.find(query, function (err, documents) {
        if (err) {
            callback(err, null);
        } else {
            var maxPaymentDoc = documents.reduce(function (a, b) {
                return Math.max(a.value, b.value);
            });
            if (maxPaymentDoc) {
                callback(null, maxPaymentDoc);
            } else {
                callback("Can not find payment for channel " + channelId, null);
            }
        }
    });
};

/**
 * Check if token is valid. Valid token is (1) present, (2) issued earlier.
 * @param {string} token
 * @param {function(string|null, boolean|null)} callback
 */
Storage.prototype.checkToken = function (token, callback) {
    var query = {
        kind: this.ns('token'),
        token: token
    };
    this.db.findOne(query, function (error, tokenDoc) {
        if (error) {
            callback(error, null);
        } else if (tokenDoc) {
            console.log("Found a token document for token " + token);
            callback(null, true);
        } else {
            console.log("Can not find a token document for token" + token);
            callback(null, false);
        }
    });
};

/**
 * @param {PaymentChannel} paymentChannel
 * @param {function(string|null)} callback
 */
Storage.prototype.saveChannel = function (paymentChannel, callback) {
    var self = this;
    var document = {
        kind: this.ns("channel"),
        sender: paymentChannel.sender,
        receiver: paymentChannel.receiver,
        value: paymentChannel.value,
        spent: paymentChannel.spent,
        channelId: paymentChannel.channelId
    };
    var query = { channelId: paymentChannel.channelId, kind: this.ns("channel") };
    this.db.findOne(query, function (err, doc) {
        if (doc) {
            self.saveChannelSpending(paymentChannel.channelId, paymentChannel.spent, callback);
        } else {
            self.db.insert(document, callback);
        }
    });
};

Storage.prototype.saveChannelSpending = function (channelId, spent, callback) {
    var query = {
        kind: this.ns("channel"),
        channelId: channelId
    };
    var updateOp = {
        $set: {spent: spent}
    };
    this.db.update(query, updateOp, {}, callback);
};

/**
 * @param {string} raw
 * @returns {string}
 */
Storage.prototype.ns = function (raw) {
    if (this.namespace) {
        return this.namespace + ":" + raw;
    } else {
        return raw;
    }
};

module.exports = {
    Storage: Storage
};
