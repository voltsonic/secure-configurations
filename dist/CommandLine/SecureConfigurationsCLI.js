#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const projectRoot = process.cwd();
const SecureConfigurations_1 = require("../SecureConfigurations");
const scConfig = require("../../package.json");
const path = require("path");
const fs = require("fs");
const program = require('commander');
const enquirer = require('enquirer');
const chalk = require("chalk");
const packageFile = path.join(projectRoot, "package.json");
const pkg = require(packageFile);
if (!pkg.hasOwnProperty("secure-configurations"))
    throw new Error("Your package.json is missing the `secure-configurations` entry.");
let cfgBase = pkg["secure-configurations"];
if (!cfgBase.hasOwnProperty("maps") || Object.keys(cfgBase.maps).length === 0)
    throw new Error("Your package.json `secure-configurations` `maps` key is missing (or empty).");
let cfgMaps = cfgBase.maps;
let mapKeys = Object.keys(cfgMaps);
let mapDefault = mapKeys[0];
program
    .version("v" + scConfig.version)
    .description("SecureConfigurations Command-Line Interface - v" + scConfig.version + " - Integrity Check is run by default (without Backup/Restore flags) and is recommended to run before Backup/Restore.")
    .option("-m, --map-key <map-key>", "Map key to backup/restore [" + mapKeys.sort().map(m => ((m === mapDefault ? "*" : "") + m)).join(", ") + "] * default (does not include custom --config).", mapDefault)
    .option("-r, --restore", "Restore files.")
    .option("-b, --backup", "Backup files.")
    .option("-c, --config <load-config>", "Load configs (multiple allowed, loaded in order).", (_new, previous) => {
    if (!previous)
        previous = [];
    previous.push(_new);
    return previous;
})
    .option('-f, --force-run', 'Ignore verification of backup/restore.');
program.parse(process.argv);
let isBackup = program.backup || false;
let isRestore = program.restore || false;
if (isBackup && isRestore)
    throw new Error("Cannot backup and restore at same time.");
let isIntegrity = !isBackup && !isRestore;
// Inject custom.
if (program.config) {
    let cf;
    for (let c of program.config) {
        cf = path.resolve(projectRoot, c);
        if (fs.existsSync(cf)) {
            let mergeConfig = JSON.parse(fs.readFileSync(cf));
            if (mergeConfig.maps)
                Object.keys(mergeConfig.maps).forEach((mapKey) => {
                    cfgMaps.hasOwnProperty(mapKey)
                        // Overwrite/Append
                        ? (() => {
                            if (mergeConfig.maps[mapKey].directory)
                                cfgMaps[mapKey].directory = mergeConfig.maps[mapKey].directory;
                            if (mergeConfig.maps[mapKey].files)
                                for (let f of mergeConfig.maps[mapKey].files)
                                    cfgMaps[mapKey].files.push(f);
                        })()
                        // Setup New
                        : cfgMaps[mapKey] = mergeConfig.maps[mapKey];
                });
        }
    }
}
let action = isRestore ? "restore" : (isIntegrity ? "integrity" : "backup");
let backupKey = program.mapKey || mapDefault;
let runCode = (hasPermission) => {
    if (hasPermission) {
        if (isIntegrity) {
            Object.keys(cfgMaps).forEach(backupKeyInner => {
                console.log('++============');
                console.log('|| Map Key: ' + chalk.bold.blueBright(backupKeyInner));
                console.log('++============');
                let backupFiles = cfgMaps[backupKeyInner].files;
                let backupDirectory = cfgMaps[backupKeyInner].directory;
                if (backupFiles.length <= 0)
                    throw new Error(`Backup files for ${backupKeyInner} is empty.`);
                if (!fs.existsSync(backupDirectory))
                    throw new Error(`Backup directory does not exist: ${backupDirectory}`);
                let isDefaultBackupKey = backupKeyInner === mapDefault;
                let Opts = { backupKey: backupKeyInner, backupFiles, backupDirectory, projectRoot, isDefaultBackupKey };
                SecureConfigurations_1.SecureConfigurations.Configure(Opts);
                SecureConfigurations_1.SecureConfigurations.Run.Integrity();
                console.log(' ');
            });
        }
        else {
            let backupFiles = cfgMaps[backupKey].files;
            let backupDirectory = cfgMaps[backupKey].directory;
            if (backupFiles.length <= 0)
                throw new Error(`Backup files for ${backupKey} is empty.`);
            if (!fs.existsSync(backupDirectory))
                throw new Error(`Backup directory does not exist: ${backupDirectory}`);
            SecureConfigurations_1.SecureConfigurations.Configure({ backupKey, backupFiles, backupDirectory, projectRoot });
            isRestore
                ? SecureConfigurations_1.SecureConfigurations.Run.Restore()
                : SecureConfigurations_1.SecureConfigurations.Run.Backup();
        }
    }
    else
        console.log("| Skipped due to user input.");
};
if (mapKeys.indexOf(backupKey) < 0)
    throw new Error(`Map Key: ${backupKey} not found`);
if (isIntegrity || program.forceRun)
    runCode(true);
else
    new enquirer.Confirm({
        name: 'question',
        message: `[ ${backupKey} // ${action} ]`
    })
        .run()
        .then(runCode);
//# sourceMappingURL=SecureConfigurationsCLI.js.map