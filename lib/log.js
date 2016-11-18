"use strict";

var winston = require("winston");

var logger = winston;

module.exports = {
    error: logger.error,
    warn: logger.warn,
    info: logger.info,
    debug: logger.debug,
    verbose: logger.verbose,
    silly: logger.silly
};
