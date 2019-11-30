"use strict";

const glob = require("glob");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const figures = require('figures');
const chalk = require("chalk");

let Symbols: any = {
    error: chalk.redBright(figures.cross),
    warning: chalk.yellowBright(figures.warning),
    success: chalk.greenBright(figures.tick),
    no_change: chalk.green(figures.hamburger),
    backup: chalk.cyan(figures.arrowRight),
    restore: chalk.cyan(figures.arrowLeft)
};

export namespace SecureConfigurations {
    export namespace Interfaces {
        export namespace Configuration {
            export interface All {
                integrityAlgorithm: string,
                isDefaultBackupKey: boolean,
                projectRoot: string,
                backupKey: string,
                backupDirectory: string,
                backupFiles: string[]
            }
            export interface Merge {
                integrityAlgorithm?: string,
                isDefaultBackupKey?: boolean,
                projectRoot?: string,
                backupKey: string,
                backupDirectory: string,
                backupFiles: string[]
            }
        }
    }

    let integrityAlgorithm = "sha1";
    let projectRoot = __dirname;
    while(!fs.existsSync(path.join(projectRoot, "package.json"))){
        projectRoot = path.join(projectRoot, "..");
    }

    let configuration: Interfaces.Configuration.All = {
        integrityAlgorithm,
        isDefaultBackupKey: false,
        projectRoot,
        backupKey: "prod",
        backupDirectory: "__MISSING__",
        backupFiles: []
    };

    export const Configure = (to: Interfaces.Configuration.Merge) => {
        Object.keys(to).forEach(k => {
            if(to.hasOwnProperty(k))
                    // @ts-ignore
                    configuration[k] = to[k];
        });
    };
    
    export namespace Run {
        const IterateFiles = (from: string, to: string,
                              cbFile: (fileRead: string, fileWrite: string, fileRelative: string) => void,
                              cbIsGlob?: (readGlob: string) => void,
                              cbError?: (error: any) => void,
                              afterEachFile?: () => void
        ) => {
            let readBase = path.resolve(from, '.');
            let writeBase = path.resolve(to, '.');

            if(typeof cbIsGlob !== "function") cbIsGlob = (readGlob) => {};
            if(typeof cbError !== "function") cbError = (error) => {};
            if(typeof afterEachFile !== "function") afterEachFile = () => {};

            for(let file of configuration.backupFiles){
                let read = path.join(from, file);
                let write = path.join(to, file);
                if(!fs.existsSync(read)){
                    let globCheck = glob.sync(read);
                    if(globCheck.length > 0) {
                        cbIsGlob(read);
                        for (let readGlob of globCheck){
                            readGlob = path.resolve(readGlob, '.');
                            let writeGlob = writeBase+readGlob.replace(readBase, "");
                            cbFile(readGlob, writeGlob, readGlob.replace(readBase, "").substr(1));
                        }
                    } else
                        cbError('File does not exist ('+read+')');
                }else
                    cbFile(read, write, write.replace(writeBase, "").substr(1));
                afterEachFile();
            }
        };

        const Program = (
            action: string, from: string, to: string,
            preSpace: string = ' | ',
            innerBreakHeader: string = '++============',
            innerBreakHeaderLine: string = '| ',
            innerBreak: string = ' +----------------------------'
        ) => {
            let cfg = configuration;
            if(cfg.backupDirectory === "__MISSING__")
                throw new Error("Backup directory is missing.");

            let runCopy = (read: string, write: string) => {
                if(!fs.existsSync(path.dirname(write)))
                    fs.mkdirSync(path.dirname(write), {recursive:true});

                let newFile = !fs.existsSync(write) || integrityHashFile(read) !== integrityHashFile(write);
                if(newFile)
                    fs.copyFileSync(read, write); // should never error since the directory is created above.

                let readCore = read.replace(path.resolve(from, "."), "").substr(1);

                console.log(preSpace+(newFile?Symbols.success:Symbols.no_change)+" "+readCore);
            };

            console.log(innerBreakHeader);
            console.log(innerBreakHeaderLine+'Env: '+chalk.bold.blueBright(cfg.backupKey));
            console.log(innerBreakHeaderLine+'Action: '+chalk.bold.greenBright(action));
            console.log(innerBreakHeader);

            IterateFiles(from, to, runCopy, read => {
                console.log(preSpace+'> Glob: ' + read);
                console.log(preSpace+'> From: ' + from);
                console.log(preSpace+'>   To: ' + to);
                console.log(preSpace);
            }, (err) => {
                console.log(preSpace+'Error: '+err);
            }, () => {
                console.log(innerBreak);
            });
        };

        const integrityHashFile = (fileSrc: string): string => {
            let cfg = configuration;
            if(!fs.existsSync(fileSrc)) return "";
            const h = crypto.createHash(cfg.integrityAlgorithm);
            h.setEncoding("hex");
            h.write(fs.readFileSync(fileSrc, "utf8")); // TODO: build encoding detection in.
            h.end();
            return h.read();
        };

        export const Integrity = (
            preSpace: string = ' | ',
            innerBreak: string = ' +----------------------------'
        ) => {
            let fileChecks: any = {};
            let cfg = configuration;
            let backupKey = cfg.backupKey;

            IterateFiles(cfg.backupDirectory, cfg.projectRoot, (fileRead, fileWrite, fileRelative) => {
                fileChecks[fileRelative] = {
                    backup: fileRead,
                    backupHash: integrityHashFile(fileRead),
                    restore: fileWrite,
                    restoreHash: integrityHashFile(fileWrite)
                };
            });

            IterateFiles(cfg.projectRoot, cfg.backupDirectory, (fileRead, fileWrite, fileRelative) => {
                if(!fileChecks.hasOwnProperty(fileRelative))
                    fileChecks[fileRelative] = {
                        backup: fileWrite,
                        backupHash: integrityHashFile(fileWrite),
                        restore: fileRead,
                        restoreHash: integrityHashFile(fileRead)
                    };
            });

            let sortKeys = Object.keys(fileChecks);

            if(sortKeys.length === 0){
                console.log(preSpace+"No Files Found?");
            }else{
                let commandsRunning: string[] = [];
                for(let key of sortKeys){
                    let n = fileChecks[key];
                    let pass = n.backupHash === n.restoreHash;
                    if(!pass){
                        let backupM = fs.existsSync(n.backup)?fs.statSync(n.backup).mtime:-1;
                        let restoreM = fs.existsSync(n.restore)?fs.statSync(n.restore).mtime:-1;

                        let missingBackup = backupM < 0;
                        let missingRestore = restoreM < 0;

                        let a: string[] = [];

                        if(missingBackup) a.push("("+Symbols.warning+" Missing on Backup)");
                        if(missingRestore) a.push("("+Symbols.warning+" Missing on Restore)");

                        let shouldBackup = backupM < restoreM;
                        let recommendFlag = shouldBackup
                            ?"backup"
                            :"restore";
                        let symbolAction = shouldBackup
                            ?Symbols.backup
                            :Symbols.restore;

                        if(!missingBackup && !missingRestore){
                            a.push(
                                shouldBackup
                                    ?chalk.blueBright("(Backup)")
                                    :chalk.greenBright("(Restore)")
                            );
                        }

                        if(a.length > 0)
                            a.unshift("");

                        console.log(preSpace+symbolAction+" "+key+(a.join(" ")));

                        let commandM = configuration.isDefaultBackupKey?"":` -m ${backupKey}`;
                        let commandRun = `secure-configurations${commandM} --${recommendFlag}`;
                        if(commandsRunning.indexOf(commandRun) < 0)
                            commandsRunning.push(commandRun);
                    }else
                        console.log(preSpace+Symbols.success+" "+key);
                }
                if(commandsRunning.length > 1){
                    console.log(preSpace);
                    console.log(preSpace+'Recommended: Manual Check - Configs seem to need to be backed up and restored.');
                    console.log(preSpace);
                    console.log(innerBreak);
                }else if(commandsRunning.length === 1){
                    console.log(preSpace);
                    console.log(preSpace+commandsRunning[0]);
                    console.log(preSpace);
                    console.log(innerBreak);
                }
            }
        };
        export const Restore = () => Program("restore", configuration.backupDirectory, configuration.projectRoot);
        export const Backup = () => Program("backup", configuration.projectRoot, configuration.backupDirectory);
    }
}
