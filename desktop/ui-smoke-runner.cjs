const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
fs.mkdirSync(path.join(__dirname,'../work'),{recursive:true});
const binary=process.env.CANGJING_ELECTRON_BINARY||require('electron');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(binary,[path.join(__dirname,'ui-smoke.cjs')],{env,windowsHide:true,stdio:'inherit'});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
