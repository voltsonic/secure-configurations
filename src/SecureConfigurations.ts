"use strict";

const glob = require("glob");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const Diff = require("diff");

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
                integrityAlgorithm?: string,
                projectRoot?: string,
                backupKey: string,
                backupDirectory: string,
                backupFiles: string[]
            }
        }
        export namespace Integrity {
            export interface DiffInterface {
                count: number,
                value: string,
                added?: true,
                removed?: true
            }
            export interface IntegrityItemInterface {
                fileRelative: string,
                backup: {
                    file: string,
                    hash: string,
                    lastModified: null|number,
                    missing: boolean,
                },
                diff?: DiffInterface[],
                project: {
                    file: string,
                    hash: string,
                    lastModified: null|number,
                    missing: boolean,
                }
            }

            export interface IntegrityInterface {
                recommendedActions: string[],
                files: IntegrityItemInterface[]
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
        type CallbackHeader = (mapKey: string, action: string) => void;
        type CallbackFile = (isNew: boolean, isWrite: boolean, pathRelative: string) => void;
        type CallbackError = (error: any) => void;

        const IterateFiles = (from: string, to: string,
                              cbFile: (fileRead: string, fileWrite: string, fileRelative: string) => void,
                              cbError?: CallbackError) => {
            let readBase = path.resolve(from, '.');
            let writeBase = path.resolve(to, '.');

            if(typeof cbError !== "function") cbError = (error) => {};

            let scanFiles = [];

            for(let file of configuration.backupFiles){
                let read = path.join(from, file);
                let write = path.join(to, file);
                if(!fs.existsSync(read)){
                    let globCheck = glob.sync(read);
                    if(globCheck.length > 0) {
                        for (let readGlob of globCheck){
                            readGlob = path.resolve(readGlob, '.');
                            let writeGlob = writeBase+readGlob.replace(readBase, "");
                            scanFiles.push([readGlob, writeGlob, readGlob.replace(readBase, "").substr(1)]);
                        }
                    } else
                        cbError('File does not exist ('+read+')');
                }else
                    scanFiles.push([read, write, write.replace(writeBase, "").substr(1)]);
            }

            scanFiles.sort((a: any, b: any) => a[2].localeCompare(b[2]));

            for(let pta of scanFiles){
                cbFile(pta[0], pta[1], pta[2]);
            }
        };

        const Program = (
            cbHeader: CallbackHeader,
            cbFile: CallbackFile,
            action: string, from: string, to: string,
            cbError?: CallbackError
        ) => {
            let cfg = configuration;
            if(cfg.backupDirectory === "__MISSING__")
                throw new Error("Backup directory is missing.");

            let runCopy = (read: string, write: string) => {
                if(!fs.existsSync(path.dirname(write)))
                    fs.mkdirSync(path.dirname(write), {recursive:true});

                let isNew = !fs.existsSync(write);
                let newFile = isNew || integrityHashFile(read) !== integrityHashFile(write);
                if(newFile)
                    fs.copyFileSync(read, write); // should never error since the directory is created above.

                cbFile(isNew, newFile, read.replace(path.resolve(from, "."), "").substr(1));
            };

            cbHeader(cfg.backupKey, action);

            IterateFiles(from, to, runCopy, cbError);
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
            cbIntegrity: (integritys: Interfaces.Integrity.IntegrityInterface) => void,
            cbRejected: (error: string) => void
        ) => {
            let fileChecks: any = {};
            let cfg = configuration;

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

            let sortKeys = Object.keys(fileChecks).sort();

            if(sortKeys.length === 0)
                cbRejected("No files found with current configuration.");
            else{
                let r: Interfaces.Integrity.IntegrityInterface = {
                    recommendedActions: [],
                    files: []
                };

                let nextSortKey = () => {
                    if(sortKeys.length === 0){
                        r.files.sort((
                            a: Interfaces.Integrity.IntegrityItemInterface,
                            b: Interfaces.Integrity.IntegrityItemInterface) => a.fileRelative.localeCompare(b.fileRelative));
                        cbIntegrity(r);
                        return;
                    }

                    let key = sortKeys.shift();

                    let n = fileChecks[key];
                    let pass = n.backupHash === n.restoreHash;

                    let backupM = fs.existsSync(n.backup)?fs.statSync(n.backup).mtime:null;
                    let restoreM = fs.existsSync(n.restore)?fs.statSync(n.restore).mtime:null;

                    r.files.push({
                        fileRelative: key,
                        backup: {
                            file: n.backup,
                            hash: n.backupHash,
                            lastModified: backupM,
                            missing: !backupM,
                        },
                        project: {
                            file: n.restore,
                            hash: n.restoreHash,
                            lastModified: restoreM,
                            missing: !restoreM,
                        }
                    });

                    let meIndex = (r.files.length - 1);

                    if(!pass){
                        if(!backupM) backupM = -1;
                        if(!restoreM) restoreM = -1;

                        let recommendedAction = (backupM < restoreM)?"backup":"restore";
                        if(r.recommendedActions.indexOf(recommendedAction) < 0)
                            r.recommendedActions.push(recommendedAction);
                    }

                    if(!r.files[meIndex].backup.missing && !r.files[meIndex].project.missing && !pass){
                        r.files[meIndex].diff = Diff.diffLines(
                            fs.readFileSync(r.files[meIndex].backup.file, "utf8"),
                            fs.readFileSync(r.files[meIndex].project.file, "utf8"));
                    }

                    nextSortKey();
                };

                nextSortKey();
            }
        };

        export const Restore = (cbHeader: CallbackHeader, cbFile: CallbackFile, cbError?: CallbackError) =>
                Program(cbHeader, cbFile, "restore", configuration.backupDirectory, configuration.projectRoot, cbError);

        export const Backup = (cbHeader: CallbackHeader, cbFile: CallbackFile, cbError?: CallbackError) =>
                Program(cbHeader, cbFile, "backup", configuration.projectRoot, configuration.backupDirectory, cbError);
    }
}
