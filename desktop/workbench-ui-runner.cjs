'use strict';
const {spawn}=require('node:child_process'),path=require('node:path');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(process.env.CANGJING_ELECTRON_BINARY||require('electron'),[path.join(__dirname,'workbench-ui.cjs')],{env,windowsHide:true,stdio:'inherit'});
child.on('error',e=>{console.error(e);process.exitCode=1;});child.on('exit',code=>process.exitCode=code??1);
