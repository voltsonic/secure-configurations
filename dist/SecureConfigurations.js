"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const glob = require("glob");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const logSymbols = require('log-symbols');
var SecureConfigurations;
(function (SecureConfigurations) {
    let integrityAlgorithm = "sha1";
    let projectRoot = __dirname;
    while (!fs.existsSync(path.join(projectRoot, "package.json"))) {
        projectRoot = path.join(projectRoot, "..");
    }
    let configuration = {
        integrityAlgorithm,
        projectRoot,
        backupKey: "prod",
        backupDirectory: "__MISSING__",
        backupFiles: []
    };
    SecureConfigurations.Configure = (to) => {
        Object.keys(to).forEach(k => {
            if (to.hasOwnProperty(k))
                // @ts-ignore
                configuration[k] = to[k];
        });
    };
    let Run;
    (function (Run) {
        const IterateFiles = (from, to, cbFile, cbIsGlob, cbError, afterEachFile) => {
            let readBase = path.resolve(from, '.');
            let writeBase = path.resolve(to, '.');
            if (typeof cbIsGlob !== "function")
                cbIsGlob = (readGlob) => { };
            if (typeof cbError !== "function")
                cbError = (error) => { };
            if (typeof afterEachFile !== "function")
                afterEachFile = () => { };
            for (let file of configuration.backupFiles) {
                let read = path.join(from, file);
                let write = path.join(to, file);
                if (!fs.existsSync(read)) {
                    let globCheck = glob.sync(read);
                    if (globCheck.length > 0) {
                        cbIsGlob(read);
                        for (let readGlob of globCheck) {
                            readGlob = path.resolve(readGlob, '.');
                            let writeGlob = writeBase + readGlob.replace(readBase, "");
                            cbFile(readGlob, writeGlob, readGlob.replace(readBase, "").substr(1));
                        }
                    }
                    else
                        cbError('File does not exist (' + read + ')');
                }
                else
                    cbFile(read, write, write.replace(writeBase, "").substr(1));
                afterEachFile();
            }
        };
        const Program = (action, from, to) => {
            if (configuration.backupDirectory === "__MISSING__")
                throw new Error("Backup directory is missing.");
            let runCopy = (read, write) => {
                fs.mkdirSync(path.dirname(write), { recursive: true });
                try {
                    fs.copyFileSync(read, write);
                }
                catch (e) {
                    console.log("e", e);
                }
                console.log('| File: ' + read);
                console.log('| \\ To: ' + write);
            };
            console.log('+------------------------------');
            console.log('|| Env: ' + configuration.backupKey.toLocaleLowerCase());
            console.log('|| Action: ' + action);
            console.log('+------------------------------');
            IterateFiles(from, to, runCopy, read => {
                console.log('|> Glob: ' + read);
                console.log('|');
            }, (err) => {
                console.log('| Error: ' + err);
            }, () => {
                console.log('+------------------------------');
            });
        };
        const integrityHashFile = (fileSrc) => {
            if (!fs.existsSync(fileSrc))
                return "";
            const h = crypto.createHash(configuration.integrityAlgorithm);
            h.setEncoding("hex");
            h.write(fs.readFileSync(fileSrc, "utf8")); // TODO: build encoding detection in.
            h.end();
            return h.read();
        };
        Run.Integrity = () => {
            let fileChecks = {};
            let backupKey = configuration.backupKey;
            IterateFiles(configuration.backupDirectory, configuration.projectRoot, (fileRead, fileWrite, fileRelative) => {
                fileChecks[fileRelative] = {
                    backup: fileRead,
                    backupHash: integrityHashFile(fileRead),
                    restore: fileWrite,
                    restoreHash: integrityHashFile(fileWrite)
                };
            });
            IterateFiles(configuration.projectRoot, configuration.backupDirectory, (fileRead, fileWrite, fileRelative) => {
                if (!fileChecks.hasOwnProperty(fileRelative))
                    fileChecks[fileRelative] = {
                        backup: fileWrite,
                        backupHash: integrityHashFile(fileWrite),
                        restore: fileRead,
                        restoreHash: integrityHashFile(fileRead)
                    };
            });
            let sortKeys = Object.keys(fileChecks);
            if (sortKeys.length === 0) {
                console.log("| No Files Found?");
            }
            else {
                for (let key of sortKeys) {
                    let n = fileChecks[key];
                    let pass = n.backupHash === n.restoreHash;
                    if (!pass) {
                        let backupM = fs.existsSync(n.backup) ? fs.statSync(n.backup).mtime : -1;
                        let restoreM = fs.existsSync(n.restore) ? fs.statSync(n.restore).mtime : -1;
                        let missingBackup = backupM < 0;
                        let missingRestore = restoreM < 0;
                        let a = [];
                        if (missingBackup)
                            a.push("(" + logSymbols.warning + " Missing on Backup)");
                        if (missingRestore)
                            a.push("(" + logSymbols.warning + " Missing on Restore)");
                        if (a.length > 0)
                            a.unshift("");
                        console.log(logSymbols.error + " " + key + (a.join(" ")));
                        let shouldBackup = backupM < restoreM;
                        let recommendFlag = shouldBackup
                            ? "backup"
                            : "restore";
                        if (!missingBackup && !missingRestore) {
                            let recommend = shouldBackup
                                ? "Backup"
                                : "Restore";
                            console.log('|  Backup: ' + (shouldBackup ? logSymbols.warning : logSymbols.success) + ' ' + n.backup + ' @ ' + backupM);
                            console.log('| Project: ' + (shouldBackup ? logSymbols.success : logSymbols.warning) + ' ' + n.backup + ' @ ' + restoreM);
                            console.log('|');
                            console.log('| Run ~*' + recommend + '*~');
                        }
                        console.log(`| \\ secure-configurations -m ${backupKey} --${recommendFlag}`);
                        console.log('+----------------------------');
                    }
                    else
                        console.log(logSymbols.success + " " + key);
                }
            }
        };
        Run.Restore = () => Program("Restoring", configuration.backupDirectory, configuration.projectRoot);
        Run.Backup = () => Program("Backing Up", configuration.projectRoot, configuration.backupDirectory);
    })(Run = SecureConfigurations.Run || (SecureConfigurations.Run = {}));
})(SecureConfigurations = exports.SecureConfigurations || (exports.SecureConfigurations = {}));
//# sourceMappingURL=SecureConfigurations.js.map