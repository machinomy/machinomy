pragma solidity ^0.4.2;

import "Owned";

contract Mortal is Owned {
    function kill() {
        if (msg.sender == owner) selfdestruct(owner);
    }
}