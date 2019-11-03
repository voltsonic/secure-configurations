"use strict";

const SecureFiles = require("secure-files");

(new SecureFiles("prod", require("../config.json"), require("../_root"), require("./_files.json"))).backup();
