"use strict";

const glob = require("glob");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const logSymbols = require('log-symbols');

export namespace SecureConfigurations {
    export namespace Interfaces {
        export namespace Configuration {
            export interface All {
                integrityAlgorithm: string,
                projectRoot: string,
                backupKey: string,
                backupDirectory: string,
                backupFiles: string[]
            }
            export interface Merge {
                projectRoot?: string,
                integrityAlgorithm?: string,
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

        const Program = (action: string, from: string, to: string) => {
            let cfg = configuration;
            if(cfg.backupDirectory === "__MISSING__")
                throw new Error("Backup directory is missing.");

            let runCopy = (read: string, write: string) => {
                fs.mkdirSync(path.dirname(write), {recursive:true});
                try{
                    fs.copyFileSync(read, write);
                }catch(e){
                    console.log("e", e);
                }
                console.log('| File: '+read);
                console.log('| \\ To: '+write);
            };

            console.log('+------------------------------');
            console.log('|| Env: '+cfg.backupKey.toLocaleLowerCase());
            console.log('|| Action: '+action);
            console.log('+------------------------------');

            IterateFiles(from, to, runCopy, read => {
                console.log('|> Glob: ' + read);
                console.log('|');
            }, (err) => {
                console.log('| Error: '+err);
            }, () => {
                console.log('+------------------------------');
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
                let maxKeyLen: number = sortKeys.sort((a: string, b: string) => (b.length - a.length))[0].length;
                console.log(preSpace);
                for(let key of sortKeys){
                    let n = fileChecks[key];
                    let pass = n.backupHash === n.restoreHash;
                    if(!pass){
                        let backupM = fs.existsSync(n.backup)?fs.statSync(n.backup).mtime:-1;
                        let restoreM = fs.existsSync(n.restore)?fs.statSync(n.restore).mtime:-1;

                        let missingBackup = backupM < 0;
                        let missingRestore = restoreM < 0;

                        let a: string[] = [];

                        if(missingBackup) a.push("("+logSymbols.warning+" Missing on Backup)");
                        if(missingRestore) a.push("("+logSymbols.warning+" Missing on Restore)");

                        if(a.length > 0)
                            a.unshift("");

                        let spaces = maxKeyLen - key.length;
                        console.log(preSpace+logSymbols.error+" "+key+(spaces>0?(" ".repeat(spaces)):"")+(a.join(" ")));

                        let shouldBackup = backupM < restoreM;
                        let recommendFlag = shouldBackup
                            ?"backup"
                            :"restore";

                        if(!missingBackup && !missingRestore){
                            console.log(preSpace+' Backup: '+(shouldBackup?logSymbols.warning:logSymbols.success)+' '+n.backup+' @ '+backupM);
                            console.log(preSpace+'Project: '+(shouldBackup?logSymbols.success:logSymbols.warning)+' '+n.backup+' @ '+restoreM);
                            console.log(innerBreak);
                        }

                        let commandRun = `secure-configurations -m ${backupKey} --${recommendFlag}`;
                        if(commandsRunning.indexOf(commandRun) < 0)
                            commandsRunning.push(commandRun);
                    }else
                        console.log(preSpace+logSymbols.success+" "+key);
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
        export const Restore = () => Program("Restoring", configuration.backupDirectory, configuration.projectRoot);
        export const Backup = () => Program("Backing Up", configuration.projectRoot, configuration.backupDirectory);
    }
}
