pragma solidity ^0.4.2;

contract Channels {
    struct PaymentChannel {
        address sender;
        address receiver;
        uint256 value;

        uint openUntil;
        bool open;
    }

    mapping(bytes32 => PaymentChannel) channels;
    uint id;
    
    event DidCreateChannel(address indexed sender, address indexed receiver, bytes32 channelId);
    event DidDeposit(address indexed channelId, uint256 value);
    event DidClaim(bytes32 indexed channelId, uint256 value);
    event DidClose(address indexed channelId);

    function Channels() {
        id = 0;
    }

    function createChannel(address receiver) payable {
        var channelId = sha3(id++);
        var sender = msg.sender;
        var value = msg.value;
        channels[channelId] = PaymentChannel(sender, receiver, value, block.timestamp + 1 days, true);
        
        DidCreateChannel(sender, receiver, channelId);
    }

    function claim(bytes32 channelId, uint256 value, uint8 v, bytes32 r, bytes32 s) {
        if (!verify(channelId, value, v, r, s)) return;

        var channel = channels[channelId];
        if (value > channel.value) {
            if (!channel.receiver.send(channel.value)) throw;
            channel.value = 0;
            DidClaim(channelId, channel.value);
        } else {
            if (!channel.receiver.send(value)) throw;
            channel.value -= value;
            DidClaim(channelId, value);
        }

        channels[channelId].open = false;
    }

    function getHash(bytes32 channelId, uint256 value) constant returns(bytes32) {
        return sha3(channelId, value);
    }

    function verify(bytes32 channelId, uint256 value, uint8 v, bytes32 r, bytes32 s) constant returns(bool) {
        var channel = channels[channelId];
		return channel.open &&
            channel.openUntil > block.timestamp &&
            channel.sender == ecrecover(getHash(channelId, value), v, r, s);
    }

    function close(bytes32 channelId) returns(bool) {
        var channel = channels[channelId];
        if (channel.value > 0) {
            if (!channel.sender.send(channel.value)) throw;
            delete channels[channelId];
        }
    }

    function deposit(bytes32 channelId) payable {
        if (!isOpenChannel(channelId)) throw;

        var channel = channels[channelId];
        channel.value += msg.value;

        DidDeposit(msg.sender, msg.value);
    }

    function isOpenChannel(bytes32 channelId) constant returns(bool) {
        var channel = channels[channelId];
        return channel.open && channel.openUntil >= block.timestamp;
    }
}