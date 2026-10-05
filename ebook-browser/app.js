'use strict';
const $ = id => document.getElementById(id);
const store = window.LibraryStore;
let records = [], active, book, rendition, busy = false, generation = 0;
let coverUrls = [], tocItems = [];
let webReader=null,currentMode='pdf';
let disposePicture;
function readingKey(event){
  if(event.target?.closest?.('#ai-panel'))return;
  if(busy||$('reader').hidden||document.querySelector('dialog[open], [role="menu"][aria-label="文字標註"]'))return;
  if(webReader){webReader.handleKey(event);return;}

}
document.addEventListener('keydown',readingKey);
const settings = {size:22,font:'serif',spacing:'1.8',dark:false};
try {Object.assign(settings, JSON.parse(localStorage.getItem('cangjing-reader-settings') || '{}'));} catch {}
settings.size = Math.max(16,Math.min(36,Number(settings.size)||22));
function icons(){lucide.createIcons({attrs:{'stroke-width':1.6}});}
function status(message=''){$('status').textContent=message;}
function bounded(promise){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('載入逾時，請檢查檔案是否完整')),60000);})]).finally(()=>clearTimeout(timer));}
function saveSettings(){try{localStorage.setItem('cangjing-reader-settings',JSON.stringify(settings));}catch{status('無法儲存閱讀設定。');}}
function theme(){
  document.body.classList.toggle('dark',!!settings.dark);
  $('theme').setAttribute('aria-pressed',!!settings.dark);
  if(webReader){webReader.settings(settings);return;}

}
function drawShelf(){
  coverUrls.forEach(URL.revokeObjectURL);coverUrls=[];$('shelf').replaceChildren();
  const query=$('search').value.trim().toLocaleLowerCase();
  const filtered=records.filter(r=>r.type==='pdf'&&(r.title+' '+r.author+' '+(r.bibliography?.title||'')+' '+(r.bibliography?.authors||'')).toLocaleLowerCase().includes(query)&&(!window.LibraryExtras||LibraryExtras.matches(r.id))&&(!window.ResearchUI||ResearchUI.matches(r)));
  filtered.sort((a,b)=>window.LibraryExtras?.isRecent()?b.opened-a.opened:$('sort').value==='title'?a.title.localeCompare(b.title,'zh-Hant'):$('sort').value==='added'?b.added-a.added:(b.opened||b.added)-(a.opened||a.added));
  $('total').textContent=filtered.length+' 份';$('empty').hidden=filtered.length!==0;
  for(const record of filtered){
    const entry=document.createElement('article');entry.className='entry';
    const cover=document.createElement('button');cover.className='cover-button';cover.title='閱讀 '+record.title;cover.onclick=()=>openBook(record.id);
    if(record.cover){const img=document.createElement('img');img.src=URL.createObjectURL(record.cover);coverUrls.push(img.src);img.alt=record.title+' 封面';cover.append(img);}else{const text=document.createElement('span');text.className='cover-fallback';text.textContent=record.title;cover.append(text);}
    const title=document.createElement('h2');title.textContent=record.title;
    const author=document.createElement('p');author.textContent=record.author||'作者未標示';
    const meta=document.createElement('p');meta.textContent='PDF · '+record.sections+' 頁 · 封面第 '+(record.coverPage||1)+' 頁 · '+(record.size/1048576).toFixed(1)+' MB';
    const actions=document.createElement('div');actions.className='entry-actions';
    const read=document.createElement('button');read.className='read';read.textContent=record.opened?'繼續閱讀':'開始閱讀';read.onclick=()=>openBook(record.id);
    const remove=document.createElement('button');remove.title='移除 '+record.title;remove.setAttribute('aria-label',remove.title);remove.innerHTML='<i data-lucide="trash-2"></i>';remove.onclick=async()=>{if(!confirm('從文件庫移除《'+record.title+'》？原始 PDF 檔案不受影響。'))return;try{await window.ResearchUI?.removed(record.id);await store.remove(record.id);await store.removePosition(record.id);records=records.filter(r=>r.id!==record.id);drawShelf();}catch(e){status('移除失敗：'+e.message);}};
    const coverPage=document.createElement('button');coverPage.title='設定文件封面';coverPage.setAttribute('aria-label','設定文件封面');coverPage.innerHTML='<i data-lucide="image"></i>';coverPage.onclick=()=>PdfCover.open(record.id);actions.append(read,coverPage,remove);entry.append(cover,title,author,meta,actions);if(window.LibraryExtras){actions.insertBefore(LibraryExtras.assignment(record.id),remove);LibraryExtras.draggable(entry,record.id);}if(window.ResearchUI)ResearchUI.decorate(entry,record);$('shelf').append(entry);
  }if(window.LibraryExtras)LibraryExtras.refresh();icons();
}
async function importFiles(files){
  if(busy)return [];busy=true;$('files').disabled=true;
  const importedIds=[];
  let imported=0,duplicates=0;const errors=[];
  for(const file of files){
    try{
      if(!/\.pdf$/i.test(file.name))throw new Error('藏經只支援 PDF 文獻');
      status('正在匯入 '+file.name);
      const data=await file.arrayBuffer();
      const hash=await crypto.subtle.digest('SHA-256',data);
      const id=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
      if(records.some(r=>r.id===id)){duplicates++;importedIds.push(id);continue;}
      if(/\.pdf$/i.test(file.name)){
        const metadata=await PdfReader.metadata(data);const record={id,type:'pdf',importName:file.name,title:metadata.title||file.name.replace(/\.pdf$/i,''),author:metadata.author||'',sections:metadata.sections,coverPage:1,data,size:file.size,added:Date.now(),opened:0};
        record.metadata={title:metadata.title||'',authors:metadata.author||''};
        try{record.cover=await PdfReader.preview(data);}catch(e){record.previewError=e.message;}
        await store.put(record);records.push(record);imported++;importedIds.push(id);window.ResearchUI?.imported(record);continue;
      }
    }catch(e){errors.push(file.name+'：'+e.message);}
  }
  busy=false;$('files').disabled=false;$('files').value='';if(imported)window.LibraryExtras?.revealImported();drawShelf();
  status(`已匯入 ${imported} 份`+(duplicates?`，略過 ${duplicates} 份重複文件`:'')+(errors.length?'。'+errors.join('；'):''));
  return importedIds;
}
function toggleOutline(show){document.body.classList.toggle('hide-outline',!show);$('toc-toggle').setAttribute('aria-expanded',show);}
async function openBook(id){
 if(busy)return;busy=true;++generation;
 try{status('正在載入文獻…');const record=await store.get(id);if(!record)throw Error('文獻不存在');if(record.type!=='pdf')throw Error('藏經只支援 PDF；舊版資料可從相容性資料匯出或備份');if(webReader){webReader.destroy();webReader=null;}window.ReaderHighlights?.detach?.();active=record;document.dispatchEvent(new CustomEvent('reader-document-changed'));currentMode='pdf';$('library').hidden=true;$('reader').hidden=false;$('book-title').textContent=record.title;$('viewport').replaceChildren();
 const pdf=await PdfReader.load(record.data);webReader=new PdfReader($('viewport'),pdf,record);const position=await store.position(id+':pdf');webReader.rotation=position?.rotation||0;webReader.zoom=position?.zoom||'fit';webReader.toolbar.querySelector('select').value=webReader.zoom;await webReader.navigation();await webReader.show(position?.index||0);toggleOutline(innerWidth>700);record.opened=Date.now();await store.put(record);records=records.map(r=>r.id===id?record:r);status();
 }catch(e){status('無法開啟：'+e.message);$('library').hidden=false;$('reader').hidden=true;}finally{busy=false;}
}
WebBookReader.fullscreenControl(document.querySelector('.reader-tools'),status);
$('files').onchange=e=>importFiles(Array.from(e.target.files));$('files').accept='.pdf,application/pdf';
$('home').onclick=()=>{if(busy)return;++generation;if(webReader){webReader.destroy();webReader=null;}window.ReaderHighlights?.detach?.();active=null;document.dispatchEvent(new CustomEvent('reader-document-changed'));$('library').hidden=false;$('reader').hidden=true;$('book-title').textContent='';drawShelf();status();};
$('search').oninput=drawShelf;$('sort').onchange=drawShelf;$('theme').onclick=()=>{settings.dark=!settings.dark;theme();saveSettings();};$('toc-toggle').onclick=()=>toggleOutline(document.body.classList.contains('hide-outline'));$('prev').onclick=()=>webReader?.show(webReader.index-1);$('next').onclick=()=>webReader?.show(webReader.index+1);addEventListener('pagehide',()=>webReader?.notify());
document.addEventListener('dragover',e=>e.preventDefault());document.addEventListener('drop',e=>{e.preventDefault();if(e.dataTransfer.files.length)importFiles(Array.from(e.dataTransfer.files));});theme();icons();
store.all().then(data=>{records=data;window.libraryReady=true;window.ProjectCopies?.changed();drawShelf();startDesktopBridge();window.LegacyDocuments?.refresh();}).catch(e=>status('無法開啟本機文獻庫：'+e.message));
function startDesktopBridge(){
  if(!window.desktopReader)return;
  document.querySelector('.old')?.remove();
  let draining=false;
  async function drain(){
    if(draining)return;draining=true;
    try{
      for(;;){
        while(busy)await new Promise(resolve=>setTimeout(resolve,100));
        const entry=await window.desktopReader.next();if(!entry)break;
        if(entry.error){status('無法開啟 '+entry.name+'：'+entry.error);continue;}
        const file=new File([entry.bytes],entry.name,{type:'application/pdf'});
        const ids=await importFiles([file]);if(ids.length)await openBook(ids[ids.length-1]);
      }
    }catch(error){status('桌面檔案開啟失敗：'+error.message);}finally{draining=false;}
  }
  window.desktopReader.onOpen(drain);
  window.desktopReader.ready().catch(error=>status(error.message));
}
