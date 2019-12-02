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
const figures = require('figures');
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
let Symbols = {
    error: chalk.redBright(figures.cross),
    warning: chalk.yellowBright(figures.warning),
    success: chalk.greenBright(figures.tick),
    no_change: chalk.green(figures.hamburger),
    backup: chalk.cyan(figures.arrowRight),
    restore: chalk.cyan(figures.arrowLeft)
};
program
    .version("v" + scConfig.version)
    .description("SecureConfigurations Command-Line Interface - v" + scConfig.version + " - Integrity Check is run by default (without Backup/Restore flags) and is recommended to run before Backup/Restore.")
    .option("-m, --map-key <map-key>", "Map key to backup/restore [" + mapKeys.sort().map(m => ((m === mapDefault ? "*" : "") + m)).join(", ") + "] * default (does not include custom --config).", mapDefault)
    .option("-r, --restore", "Restore files.")
    .option("-b, --backup", "Backup files.")
    .option("-s, --show-diff", "Show a basic diff of any files that have changes.")
    .option("-u, --show-unchanged-diff", "Shows un-changed diff lines.")
    // .option('-e, --file-diff <basic-string>', 'Filter specific files with a basic string (can be partial).')
    // .option('-i, --filter-diff <basic-string>', 'Filter lines spit out by showing the diff per file with a basic string (can be partial).')
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
let showDiff = program.showDiff || false;
let showUnchangedDiff = program.showUnchangedDiff || false;
// let fileDiff = program.fileDiff || false;
// let filterDiff = program.filterDiff || false;
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
                            if (mergeConfig.maps[mapKey].files) {
                                for (let f of mergeConfig.maps[mapKey].files)
                                    cfgMaps[mapKey].files.push(f);
                                cfgMaps[mapKey].files.sort();
                            }
                        })()
                        // Setup New
                        : (cfgMaps[mapKey] = mergeConfig.maps[mapKey]);
                });
        }
    }
}
const getLineBreak = (s) => {
    const indexOfLF = s.indexOf('\n', 1);
    return (indexOfLF === -1)
        ? (s.indexOf('\r') !== -1 ? '\r' : '\n')
        : (s[indexOfLF - 1] === '\r' ? '\r\n' : '\n');
};
let action = isRestore ? "restore" : (isIntegrity ? "integrity" : "backup");
let backupKey = program.mapKey || mapDefault;
let runCode = (hasPermission) => {
    if (hasPermission) {
        let innerBreakHeader = '++============';
        let innerBreakHeaderLine = '|| ';
        let preSpace = ' +----------------------------';
        let preSpaceLine = ' | ';
        if (isIntegrity) {
            let configMapKeys = Object.keys(cfgMaps);
            let isFirstConfigMap = true;
            let nextConfigMap = () => {
                if (configMapKeys.length === 0) {
                    console.log(preSpaceLine);
                    console.log(preSpace);
                    return;
                }
                if (!isFirstConfigMap)
                    console.log(' ');
                let backupKeyInner = configMapKeys.shift();
                console.log(innerBreakHeader);
                console.log(innerBreakHeaderLine + 'Map Key: ' + chalk.bold.blueBright(backupKeyInner));
                console.log(innerBreakHeader);
                console.log(preSpaceLine);
                let backupFiles = cfgMaps[backupKeyInner].files;
                let backupDirectory = cfgMaps[backupKeyInner].directory;
                if (backupFiles.length <= 0)
                    throw new Error(`Backup files for ${backupKeyInner} is empty.`);
                if (!fs.existsSync(backupDirectory))
                    throw new Error(`Backup directory does not exist: ${backupDirectory}`);
                let Opts = { backupKey: backupKeyInner, backupFiles, backupDirectory, projectRoot };
                SecureConfigurations_1.SecureConfigurations.Configure(Opts);
                SecureConfigurations_1.SecureConfigurations.Run.Integrity(integritys => {
                    let maxFileRelativeLen = integritys.files.map(v => v.fileRelative.length).sort((a, b) => (a - b)).reverse()[0];
                    for (let f of integritys.files) {
                        let extra = '';
                        let relLen = f.fileRelative.length;
                        if (f.diff) {
                            let isBackup = f.backup.lastModified < f.project.lastModified;
                            extra = ((relLen === maxFileRelativeLen) ? "" : (" ".repeat((maxFileRelativeLen - relLen))))
                                + chalk.greenBright(` (${isBackup ? "Backup" : "Restore"})`);
                        }
                        console.log(` | ${f.diff ? Symbols.error : Symbols.no_change} ` + f.fileRelative + extra);
                        if (showDiff && f.diff) {
                            console.log(' ++');
                            for (let d of f.diff) {
                                let diffSymbol = d.added ? '+' : (d.removed ? '-' : '|');
                                if (!showUnchangedDiff && !d.added && !d.removed)
                                    continue;
                                if (d.added)
                                    diffSymbol = chalk.green(diffSymbol);
                                else if (d.removed)
                                    diffSymbol = chalk.red(diffSymbol);
                                let lb = getLineBreak(d.value);
                                console.log(d.value
                                    .split(lb)
                                    .map(v => {
                                    let s = ' ' + v;
                                    if (d.added)
                                        s = chalk.green(s);
                                    else if (d.removed)
                                        s = chalk.red(s);
                                    return `  ${diffSymbol} ${s}`;
                                })
                                    .filter(v => v.length > 0)
                                    .join(lb));
                            }
                            console.log(' ++');
                        }
                    }
                    if (integritys.recommendedActions.length === 2) {
                        console.log(preSpaceLine);
                        console.log(preSpaceLine + 'Recommended: Manual Check - Configs seem to need to be backed up and restored.');
                        console.log(preSpaceLine);
                    }
                    else if (integritys.recommendedActions.length === 1) {
                        console.log(preSpaceLine);
                        let configExtras = [];
                        if (program.config) {
                            configExtras = program.config.map((v) => (`--config ${v}`));
                            configExtras.unshift("");
                        }
                        console.log(preSpaceLine + `secure-configurations --${integritys.recommendedActions[0]}${configExtras.join(" ")}`);
                    }
                    integritys.recommendedActions;
                    nextConfigMap();
                }, error => {
                    console.log(' | ' + error);
                    nextConfigMap();
                });
                isFirstConfigMap = false;
            };
            nextConfigMap();
        }
        else {
            let backupFiles = cfgMaps[backupKey].files;
            let backupDirectory = cfgMaps[backupKey].directory;
            if (backupFiles.length <= 0)
                throw new Error(`Backup files for ${backupKey} is empty.`);
            if (!fs.existsSync(backupDirectory))
                throw new Error(`Backup directory does not exist: ${backupDirectory}`);
            SecureConfigurations_1.SecureConfigurations.Configure({ backupKey, backupFiles, backupDirectory, projectRoot });
            let CBs = {
                file: (isNew, isWrite, pathRelative) => {
                    console.log(preSpaceLine + (isWrite ? Symbols.success : Symbols.no_change) + " " + pathRelative);
                },
                error: (err) => {
                    console.log(preSpaceLine + 'Error: ' + err);
                },
                header: (isBackup = true) => {
                    return (mapKey, action) => {
                        mapKey = isBackup
                            ? chalk.bold.greenBright(mapKey)
                            : chalk.bold.blueBright(mapKey);
                        console.log(innerBreakHeader);
                        console.log(innerBreakHeaderLine + 'Map Key: ' + mapKey);
                        console.log(innerBreakHeaderLine + 'Action: ' + chalk.bold.greenBright(action));
                        console.log(innerBreakHeader);
                        console.log(preSpaceLine);
                    };
                }
            };
            isRestore
                ? SecureConfigurations_1.SecureConfigurations.Run.Restore(CBs.header(), CBs.file, CBs.error)
                : SecureConfigurations_1.SecureConfigurations.Run.Backup(CBs.header(true), CBs.file, CBs.error);
            console.log(preSpaceLine);
            console.log(preSpace);
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