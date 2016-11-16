"use strict";

var express = require("express");
var app = express();
var bodyParser = require('body-parser');
var machinomy = require("./index"),
    web3 = machinomy.web3;

var settings = machinomy.configuration.receiver();

web3.personal.unlockAccount(settings.account, settings.password, 1000);

var paywall = new machinomy.Paywall(settings.account);

app.use(bodyParser.json());
app.use(paywall.middleware());

app.get("/resource", paywall.guard(1000, function (req, res) {
    res.send("Hello, world!");
}));

app.listen(3000, function() {
    console.log('Example app listening on port 3000!');
});
