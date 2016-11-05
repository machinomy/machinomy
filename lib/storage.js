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
    var tokenDoc = {
        kind: 'token',
        token: token,
        channelId: payment.channelId
    };
    this.db.insert(tokenDoc, function (err, newDoc) {
        if (err) {
            callback(err);
        } else {
            callback(null);
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
    var document = {
        kind: 'channel',
        sender: paymentChannel.sender,
        receiver: paymentChannel.receiver,
        _id: paymentChannel.channelId
    };
    this.db.insert(document, callback);
};

module.exports = {
    Storage: Storage
};
