#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Backup = Green (to backup)
// Restore = Blue (from backup)
const child_process_1 = require("child_process");
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
function FancyError(message, exitCode = 1) {
    message = '  ' + message + '  ';
    const line = ' '.repeat(message.length);
    console.log(chalk.bgRed(line));
    console.log(chalk.bgRed(message));
    console.log(chalk.bgRed(line));
    process.exit(exitCode);
}
if (!pkg.hasOwnProperty("secure-configurations"))
    FancyError("Your package.json is missing the `secure-configurations` entry.");
let cfgBase = pkg["secure-configurations"];
if (!cfgBase.hasOwnProperty("maps") || Object.keys(cfgBase.maps).length === 0)
    FancyError("Your package.json `secure-configurations` `maps` key is missing (or empty).");
let cfgMaps = cfgBase.maps;
let mapKeys = Object.keys(cfgMaps);
let mapDefault = mapKeys[0];
let Symbols = {
    error: chalk.redBright(figures.cross),
    warning: chalk.yellowBright(figures.warning),
    success: chalk.greenBright(figures.tick),
    is_new: chalk.blueBright('+'),
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
    .option("-z, --recommended", "Run recommended backup/restores if possible on integrity check.")
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
let runRecommended = program.recommended || false;
let showDiff = program.showDiff || false;
let showUnchangedDiff = program.showUnchangedDiff || false;
// let fileDiff = program.fileDiff || false;
// let filterDiff = program.filterDiff || false;
if (isBackup && isRestore)
    FancyError("Cannot backup and restore at same time.");
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
let actionTag = (isBackup, fancy = true) => isBackup
    ? chalk.greenBright(fancy ? "Backup" : "backup")
    : chalk.blueBright(fancy ? "Restore" : "restore");
let runCommands = [];
let innerBreakHeader = '++============';
let innerBreakHeaderLine = '|| ';
let preSpace = ' +------------';
let preSpaceLine = ' | ';
const runCommandsAfter = () => {
    if (runCommands.length === 0) {
        console.log(preSpace);
        return;
    }
    else {
        let next = runCommands.shift();
        child_process_1.exec(next, (error, stdout, stderr) => {
            console.log(preSpaceLine + (error ? Symbols.error : Symbols.success) + ' ' + next);
            runCommandsAfter();
        });
    }
};
let runCode = (hasPermission) => {
    if (hasPermission) {
        if (isIntegrity) {
            let configMapKeys = Object.keys(cfgMaps);
            let isFirstConfigMap = true;
            let nextConfigMap = () => {
                if (configMapKeys.length === 0) {
                    console.log(preSpace);
                    if (runRecommended && runCommands.length > 0)
                        runCommandsAfter();
                    return;
                }
                if (!isFirstConfigMap)
                    console.log(' ');
                else
                    isFirstConfigMap = false;
                let backupKeyInner = configMapKeys.shift();
                let backupFiles = cfgMaps[backupKeyInner].files;
                let backupDirectory = cfgMaps[backupKeyInner].directory;
                if (backupFiles.length <= 0)
                    FancyError(`Backup files for ${backupKeyInner} is empty.`);
                if (!fs.existsSync(backupDirectory))
                    FancyError(`Backup directory does not exist: ${backupDirectory}`);
                console.log(innerBreakHeader);
                console.log(innerBreakHeaderLine + 'Map Key: ' + chalk.bold.blueBright(backupKeyInner));
                console.log(innerBreakHeader);
                console.log(preSpaceLine);
                let Opts = { backupKey: backupKeyInner, backupFiles, backupDirectory, projectRoot };
                SecureConfigurations_1.SecureConfigurations.Configure(Opts);
                SecureConfigurations_1.SecureConfigurations.Run.Integrity(integritys => {
                    let maxFileRelativeLen = integritys.files.map(v => v.fileRelative.length).sort((a, b) => (a - b)).reverse()[0];
                    for (let f of integritys.files) {
                        let extra = '';
                        let relLen = f.fileRelative.length;
                        let noBackup = !f.backup.lastModified && f.project.lastModified;
                        let noRestore = f.backup.lastModified && !f.project.lastModified;
                        let missingDetected = noBackup || noRestore;
                        let changeDetected = f.diff || missingDetected;
                        if (changeDetected) {
                            let isBackup = false;
                            if (f.diff && f.backup.lastModified < f.project.lastModified ||
                                !f.diff && noBackup)
                                isBackup = true;
                            extra = ((relLen === maxFileRelativeLen) ? "" : (" ".repeat((maxFileRelativeLen - relLen))))
                                + ` (${actionTag(isBackup) + (missingDetected ? chalk.redBright(' // Missing') : '')})`;
                        }
                        let symbolMe = changeDetected
                            ? Symbols.error
                            : Symbols.no_change;
                        console.log(` | ${symbolMe} ` + f.fileRelative + extra);
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
                        console.log(preSpaceLine + 'Recommended: Manual Check - Configs require backup and restore.');
                        console.log(preSpaceLine);
                    }
                    else if (integritys.recommendedActions.length === 1) {
                        console.log(preSpaceLine);
                        let configExtras = [];
                        if (program.config) {
                            configExtras = program.config.map((v) => (`--config ${v}`));
                            configExtras.unshift("");
                        }
                        const runCommand = `secure-configurations --map-key ${backupKeyInner} --${integritys.recommendedActions[0]}${configExtras.join(" ")}`;
                        console.log(preSpaceLine + runCommand);
                        if (runRecommended)
                            runCommands.push(runCommand + ' -f');
                        console.log(preSpaceLine);
                    }
                    else
                        console.log(preSpaceLine);
                    nextConfigMap();
                }, error => {
                    console.log(' | ' + error);
                    console.log(preSpaceLine);
                    console.log(preSpace);
                    nextConfigMap();
                });
            };
            // First Run
            nextConfigMap();
        }
        else {
            let backupFiles = cfgMaps[backupKey].files;
            let backupDirectory = cfgMaps[backupKey].directory;
            if (backupFiles.length <= 0)
                FancyError(`Backup files for ${backupKey} is empty.`);
            if (!fs.existsSync(backupDirectory))
                FancyError(`Backup directory does not exist: ${backupDirectory}`);
            SecureConfigurations_1.SecureConfigurations.Configure({ backupKey, backupFiles, backupDirectory, projectRoot });
            let CBs = {
                file: (isNew, isWrite, pathRelative) => {
                    if (isWrite)
                        console.log(preSpaceLine + (isNew ? Symbols.is_new : Symbols.success) + " " + pathRelative);
                },
                error: (err) => {
                    console.log(preSpaceLine + 'Error: ' + err);
                },
                header: (isBackup = true) => {
                    return (mapKey, action) => {
                        console.log(innerBreakHeader);
                        console.log(innerBreakHeaderLine + 'Map Key: ' + chalk.bold.blueBright(mapKey));
                        console.log(innerBreakHeaderLine + 'Action: ' + actionTag(isBackup));
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
    FancyError(`Map Key: ${backupKey} not found`);
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