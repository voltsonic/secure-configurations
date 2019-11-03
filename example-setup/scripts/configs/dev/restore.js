"use strict";

const SecureFiles = require("secure-files");

(new SecureFiles("dev", require("../config.json"), require("../_root"), require("./_files.json"))).restore();
