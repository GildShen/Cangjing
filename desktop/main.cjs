const {app,BrowserWindow,Menu,dialog,ipcMain,protocol,net,session,shell,clipboard,safeStorage}=require('electron');
const path=require('node:path');
const fs=require('node:fs/promises');
const {pathToFileURL}=require('node:url');
const {assetPath}=require('./paths.cjs');
const {AiService}=require('./ai-service.cjs');
const {ResearchQueue}=require('./research-queue.cjs');
const {TocQueue}=require('./toc-queue.cjs');
const {CopyRegistry,safeDirectory,projectId}=require('./copy-registry.cjs');
const {CliScheduler}=require('./cli-scheduler.cjs');
const {PageTasks}=require('./page-tasks.cjs');
const {KnowledgeQueue}=require('./knowledge-queue.cjs');
const {PluginHost}=require('./plugin-host.cjs');
const {SkillManager,text}=require('./skill-manager.cjs');
const origin='reader://app/index.html';
app.setName('藏經');
const verifyStartup=process.argv.includes('--verify-startup');
const verificationProfile=verifyStartup?fsSyncProfile():null;
function fsSyncProfile(){return require('node:fs').mkdtempSync(path.join(require('node:os').tmpdir(),'cangjing-package-check-'));}
const smoke=!app.isPackaged&&process.env.CANGJING_SMOKE==='1';
app.setPath('userData',verificationProfile||(smoke?path.join(__dirname,'.smoke-profile'):path.join(app.getPath('appData'),'CangjingReader')));
protocol.registerSchemesAsPrivileged(['reader','cangjing-plugin'].map(scheme=>({scheme,privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}})));
let window,ready=false;
const pending=[];
function enqueue(files){pending.push(...files);if(ready&&window&&!window.isDestroyed())window.webContents.send('books:available');}
function trusted(event){return window&&event.sender===window.webContents&&event.senderFrame===window.webContents.mainFrame&&event.senderFrame.url===origin;}
async function chooseFiles(){const result=await dialog.showOpenDialog(window,{title:'開啟研究文件',properties:['openFile','multiSelections'],filters:[{name:'PDF 文獻',extensions:['pdf']}]});if(!result.canceled)enqueue(result.filePaths);}
if(!app.requestSingleInstanceLock())app.quit();
else{
  function launchFiles(args,cwd=process.cwd()){const entries=args.slice(app.isPackaged?1:2).filter(a=>typeof a==='string'&&!a.startsWith('-')&&path.extname(a));enqueue(entries.map(a=>path.resolve(cwd,a)));}
  launchFiles(process.argv);
  app.on('second-instance',(_event,args,cwd)=>{launchFiles(args,cwd);if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
  app.on('open-file',(event,file)=>{event.preventDefault();enqueue([file]);});
  app.whenReady().then(async()=>{
    app.setAppUserModelId('local.cangjing.reader');
    const root=app.isPackaged?path.join(__dirname,'reader'):path.join(__dirname,'../ebook-browser');
    const plugins=new PluginHost(app.getPath('userData'),path.join(__dirname,app.isPackaged?'plugins/document-info':'../plugins/document-info'));
    await plugins.init();
    protocol.handle('cangjing-plugin',async request=>{try{return await plugins.response(request.url);}catch{return new Response('Plugin disabled or invalid',{status:403});}});
    protocol.handle('reader',request=>{try{return net.fetch(pathToFileURL(assetPath(root,request.url)).href);}catch{return new Response('Not found',{status:404});}});
    session.defaultSession.setPermissionRequestHandler((_contents,permission,callback)=>callback(permission==='fullscreen'));
    session.defaultSession.setPermissionCheckHandler((_contents,permission)=>permission==='fullscreen');
    session.defaultSession.webRequest.onHeadersReceived((details,callback)=>{
      const headers={...details.responseHeaders};
      if(details.url.startsWith('reader://app/'))headers['Content-Security-Policy']=["default-src 'self' data: blob:; script-src 'self'; frame-src 'self' blob: cangjing-plugin:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: blob: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' data: blob:; object-src 'none'; base-uri 'none'"];
      callback({responseHeaders:headers});
    });
    window=new BrowserWindow({width:1280,height:900,minWidth:620,minHeight:500,title:'藏經',icon:path.join(__dirname,'icon.png'),show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,sandbox:true,nodeIntegration:false,webSecurity:true,offscreen:smoke||verifyStartup,backgroundThrottling:!(smoke||verifyStartup)}});
    window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    window.webContents.on('will-navigate',(event,url)=>{if(url!==origin)event.preventDefault();});
    window.webContents.on('will-attach-webview',event=>event.preventDefault());
    window.webContents.on('did-start-navigation',(_event,_url,_inPlace,isMainFrame)=>{if(isMainFrame)ready=false;});
    window.once('ready-to-show',()=>{if(!smoke&&!verifyStartup)window.show();});
    const scheduler=new CliScheduler(),directory=app.getPath('userData');
    const skills=new SkillManager(directory,path.join(__dirname,app.isPackaged?'research-skills':'../research-skills'));await skills.init();
    const ai=new AiService(directory,{safeStorage,scheduler});
    const queue=new ResearchQueue(directory,{skills,service:new AiService(directory,{safeStorage,scheduler,priority:'background'})});
    const pageTasks=new PageTasks(directory,{skills,service:new AiService(directory,{safeStorage,scheduler})});
    const knowledge=new KnowledgeQueue(directory,{skills,service:new AiService(directory,{safeStorage,scheduler,priority:'background'})});
    const tocQueue=new TocQueue(directory,{skills,service:new AiService(directory,{safeStorage,scheduler})}),copies=new CopyRegistry(directory);await tocQueue.load();await copies.load();
    await knowledge.load();
    await pageTasks.load();
    await queue.load();
    const guard=event=>{if(!trusted(event))throw Error('Invalid sender');};
    const documentId=id=>{if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw Error('Invalid document ID');return id;};
    ipcMain.handle('toc:status',event=>{guard(event);return tocQueue.snapshot();});
    ipcMain.handle('toc:enqueue',(event,input)=>{guard(event);return tocQueue.enqueue(input);});
    ipcMain.handle('toc:cancel',(event,id)=>{guard(event);return tocQueue.cancel(documentId(id));});
    ipcMain.handle('toc:retry',(event,id)=>{guard(event);return tocQueue.retry(documentId(id));});
    ipcMain.handle('copies:status',event=>{guard(event);return copies.snapshot();});
    ipcMain.handle('copies:sync',(event,input)=>{guard(event);return copies.sync(input);});
    ipcMain.handle('copies:missing-sources',event=>{guard(event);return copies.missingSources();});
    ipcMain.handle('copies:begin-source',(event,id,size)=>{guard(event);return copies.beginSource(id,size);});
    ipcMain.handle('copies:source-chunk',(event,id,offset,bytes)=>{guard(event);return copies.sourceChunk(id,offset,bytes);});
    ipcMain.handle('copies:finish-source',(event,id)=>{guard(event);return copies.finishSource(id);});
    ipcMain.handle('copies:cancel-source',(event,id)=>{guard(event);return copies.cancelSource(id);});
    ipcMain.handle('copies:source-failed',(event,id,message)=>{guard(event);if(typeof message!=='string'||message.length>1000)throw Error('錯誤內容不合法');return copies.sourceFailed(id,message);});
    ipcMain.handle('copies:retry',(event,id)=>{guard(event);return copies.retry(projectId(id));});
    ipcMain.handle('copies:choose-folder',async(event,id)=>{guard(event);projectId(id);if(!copies.state.projects.some(p=>p.id===id))throw Error('找不到專案');const picked=await dialog.showOpenDialog(window,{title:'選擇專案 PDF 副本目錄',properties:['openDirectory']});if(picked.canceled)return copies.snapshot();const root=await safeDirectory(picked.filePaths[0]),jobs=copies.state.jobs.filter(j=>j.projectId===id&&j.desired),lines=[];let pendingCount=0,reused=0;for(const job of jobs){const candidate=await copies.candidate(root,job);candidate.reuse?reused++:pendingCount++;lines.push(candidate.name+(candidate.reuse?'（同內容重用）':'（待複製）'));}const result=await dialog.showMessageBox(window,{type:'question',title:'確認專案 PDF 副本',message:'此目錄有 '+pendingCount+' 份 PDF 待複製，'+reused+' 份可重用',detail:root.path+'\n\n'+lines.slice(0,40).join('\n')+(lines.length>40?'\n另有 '+(lines.length-40)+' 份':'')+'\n\n保留原始檔與旧副本；移除關聯或刪除文獻不刪除此目錄的檔案。此功能不是雙向同步。',buttons:['取消','確認目錄並補齊副本'],defaultId:0,cancelId:0});return result.response===1?copies.approve(id,root.path):copies.snapshot();});
    ipcMain.handle('copies:open-folder',async(event,id)=>{guard(event);const p=copies.state.projects.find(p=>p.id===projectId(id));const root=await copies.verifiedRoot(p);const error=await shell.openPath(root.path);if(error)throw Error('無法開啟副本目錄');return true;});
    ipcMain.handle('skills:status',event=>{guard(event);return skills.status();});
    ipcMain.handle('skills:change',(event,input)=>{guard(event);return skills.change(input);});
    ipcMain.handle('skills:import',async(event,kind)=>{guard(event);if(!['folder','zip'].includes(kind))throw Error('Skill 匯入格式不正確');const result=await dialog.showOpenDialog(window,{title:kind==='folder'?'匯入研究 Skill 資料夾':'匯入研究 Skill ZIP',properties:[kind==='folder'?'openDirectory':'openFile'],...(kind==='zip'?{filters:[{name:'研究 Skill',extensions:['zip']}]}:{})});if(result.canceled)return skills.status();const selected=result.filePaths[0];if(kind==='folder')return skills.install(selected);const st=await fs.lstat(selected);if(!st.isFile()||st.isSymbolicLink()||st.size>1024*1024)throw Error('請選擇小於 1 MB 的一般 ZIP 檔');return skills.install(await fs.readFile(selected));});
    ipcMain.handle('skills:import-rules',async event=>{guard(event);const result=await dialog.showOpenDialog(window,{title:'匯入共同研究規則',properties:['openFile'],filters:[{name:'Markdown 規則',extensions:['md']}]});if(result.canceled)return null;const selected=result.filePaths[0],st=await fs.lstat(selected);if(!st.isFile()||st.isSymbolicLink()||st.size>65536)throw Error('請選擇小於 64 KB 的一般 UTF-8 Markdown 檔');return {agents:text(await fs.readFile(selected)),normalized:path.basename(selected)!=='AGENTS.md'};});
    ipcMain.handle('knowledge:status',event=>{guard(event);return knowledge.snapshot();});
    ipcMain.handle('knowledge:configure',(event,value)=>{guard(event);return knowledge.configure(value);});
    ipcMain.handle('knowledge:enqueue',(event,input)=>{guard(event);return knowledge.enqueue(input);});
    ipcMain.handle('knowledge:cancel',(event,id)=>{guard(event);return knowledge.cancel(documentId(id));});
    ipcMain.handle('knowledge:retry',(event,id)=>{guard(event);return knowledge.retry(documentId(id));});
    ipcMain.handle('pages:status',event=>{guard(event);return pageTasks.snapshot();});
    ipcMain.handle('pages:enqueue',(event,input)=>{guard(event);return pageTasks.enqueue(input);});
    ipcMain.handle('pages:cancel',(event,id)=>{guard(event);if(typeof id!=='string'||id.length>64)throw Error('Invalid task ID');return pageTasks.cancel(id);});
    ipcMain.handle('pages:retry',(event,id)=>{guard(event);if(typeof id!=='string'||id.length>64)throw Error('Invalid task ID');return pageTasks.retry(id);});
    ipcMain.handle('research:pages',(event,id)=>{guard(event);return queue.jobs.find(j=>j.id===documentId(id))?.pages||null;});
    ipcMain.handle('plugins:list',event=>{guard(event);return plugins.list();});
    ipcMain.handle('plugins:enable',async(event,id,value)=>{guard(event);return plugins.enable(id,value);});
    ipcMain.handle('plugins:install',async event=>{guard(event);const result=await dialog.showOpenDialog(window,{title:'安裝本機外掛資料夾',properties:['openDirectory']});return result.canceled?plugins.list():plugins.install(result.filePaths[0]);});
    ipcMain.handle('plugins:rpc',async(event,input)=>{guard(event);if(!input||typeof input!=='object'||typeof input.id!=='string'||typeof input.method!=='string')throw Error('Invalid plugin RPC');return plugins.rpc(input.id,input.method,input.args);});
    ipcMain.handle('research:status',event=>{guard(event);return queue.snapshot();});
    ipcMain.handle('research:check',async event=>{guard(event);return queue.service.checkCli();});
    ipcMain.handle('research:configure',async(event,enabled)=>{guard(event);return queue.configure(enabled);});
    ipcMain.handle('research:enqueue',async(event,input)=>{guard(event);if(!queue.enabled)throw Error('請先啟用自動分析');return queue.enqueue(input);});
    ipcMain.handle('research:cancel',async(event,id)=>{guard(event);return queue.cancel(documentId(id));});
    ipcMain.handle('research:retry',async(event,id)=>{guard(event);return queue.retry(documentId(id));});
    ipcMain.handle('research:forget',async(event,id)=>{guard(event);documentId(id);await pageTasks.forget(id);await knowledge.forget(id);await tocQueue.forget(id);return queue.forget(id);});
    ipcMain.handle('backup:research',event=>{guard(event);return {jobs:queue.jobs,pageTasks:pageTasks.tasks,knowledgeJobs:knowledge.jobs,researchHistory:queue.history,knowledgeHistory:knowledge.history,skills:skills.status(),tocJobs:tocQueue.jobs,tocHistory:tocQueue.history,copies:copies.snapshot()};});
    ipcMain.handle('backup:restore-research',async(event,data)=>{guard(event);if(!data||typeof data!=='object')throw Error('備份分析資料不正確');const skillState=data.skills?skills.prepareRestore(data.skills):skills.state,tasks=pageTasks.prepareRestore(data.pageTasks||[]),graphs=knowledge.prepareRestore(data.knowledgeJobs||[]),graphHistory=(data.knowledgeHistory||[]).flatMap(old=>knowledge.prepareRestore([old]));if(!Array.isArray(data.knowledgeHistory||[])||(data.knowledgeHistory||[]).length>10000)throw Error('知識圖歷史備份不正確');if(!Array.isArray(data.tocHistory||[])||(data.tocHistory||[]).length>10000)throw Error('AI 目錄歷史備份不正確');const tocJobs=tocQueue.prepareRestore(data.tocJobs||[]),tocHistory=(data.tocHistory||[]).flatMap(j=>tocQueue.prepareRestore([j])),copyState=copies.prepare(data.copies||{version:1,projects:[],documents:{},jobs:[]},true);if(knowledge.active||pageTasks.active||tocQueue.active||copies.active)throw Error('請先停止研究工作再還原');await queue.restore(data);tocQueue.jobs=tocJobs;tocQueue.history=tocHistory;await tocQueue.save();await copies.restore(copyState);pageTasks.tasks=tasks;knowledge.jobs=graphs;knowledge.history=graphHistory;knowledge.enabled=false;skills.state=skillState;await skills.save();await pageTasks.save();await knowledge.save();return queue.snapshot();});
    ipcMain.handle('backup:save',async(event,bytes)=>{guard(event);if(!(bytes instanceof Uint8Array)||bytes.byteLength>1024*1024*1024)throw Error('備份過大或格式不正確');const result=await dialog.showSaveDialog(window,{title:'儲存藏經備份',defaultPath:'Cangjing-backup.zip',filters:[{name:'藏經備份',extensions:['zip']}]});if(result.canceled)return false;await fs.writeFile(result.filePath,bytes);return true;});
    ipcMain.handle('backup:open',async event=>{guard(event);const result=await dialog.showOpenDialog(window,{title:'選擇藏經備份',properties:['openFile'],filters:[{name:'藏經備份',extensions:['zip']}]});if(result.canceled)return null;const stat=await fs.stat(result.filePaths[0]);if(!stat.isFile()||stat.size>1024*1024*1024)throw Error('備份超過 1 GB');return fs.readFile(result.filePaths[0]);});
    ipcMain.handle('ai:run',async(event,request)=>{guard(event);try{if(request?.action==='custom')throw Error('請由多頁研究送出自訂指令');return {ok:true,...await ai.run({action:request?.action,text:request?.text})};}catch(error){return {ok:false,error:error.message,usage:error.usage||null};}});
    ipcMain.handle('ai:cancel',event=>{guard(event);return ai.cancel();});
    ipcMain.handle('ai:copy',(event,text)=>{guard(event);if(typeof text!=='string'||text.length>200000)throw Error('Invalid text');clipboard.writeText(text);});
    ipcMain.handle('ai:check',event=>{guard(event);return ai.check();});
    ipcMain.handle('ai:info',event=>{guard(event);return ai.info();});
    ipcMain.handle('ai:configure',async(event,change)=>{guard(event);if(typeof change==='string')change={model:change};if(!change||typeof change!=='object'||Array.isArray(change))throw Error('Invalid settings');const allowed={};for(const key of ['provider','model','apiModel','apiKey','removeKey'])if(Object.hasOwn(change,key))allowed[key]=change[key];await ai.configure(allowed);return ai.check();});
    ipcMain.handle('ai:choose-cli',async event=>{guard(event);const result=await dialog.showOpenDialog(window,{title:'選擇 Codex CLI',filters:[{name:'Codex 執行檔',extensions:['exe']}],properties:['openFile']});if(!result.canceled)await ai.configure({cliPath:result.filePaths[0]});return ai.check();});
    window.on('closed',()=>{ai.cancel();queue.stop();pageTasks.stop();knowledge.stop();tocQueue.stop();copies.stop();});
    window.webContents.on('did-start-navigation',(_event,_url,_inPlace,isMainFrame)=>{if(isMainFrame)ai.cancel();});
    ipcMain.handle('books:ready',event=>{if(!trusted(event))throw new Error('Invalid sender');ready=true;if(pending.length)window.webContents.send('books:available');});
    ipcMain.handle('books:next',async event=>{
      if(!trusted(event))throw new Error('Invalid sender');
      const file=pending.shift();if(!file)return null;
      try{if(path.extname(file).toLowerCase()!=='.pdf')throw new Error('藏經只支援 PDF 文獻');const stat=await fs.stat(file);if(!stat.isFile())throw new Error('這不是 PDF 檔案');if(stat.size>1024*1024*1024)throw new Error('檔案超過 1 GB');const bytes=await fs.readFile(file);app.addRecentDocument(file);return {name:path.basename(file),bytes};}
      catch(error){return {name:path.basename(file),error:error.message};}
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {label:'檔案',submenu:[{label:'開啟 PDF 文獻…',accelerator:'CmdOrCtrl+O',click:chooseFiles},{label:'設定預設閱讀器',click:()=>shell.openExternal('ms-settings:defaultapps')},{type:'separator'},{role:'quit',label:'結束'}]},
      {label:'編輯',submenu:[{role:'copy',label:'複製'},{role:'selectAll',label:'全選'}]},
      {label:'檢視',submenu:[{role:'togglefullscreen',label:'全螢幕'},{role:'reload',label:'重新載入'}]},
      {label:'說明',submenu:[{label:'關於藏經',click:()=>dialog.showMessageBox(window,{title:'藏經',message:'藏經 '+app.getVersion(),detail:'PDF 研究文獻閱讀器\n文件庫位置：'+app.getPath('userData')})}]}
    ]));
    await window.loadURL(origin);
    if(verifyStartup){
      const result=await window.webContents.executeJavaScript("(async()=>{for(let n=0;n<100&&!window.libraryReady;n++)await new Promise(r=>setTimeout(r,50));return {title:document.title,ready:window.libraryReady===true,modules:!!(window.ImradReading&&window.StudyBackgrounds&&window.PdfWheel&&window.DocumentSummary&&window.SummaryUI&&window.TocUI&&window.ProjectCopies),bridge:!!window.desktopReader,empty:(await LibraryStore.all()).length===0,copies:(await desktopReader.copiesStatus()).jobs.length,toc:(await desktopReader.tocStatus()).jobs.length,node:typeof require,summary:!!document.querySelector('#document-summary'),defaultSkill:(await desktopReader.skillsStatus()).defaults.research}})()");
      const passed=result.ready&&result.modules&&result.bridge&&result.empty&&result.summary&&result.node==='undefined'&&result.copies===0&&result.toc===0&&result.defaultSkill==='imrad-reading';
      console.log(JSON.stringify({verification:'packaged-startup',packaged:app.isPackaged,version:app.getVersion(),isolatedProfile:verificationProfile,...result,passed}));app.exit(passed?0:1);
    }
  }).catch(error=>{if(verifyStartup){console.error(error.stack);app.exit(1);}else{dialog.showErrorBox('藏經啟動失敗',error.message);app.quit();}});
  app.on('window-all-closed',()=>app.quit());
}
