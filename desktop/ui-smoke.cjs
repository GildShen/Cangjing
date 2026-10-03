const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const errors=[];
app.on('web-contents-created',(_event,contents)=>contents.on('console-message',details=>{if(details.level==='error')errors.push(details.message);}));
setTimeout(()=>{console.error('UI smoke test timed out');app.exit(1);},45000).unref();
process.env.CANGJING_SMOKE='1';
const originalSetPath=app.setPath.bind(app);app.setPath=(key,value)=>originalSetPath(key,key==='userData'?path.join(__dirname,'../work/.smoke-profile-'+process.pid):value);
require('./main.cjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function pdf(){
 const stream='BT /F1 16 Tf 60 740 Td (Research evidence sample.) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
 let s='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(s));s+=`${i+1} 0 obj\n${o}\nendobj\n`;});const start=Buffer.byteLength(s);s+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return Buffer.from(s).toString('base64');
}
app.whenReady().then(async()=>{
 try{
  let w;for(let i=0;i<100;i++){w=BrowserWindow.getAllWindows()[0];if(w&&!w.webContents.isLoading())break;await wait(100);}
  await wait(800);const wc=w.webContents;const run=async js=>{return wc.executeJavaScript('(async()=>{'+(js.includes(';')&&!js.startsWith('(async()=>')?js:'return ('+js+')')+'})()',true)};const checks=[];
  const check=(name,result)=>{if(!result)throw Error(name);checks.push(name);};
  check('independent profile',app.getPath('userData').includes('.smoke-profile-'));
  check('empty library and branding',await run(`document.title.includes('藏經')&&(await store.all()).length===0`));
  check('PDF import',await run(`(await importFiles([new File([Uint8Array.from(atob('${pdf()}'),c=>c.charCodeAt(0))],'Research.pdf')])).length===1`));
  check('PDF duplicate detection',await run(`await importFiles([new File([Uint8Array.from(atob('${pdf()}'),c=>c.charCodeAt(0))],'Research.pdf')]); return records.length===1`));
  check('PDF first-page thumbnail cached',await run(`records[0].cover instanceof Blob&&records[0].cover.size>100`));
  await run(`await openBook(records[0].id)`);await wait(500);
  check('PDF render and page locator',await run(`!!document.querySelector('.pdf-page canvas')&&$('chapter').textContent==='第 1 頁'`));
  check('PDF search',await run(`await webReader.search('Research'); return webReader.toolbar.querySelector('[role=status]').textContent.includes('找到')`));
  await run(`document.querySelector('[aria-label="閱讀筆記"]').click()`);await wait(150);
  await run(`const d=[...document.querySelectorAll('dialog')].find(d=>d.textContent.includes('儲存筆記'));d.querySelector('textarea').value='Synthetic research note';d.querySelector('form').requestSubmit()`);await wait(250);
  check('note retains page and source',await run(`(await ReaderData.all('annotations')).some(n=>n.chapter==='第 1 頁'&&n.bookId===active.id&&n.text==='Synthetic research note')`));
  await run(`document.querySelector('dialog[open]').close(); $('home').click()`);
  check('EPUB import and conversion',await run(`(async()=>{const z=new JSZip();z.file('mimetype','application/epub+zip');z.file('META-INF/container.xml','<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');z.file('content.opf','<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">test</dc:identifier><dc:title>研究方法合成文件</dc:title><dc:creator>測試作者</dc:creator><dc:language>zh-Hant</dc:language></metadata><manifest><item id="c" href="chapter.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="c"/></spine></package>');z.file('chapter.xhtml','<html xmlns="http://www.w3.org/1999/xhtml"><head><title>研究問題</title></head><body><h1>研究問題</h1><p>這是自製測試文字，檢查原文閱讀與來源標註。</p></body></html>');z.file('nav.xhtml','<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol><li><a href="chapter.xhtml">研究問題</a></li></ol></nav></body></html>');await importFiles([new File([await z.generateAsync({type:'uint8array'})],'Synthetic.epub')]);return records.length===2&&!!records[1].web;})()`));
  await run(`await openBook(records[1].id,'web')`);
  check('EPUB web content',await run(`webReader.article.textContent.includes('自製測試文字')`));
  await run(`const n=webReader.article.querySelector('p').firstChild;const r=document.createRange();r.setStart(n,0);r.setEnd(n,8);const sel=webReader.root.getSelection();sel.removeAllRanges();sel.addRange(r);webReader.article.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:100,clientY:200}));document.querySelector('[role=menuitem][aria-label="螢光筆"]').click()`);await wait(300);
  check('highlight retains source and chapter',await run(`(await ReaderData.all('annotations')).some(n=>n.kind==='highlight'&&n.bookId===active.id&&n.quote.length===8&&!!n.chapter)`));
  await run(`$('home').click();document.querySelector('[aria-label="管理分類"]').click()`);await wait(100);
  await run(`const d=[...document.querySelectorAll('dialog')].find(d=>d.textContent.includes('新增分類'));d.querySelector('form input').value='研究方法';d.querySelector('form').requestSubmit()`);await wait(200);
  check('folder persisted',await run(`(await ReaderData.all('organization')).some(o=>o.groups?.some(g=>g.name==='研究方法'))`));
  await run(`document.querySelector('dialog[open]').close();$('search').value='測試作者';drawShelf()`);
  check('author search',await run(`document.querySelectorAll('.entry').length===1`));
  await run(`$('search').value='';drawShelf()`);
  await run(`document.querySelector('[aria-label="管理研究專案"]').click()`);
  await run(`const d=document.querySelector('dialog[open]');d.querySelector('form input').value='計畫 A';d.querySelector('form textarea').value='比較研究證據';d.querySelector('form').requestSubmit()`);await wait(150);
  await run(`const d=document.querySelector('dialog[open]');d.querySelector('form input').value='計畫 B';d.querySelector('form').requestSubmit()`);await wait(150);
  await run(`document.querySelector('dialog[open]').close();LibraryExtras.projectAssignment(records[0].id).click()`);
  await run(`document.querySelector('dialog[open] .project-link-row button').click()`);await wait(150);
  await run(`LibraryExtras.projectAssignment(records[0].id).click()`);await wait(100);await run(`document.querySelectorAll('dialog[open] .project-link-row button')[1].click()`);await wait(150);
  check('same PDF linked to two projects without duplication',await run(`LibraryExtras.summary(records[0].id).projects.length===2&&records.length===2`));
  await run(`document.querySelector('[data-project]').click()`);
  check('project scope and category intersection',await run(`document.querySelectorAll('.entry').length===1&&!document.querySelector('[aria-label="專案內文件分類"]').hidden`));
  await run(`document.querySelector('[aria-label="專案內文件分類"]').value='';drawShelf()`);
  check('unclassified project filter preserves document',await run(`document.querySelectorAll('.entry').length===1`));
  await run(`ResearchUI.details(records[0].id)`);await wait(100);
  await run(`const d=document.querySelector('dialog[open]');d.querySelector('[aria-label="人工年份"]').value='2026';d.querySelector('[aria-label="文件標籤"]').value='方法、證據';d.querySelector('[aria-label="閱讀狀態"]').value='閱讀中';d.querySelector('form').requestSubmit()`);await wait(150);
  check('manual bibliography tags and reading state persist',await run(`const r=await store.get(records[0].id);return r.bibliography.year==='2026'&&r.tags.length===2&&r.readingState==='閱讀中'`));
  await run(`document.querySelector('dialog[open]').close();document.querySelector('.research-scope button').click()`);
  await run(`document.querySelector('.research-controls button').click()`);
  check('list view preserves thumbnail aspect ratio',await run(`document.body.classList.contains('document-list')&&document.querySelector('.pdf-document img').naturalHeight>document.querySelector('.pdf-document img').naturalWidth`));
  await run(`document.querySelector('.research-controls button').click()`);
  check('backup binary and annotation roundtrip',await run(`const bytes=await CangjingBackup.encode();const snapshot=await CangjingBackup.decode(bytes);return snapshot.books.length===2&&snapshot.books.some(r=>r.type==='pdf'&&r.cover instanceof Blob)&&snapshot.annotations.length>=2&&snapshot.organization.some(r=>r.id==='project-links')`));
  await run(`Array.from(document.querySelectorAll('.research-controls button')).find(b=>b.textContent==='專案筆記').click()`);await wait(100);
  await run(`const d=document.querySelector('dialog[open]');d.querySelector('[aria-label="專案筆記內容"]').value='跨文件方法比較';d.querySelector('[aria-label="原文引文"]').value='Research evidence sample.';Array.from(d.querySelectorAll('button')).find(b=>b.textContent==='加入文件證據').click();d.querySelector('[aria-label="來源文件"]').selectedIndex=1;d.querySelector('[aria-label="原文引文"]').value='自製測試文字';Array.from(d.querySelectorAll('button')).find(b=>b.textContent==='加入文件證據').click();d.querySelector('form').requestSubmit()`);await wait(150);
  check('project note links two distinct documents and exports Markdown',await run(`const n=(await ReaderData.all('annotations')).find(n=>n.kind==='project-note');return n.evidence.length===2&&(await ProjectNotes.markdown(n.projectId)).includes('Research evidence sample.')`));
  await run(`document.querySelector('dialog[open]').close();Array.from(document.querySelectorAll('.research-controls button')).find(b=>b.textContent==='外掛').click()`);
  await run(`document.querySelector('dialog[open] .plugin-row button').click()`);await wait(1200);
  check('sandboxed plugin loads',await run(`Array.from(document.querySelectorAll('dialog[open] .plugin-row button')).some(b=>b.textContent==='顯示文件資訊摘要'&&!b.disabled)`));
  const pluginFrame=wc.mainFrame.frames.find(f=>f.url.startsWith('cangjing-plugin:'));
  check('plugin has no Node preload or reader globals',pluginFrame&&await pluginFrame.executeJavaScript(`typeof require==='undefined'&&typeof desktopReader==='undefined'&&typeof LibraryStore==='undefined'`));
  await run(`Array.from(document.querySelectorAll('dialog[open] .plugin-row button')).find(b=>b.textContent==='顯示文件資訊摘要').click()`);await wait(300);
  check('plugin metadata command returns document info',await run(`document.querySelector('dialog[open] .plugin-output').textContent.includes('Research')`));
  await run(`document.querySelector('dialog[open]').close();await ResearchUI.details(records[0].id)`);await wait(200);
  check('plugin contributes a document detail panel',await run(`document.querySelector('.plugin-detail-panel').textContent.includes('2026')`));
  await run(`document.querySelector('dialog[open]').close();Array.from(document.querySelectorAll('.research-controls button')).find(b=>b.textContent==='外掛').click()`);
  await run(`Array.from(document.querySelectorAll('dialog[open] .plugin-row button')).find(b=>b.textContent==='匯出筆記 Markdown').click()`);await wait(300);
  check('plugin note exporter returns source-linked Markdown',await run(`document.querySelector('dialog[open] .plugin-output').textContent.includes('# 藏經研究筆記')`));
  await run(`document.querySelector('dialog[open] .plugin-row button').click()`);await wait(100);
  check('plugin disable destroys frame',await run(`document.querySelectorAll('iframe[title="文件資訊摘要"]').length===0`));
  await run(`document.querySelector('dialog[open]').close()`);
  await run(`document.querySelector('[aria-label="管理研究專案"]').click()`);await wait(100);
  await run(`window.confirm=()=>true;document.querySelector('dialog[open] [aria-label="刪除研究專案"]').click()`);await wait(150);
  check('deleting project preserves documents and remaining membership',await run(`records.length===2&&LibraryExtras.summary(records[0].id).projects.length===1`));
  await run(`document.querySelector('dialog[open]').close()`);
  check('transactional backup restore retains binary thumbnails and project notes',await run(`const snapshot=await CangjingBackup.decode(await CangjingBackup.encode());await LibraryStore.restore({books:[],positions:[],annotations:[],organization:[]});await LibraryStore.restore(snapshot);return (await store.all()).length===2&&(await ReaderData.all('annotations')).some(n=>n.kind==='project-note')`));
  await run(`document.querySelector('[aria-label="篩選閱讀狀態"]').value='閱讀中';drawShelf()`);
  check('reading state filter',await run(`document.querySelectorAll('.entry').length===1`));
  await run(`document.querySelector('.research-scope button').click()`);
  check('clear resets scope and all filters',await run(`document.querySelectorAll('.entry').length===2&&document.querySelector('[aria-label="篩選閱讀狀態"]').value===''`));
  wc.debugger.attach('1.3');
  for(const [width,height] of [[390,844],[768,1024],[1440,900],[1920,1080],[2560,1080]]){
   await wc.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await wait(250);
   check(`no horizontal overflow ${width}`,await run(`document.documentElement.scrollWidth<=innerWidth`));
   const shot=await wc.debugger.sendCommand('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(path.join(__dirname,`../work/viewport-${width}.png`),Buffer.from(shot.data,'base64'));
  }
  await run(`await openBook(records[0].id)`);
  for(const [width,height] of [[390,844],[768,1024],[1440,900],[1920,1080],[2560,1080]]){
   await wc.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await wait(400);
   check(`PDF reader fits ${width}`,await run(`document.documentElement.scrollWidth<=innerWidth&&!!document.querySelector('.pdf-page canvas')`));
   const shot=await wc.debugger.sendCommand('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(path.join(__dirname,`../work/reader-${width}.png`),Buffer.from(shot.data,'base64'));
  }
  check('no renderer console errors',errors.length===0);
  await fs.writeFile(path.join(__dirname,'../work/smoke-results.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));app.exit(0);
 }catch(e){const w=BrowserWindow.getAllWindows()[0];if(w)console.error(await w.webContents.executeJavaScript('document.getElementById("status").textContent'));console.error(e.stack);app.exit(1);}
});
