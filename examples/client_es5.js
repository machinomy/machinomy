var Web3 = require("web3");
var Machinomy = require("../index").default;
var fetch = require('whatwg-fetch').fetch;

var sender = '0x5bf66080c92b81173f470e25f9a12fc146278429';
/**
 * Geth must be run on local machine, or use another web3 provider.
 */
var provider = new Web3.providers.HttpProvider('http://localhost:8545');
var web3 = new Web3(provider);
/**
 * Create machinomy instance that provides API for accepting payments.
*/
var machinomy = new Machinomy(sender, web3, { engine: 'nedb', databaseFile: 'machinomy_client'});

var response = fetch('http://localhost:3000/content').then(function (response) {
  var headers = response.headers.map;
  /**
   * Request token to content access
  */
  machinomy.buy({
    price: Number(headers['paywall-price']),
    gateway: headers['paywall-gateway'],
    receiver: headers['paywall-address'],
    meta: 'metaidexample'
  }).then(function (result) {
    var token = result.token
    /**
     * Request paid content
    */
    fetch('http://localhost:3000/content', {
      headers: {
        authorization: `paywall ${token}`
      }
    }).then(function (content) {
      console.log(content._bodyText)
    });
  });
});
