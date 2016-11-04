"use strict";

var express = require("express");
var app = express();
var bodyParser = require('body-parser');
var machinomy = require("./index");

var ADDRESS = "0xC4F4CF50dA56b511968e4f72e54780afC16404f9"; // Actually "Account 2" on Mac machine

var paywall = new machinomy.Paywall(ADDRESS);

app.use(bodyParser.json());
app.use(paywall.middleware());

app.get("/resource", paywall.guard(1000, function (req, res) {
    res.send("Hello, world!");
}));

app.listen(3000, function() {
    console.log('Example app listening on port 3000!');
});
