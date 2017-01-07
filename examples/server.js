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

app.get("/hello", paywall.guard(1000, function (req, res) {
    res.write("Have just received 1000 wei.\n");
    res.end("Hello, meat world!");
}));

app.listen(3000, function(_) {
    console.log("Waiting at http://localhost:3000/hello");
});
