"use strict";

const path = require("path");
const fs = require("fs");
const program = require('commander');
const enquirer = require('enquirer');

class SecureConfigurations {
  constructor(
      configBackup,
      backupDirectories,
      readDirectory,
      configurationFiles
  ){
    this.configBackup = configBackup;
    this.backupDirectory = backupDirectories[configBackup];
    this.readDirectory = readDirectory;
    this.configurationFiles = configurationFiles;
    this.action = '';
  }

  __createFolder(filepath){
    fs.mkdirSync(path.dirname(filepath), {recursive:true});
  }

  _transfer(from, to){
    let configStr = this.configBackup.toUpperCase();
    console.log('+------------------------------');
    console.log('|| Env: '+configStr);
    console.log('|| Action: '+this.action);
    console.log('+------------------------------');
    for(let file of this.configurationFiles){
      let read = path.join(from, file);
      let write = path.join(to, file);
      if(!fs.existsSync(read))
        console.log('| Error: File does not exist ('+read+')');
      else{
        this.__createFolder(write);
        fs.copyFileSync(read, write);
        console.log('| File: '+read);
        console.log('| \ TO: '+write);
      }
      console.log('+------------------------------');
    }
  }

  program(action){
    this.action = action;
    let configStr = this.configBackup.toUpperCase();
    program
        .description("SecureFiles / "+configStr+" / "+action)
        .option('-f, --force-run', 'Ignore verification of backup/restore.')
    ;

    program.parse(process.argv);

    return new Promise((resolve, reject) => {
      if(!program.forceRun){
        new enquirer.Confirm({
          name: 'question',
          message: `[ ${configStr} // ${action} ]`})
            .run()
            .then(response => response
                ?resolve()
                :reject())
            .catch(reject)
        ;
      }else
        resolve();
    });
  }

  backup(){
    this.program('Backing Up')
        .then(() => this._transfer(this.readDirectory, this.backupDirectory))
        .catch(() => {});
  }
  restore(){
    this.program('Restoring')
        .then(() => this._transfer(this.backupDirectory, this.readDirectory))
        .catch(() => {});
  }
}

module.exports = SecureConfigurations;
