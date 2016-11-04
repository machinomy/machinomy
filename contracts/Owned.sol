pragma solidity ^0.4.2;

contract Owned {
    address owner;

    function Owned () {
        owner = msg.sender;        
    }
}
