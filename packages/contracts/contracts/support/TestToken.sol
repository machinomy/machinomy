pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";

contract TestToken is MintableToken {
    mapping (address => mapping (address => bool)) public blocks;

    function block(address _to, address _from) public {
        blocks[_from][_to] = true;
    }

    function unblock(address _to, address _from) public {
        blocks[_from][_to] = false;
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(_to != address(0));
        require(_value <= balances[msg.sender]);
        require(!blocks[msg.sender][_to]);

        balances[msg.sender] = balances[msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);
        emit Transfer(msg.sender, _to, _value);
        return true;
    }
}
