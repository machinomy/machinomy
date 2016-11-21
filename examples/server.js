"use strict";

var express = require("express");
var bodyParser = require('body-parser');
var machinomy = require("./../index");

var settings = machinomy.configuration.receiver();
machinomy.web3.personal.unlockAccount(settings.account, settings.password, 1000);

var paywall = new machinomy.Paywall(settings.account, 'http://localhost:3000');

var app = express();
app.use(bodyParser.json());
app.use(paywall.middleware());

app.get("/resource", paywall.guard(1000, function (req, res) {
    res.send("Hello, world!");
}));

app.listen(3000);
