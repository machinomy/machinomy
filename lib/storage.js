"use strict";

var Datastore = require('nedb');

/**
 * @param {string} path
 * @constructor
 */
var Storage = function (path) {
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
        kind: 'channel',
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
        kind: 'channel',
        sender: sender,
        receiver: receiver,
        _id: channelId
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
        kind: 'token',
        token: token,
        channelId: payment.channelId
    };
    var paymentDoc = {
        kind: 'payment',
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
    var query = { kind: 'payment', channelId: channelId };
    console.log("Trying to find last payment for channelId " + channelId);
    console.log(query);
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
        kind: 'token',
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
        kind: 'channel',
        sender: paymentChannel.sender,
        receiver: paymentChannel.receiver,
        value: paymentChannel.value,
        spent: paymentChannel.spent,
        _id: paymentChannel.channelId
    };
    var query = { _id: paymentChannel.channelId };
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
        _id: channelId
    };
    var updateOp = {
        $set: {spent: spent}
    };
    this.db.update(query, updateOp, {}, callback);
};

module.exports = {
    Storage: Storage
};
