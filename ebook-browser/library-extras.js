'use strict';
(() => {
  const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href='library-extras.css';document.head.append(stylesheet);
  const folderStyle=document.createElement('link');folderStyle.rel='stylesheet';folderStyle.href='folders.css';document.head.append(folderStyle);
  const db=window.ReaderData;
  let groups=[],assignments=[],projects=[],links={},captured=null,editing=null;
  const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
  const command=(icon,label,action)=>{const node=el('button');node.type='button';node.title=label;node.setAttribute('aria-label',label);node.innerHTML='<i data-lucide="'+icon+'"></i>';node.onclick=()=>Promise.resolve().then(action).catch(error=>status(error.message));return node;};
  let navigationLoaded=false;let nav={tab:'literature',literature:'@recent',project:null,projectCategory:'*'};try{nav={...nav,...JSON.parse(localStorage.getItem('cangjing-library-navigation')||'{}')};}catch{}if(!['literature','projects'].includes(nav.tab))nav.tab='literature';
  const remember=()=>{try{localStorage.setItem('cangjing-library-navigation',JSON.stringify(nav));}catch{}};
  const filter=el('select');filter.setAttribute('aria-label','文獻分類');
  const library=$('library'),content=el('div'),sidebar=el('nav'),folderList=el('div');
  content.className='library-content';content.append(...library.childNodes);sidebar.className='folder-sidebar';sidebar.setAttribute('aria-label','文獻與專案導覽');library.append(sidebar,content);
  const projectHeading=el('div');projectHeading.className='folder-heading';projectHeading.append(el('strong','研究專案'),command('folder-plus','管理研究專案',()=>{renderProjects();projectManager.showModal();}));
  const projectList=el('div');const projectPanel=el('div'),literaturePanel=el('div'),tabs=el('div');tabs.className='library-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','資料庫導覽');const tabButtons={};for(const [key,label] of [['projects','專案'],['literature','文獻']]){const b=el('button',label);b.type='button';b.id='library-tab-'+key;b.setAttribute('role','tab');b.setAttribute('aria-controls','library-panel-'+key);b.onclick=()=>setTab(key);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const target=e.key==='Home'?'projects':e.key==='End'?'literature':key==='projects'?'literature':'projects';setTab(target);tabButtons[target].focus();};tabs.append(b);tabButtons[key]=b;}for(const [key,panel] of [['projects',projectPanel],['literature',literaturePanel]]){panel.id='library-panel-'+key;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','library-tab-'+key);}projectPanel.append(projectHeading,projectList);sidebar.append(tabs,projectPanel,literaturePanel);
  const heading=el('div');heading.className='folder-heading';heading.append(el('strong','文件分類'),command('folder-plus','管理分類',()=>{renderGroups();categories.showModal();}));literaturePanel.append(folderList);projectHeading.querySelector('strong').remove();heading.querySelector('strong').textContent='分類';for(const h of [projectHeading,heading])h.querySelector('button').append(el('span','新增／管理'));
  const scope=el('p');scope.className='research-scope';document.querySelector('.library-head').after(scope);
  const categoryFilter=el('select');categoryFilter.setAttribute('aria-label','專案內文件分類');categoryFilter.onchange=drawShelf;document.querySelector('.filters').append(categoryFilter);
  const clear=el('button','清除範圍與篩選');clear.onclick=()=>{nav.tab='literature';filter.value='*';categoryFilter.value='*';$('search').value='';window.ResearchUI?.clearFilters();drawShelf();};scope.append(clear);
  const projectEmpty=el('section');projectEmpty.className='project-empty';projectEmpty.append(el('h2','建立第一個專案'),el('p','把相關文獻加入專案，整理同一研究主題的證據。'));const emptyAction=el('button','新增專案');emptyAction.onclick=()=>{renderProjects();projectManager.showModal();projectName.focus();};projectEmpty.append(emptyAction);content.append(projectEmpty);projectEmpty.hidden=true;
  function setTab(key){if(nav.tab==='projects'){nav.project=filter.value;nav.projectCategory=categoryFilter.value;}else nav.literature=filter.value;nav.tab=key;filter.value=key==='projects'?(projects.some(p=>'@project:'+p.id===nav.project)?nav.project:projects.length?'@project:'+projects[0].id:'@projects-empty'):nav.literature;categoryFilter.value=nav.projectCategory??'*';remember();drawShelf();}
  let draggedBook=null;
  function renderFolders(){
    projectList.replaceChildren();projectPanel.hidden=nav.tab!=='projects';literaturePanel.hidden=nav.tab!=='literature';for(const [key,b] of Object.entries(tabButtons)){b.setAttribute('aria-selected',String(key===nav.tab));b.tabIndex=key===nav.tab?0:-1;}if(navigationLoaded){if(nav.tab==='projects'){nav.project=filter.value;nav.projectCategory=categoryFilter.value;}else nav.literature=filter.value;remember();}const noProjects=nav.tab==='projects'&&!projects.length;projectEmpty.hidden=!noProjects;$('shelf').hidden=noProjects;document.querySelector('.filters').hidden=noProjects;if(!projects.length)projectList.append(el('p','尚無專案'));
    for(const project of projects){const button=command('briefcase-business',project.name,()=>{filter.value='@project:'+project.id;categoryFilter.value='*';drawShelf();});button.className='folder-item';button.dataset.project=project.id;button.setAttribute('aria-current',String(filter.value==='@project:'+project.id));button.append(el('span',project.name),el('small',String(records.filter(r=>r.type==='pdf'&&(links[r.id]||[]).includes(project.id)).length)));button.ondragover=e=>{if(draggedBook){e.preventDefault();button.classList.add('drop-target');}};button.ondragleave=()=>button.classList.remove('drop-target');button.ondrop=async e=>{e.preventDefault();button.classList.remove('drop-target');if(draggedBook){await saveLinks(ResearchOrganization.add(links,draggedBook,project.id));draggedBook=null;status('已加入研究專案「'+project.name+'」');}};projectList.append(button);}
    folderList.replaceChildren();
    for(const [id,name] of [['@recent','最近閱讀'],['*','全部文獻'],['','未分類'],...groups.map(g=>[g.id,g.name])]){
      if(id==='')folderList.append(heading);const button=command(id==='@recent'?'history':id==='*'?'library':'folder',name,()=>{filter.value=id;drawShelf();});button.className='folder-item';button.dataset.folder=id;
      button.setAttribute('aria-current',String(filter.value===id));button.append(el('span',name),el('small',String(records.filter(r=>matchesFolder(r,id)).length)));
      if(id!=='*'&&id!=='@recent'){
        button.ondragover=event=>{if(!draggedBook)return;event.preventDefault();event.dataTransfer.dropEffect='move';button.classList.add('drop-target');};
        button.ondragleave=()=>button.classList.remove('drop-target');
        button.ondrop=async event=>{event.preventDefault();button.classList.remove('drop-target');const bookId=draggedBook;draggedBook=null;if(!bookId||!records.some(r=>r.id===bookId))return;try{await saveAssignment(bookId,id);status('已移至「'+name+'」');}catch(error){status('移動失敗：'+error.message);}};
      }folderList.append(button);
    }
    const recent=filter.value==='@recent';
    $('sort').disabled=recent;
    if(recent)$('sort').value='recent';
    const title=document.querySelector('.library-head h1');
    const text=Array.from(title.childNodes).find(node=>node.nodeType===Node.TEXT_NODE);
    const project=projects.find(p=>filter.value==='@project:'+p.id);
    if(text)text.textContent=(project?project.name:recent?'最近閱讀':filter.value==='@projects-empty'?'專案':filter.value==='*'?'全部文獻':groups.find(g=>g.id===filter.value)?.name||'未分類')+' ';
    categoryFilter.hidden=!project;const selectedCategory=categoryFilter.options.length?categoryFilter.value:'*';categoryFilter.replaceChildren();for(const [value,name] of [['*','全部分類'],['','未分類'],...groups.map(g=>[g.id,g.name])]){const option=el('option',name);option.value=value;categoryFilter.append(option);}categoryFilter.value=selectedCategory;
    scope.replaceChildren(el('span',project?'研究專案：'+project.name+' · '+(project.description||'無簡述')+' · 分類：'+(groups.find(g=>g.id===categoryFilter.value)?.name||(categoryFilter.value==='*'?'全部':'未分類')):'範圍：'+(recent?'最近閱讀':filter.value==='*'?'全部文獻':'文件分類／'+(groups.find(g=>g.id===filter.value)?.name||'未分類'))),clear);
    if(!$('search').value.trim())$('empty').textContent=recent?'尚無閱讀紀錄，請從「全部文獻」選擇文獻開始閱讀。':'此範圍尚無文獻';
    else $('empty').textContent='沒有符合搜尋條件的文獻';if(noProjects){$('empty').hidden=true;scope.hidden=true;}else scope.hidden=false;
    icons();
  }
  function options(select,value,all=false){
    select.replaceChildren();
    for(const [id,name] of [...(all?[['@recent','最近閱讀'],['*','全部文獻'],['@projects-empty','專案'],...projects.map(p=>['@project:'+p.id,p.name])]:[]),['','未分類'],...groups.map(g=>[g.id,g.name])]){
      const option=el('option',name);option.value=id;select.append(option);
    }
    select.value=value;
  }
  function category(id){return assignments.find(a=>a.id===id)?.category||'';}
  function matchesFolder(record,value){if(record.type!=='pdf')return false;if(value==='@projects-empty')return false;if(value.startsWith('@project:'))return (links[record.id]||[]).includes(value.slice(9))&&(categoryFilter.value==='*'||category(record.id)===categoryFilter.value);return value==='@recent'?Number(record.opened)>0:value==='*'||category(record.id)===value;}
  async function saveLinks(next){await db.put('organization',{id:'project-links',links:next});links=next;drawShelf();}
  async function saveAssignment(id,value){
    const row={id,category:value};await db.put('organization',row);
    assignments=assignments.filter(a=>a.id!==id);assignments.push(row);drawShelf();
  }
  window.LibraryExtras={
    revealImported:()=>{if(filter.value==='@recent')filter.value='*';},
    projects:()=>projects.map(p=>({...p})),
    memberships:()=>JSON.parse(JSON.stringify(links)),
    summary:id=>({category:groups.find(g=>g.id===category(id))?.name||'未分類',projects:projects.filter(p=>(links[id]||[]).includes(p.id)).map(p=>p.name)}),
    removeDocument:async id=>{await saveLinks(ResearchOrganization.deleteDocument(links,id));await db.remove('organization',id);assignments=assignments.filter(a=>a.id!==id);},
    projectAssignment:id=>command('briefcase-business','管理研究專案關聯',()=>{projectAssociations.replaceChildren();for(const project of projects){const row=el('div');row.className='project-link-row';row.append(el('span',project.name));const joined=(links[id]||[]).includes(project.id);const action=el('button',joined?'移出研究專案':'加入研究專案');action.onclick=async()=>{await saveLinks(joined?ResearchOrganization.remove(links,id,project.id):ResearchOrganization.add(links,id,project.id));projectLinks.close();};row.append(action);projectAssociations.append(row);}if(!projects.length)projectAssociations.append(el('p','請先在側欄新增研究專案'));projectLinks.showModal();}),
    refresh:renderFolders,
    draggable:(entry,id)=>{
      entry.draggable=true;entry.ondragstart=event=>{draggedBook=id;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',id);entry.classList.add('dragging');};
      entry.ondragend=()=>{draggedBook=null;entry.classList.remove('dragging');sidebar.querySelectorAll('.drop-target').forEach(node=>node.classList.remove('drop-target'));};
    },
    isRecent:()=>filter.value==='@recent',
    matches:id=>{const record=records.find(r=>r.id===id);return !!record&&record.type==='pdf'&&matchesFolder(record,filter.value);},
    assignment:id=>{
      return command('folder-input','變更分類',()=>{
        moveList.replaceChildren();
        for(const [value,name] of [['','未分類'],...groups.map(g=>[g.id,g.name])]){
          const button=command('folder',name,async()=>{await saveAssignment(id,value);move.close();});button.className='folder-item';button.append(el('span',name));moveList.append(button);
        }move.showModal();icons();
      });
    }
  };
  options(filter,'@recent',true);filter.onchange=drawShelf;
  filter.hidden=true;document.querySelector('.filters').append(filter);
  function modal(title){
    const dialog=el('dialog');dialog.className='library-dialog';const header=el('div');header.className='dialog-heading';header.append(el('h2',title),command('x','關閉',()=>dialog.close()));dialog.append(header);document.body.append(dialog);return dialog;
  }
  const projectLinks=modal('研究專案關聯'),projectAssociations=el('div');projectLinks.append(projectAssociations);
  const projectManager=modal('管理研究專案'),projectForm=el('form'),projectName=el('input'),projectDescription=el('textarea'),projectRows=el('div');projectName.required=true;projectName.maxLength=100;projectName.placeholder='專案名稱';projectName.setAttribute('aria-label','研究專案名稱');projectDescription.maxLength=2000;projectDescription.placeholder='專案簡述';projectDescription.setAttribute('aria-label','研究專案簡述');const createProject=el('button','新增研究專案');createProject.type='submit';projectForm.append(projectName,projectDescription,createProject);projectManager.append(projectForm,projectRows);
  async function persistProjects(){await db.put('organization',{id:'projects',projects});const value=filter.value;options(filter,value,true);renderProjects();drawShelf();}
  projectForm.onsubmit=async e=>{e.preventDefault();const name=projectName.value.trim();if(!name||projects.some(p=>p.name===name))return status('請使用不重複的專案名稱');projects.push({id:crypto.randomUUID(),name,description:projectDescription.value.trim()});if(nav.tab==='projects'&&filter.value==='@projects-empty'){options(filter,'@project:'+projects.at(-1).id,true);nav.project=filter.value;}await persistProjects();projectName.value='';projectDescription.value='';};
  function renderProjects(){projectRows.replaceChildren();for(const project of projects){const row=el('div');row.className='project-edit-row';const name=el('input'),description=el('textarea');name.value=project.name;name.maxLength=100;name.setAttribute('aria-label','專案名稱');description.value=project.description;description.maxLength=2000;description.setAttribute('aria-label','專案簡述');row.append(name,description,command('save','儲存專案',async()=>{if(!name.value.trim()||projects.some(p=>p.id!==project.id&&p.name===name.value.trim()))throw Error('請使用不重複的專案名稱');project.name=name.value.trim();project.description=description.value.trim();await persistProjects();}),command('trash-2','刪除研究專案',async()=>{if(!confirm('刪除研究專案「'+project.name+'」？文件與筆記會保留，只移除專案關聯。'))return;await saveLinks(ResearchOrganization.deleteProject(links,project.id));projects=projects.filter(p=>p.id!==project.id);if(filter.value==='@project:'+project.id){filter.value=projects.length?'@project:'+projects[0].id:'@projects-empty';nav.project=filter.value;}await persistProjects();}));projectRows.append(row);}icons();}
  const categories=modal('管理分類'),groupForm=el('form'),groupName=el('input'),groupList=el('div');
  groupName.placeholder='分類名稱';groupName.setAttribute('aria-label','分類名稱');groupName.maxLength=60;groupName.required=true;
  const add=el('button','新增分類');add.type='submit';groupForm.append(groupName,add);categories.append(groupForm,groupList);
  async function persistGroups(){await db.put('organization',{id:'categories',groups});const value=filter.value;options(filter,groups.some(g=>g.id===value)||value==='*'||value==='@recent'||value.startsWith('@project')?value:'',true);renderGroups();drawShelf();}
  groupForm.onsubmit=async event=>{
    event.preventDefault();const name=groupName.value.trim();if(!name)return;
    if(groups.some(g=>g.name===name)){status('已有同名分類');return;}
    const previous=groups;groups=[...groups,{id:crypto.randomUUID(),name}];
    try{await persistGroups();groupName.value='';}catch(error){groups=previous;status(error.message);}
  };
  function renderGroups(){
    groupList.replaceChildren();
    for(const group of groups){
      const row=el('div');row.className='category-row';const name=el('input');name.value=group.name;name.maxLength=60;name.setAttribute('aria-label','分類名稱');
      row.append(name,command('save','儲存名稱',async()=>{
        const value=name.value.trim();if(!value||groups.some(g=>g.id!==group.id&&g.name===value))throw new Error('請填入不重複的分類名稱');
        const previous=group.name;group.name=value;try{await persistGroups();}catch(error){group.name=previous;throw error;}
      }),command('trash-2','刪除分類',async()=>{
        if(!confirm('刪除「'+group.name+'」分類？文件將保留並改為未分類。'))return;
        for(const assignment of assignments.filter(a=>a.category===group.id))await saveAssignment(assignment.id,'');
        const previous=groups;groups=groups.filter(g=>g.id!==group.id);try{await persistGroups();}catch(error){groups=previous;throw error;}
      }));groupList.append(row);
    }icons();
  }
  const notes=modal('閱讀筆記'),context=el('p'),quote=el('blockquote'),form=el('form'),body=el('textarea'),list=el('div');
  const move=modal('變更分類'),moveList=el('div');move.append(moveList);
  body.rows=5;body.maxLength=20000;body.placeholder='寫下筆記';body.setAttribute('aria-label','筆記內容');
  const save=el('button','儲存筆記');save.type='submit';const reset=el('button','新增筆記');reset.type='button';reset.onclick=()=>{editing=null;body.value='';capture();showContext();};
  form.append(body,save,reset);notes.append(context,quote,form,list);
  function capture(){
    if(!active)return;
    let selected='';
    if(webReader)selected=String(webReader.root.getSelection?.()||document.getSelection()||'');
    else for(const content of rendition?.getContents()||[])selected+=String(content.window.getSelection()||'');
    captured={bookId:active.id,mode:currentMode,chapter:$('chapter').textContent,quote:selected.trim().slice(0,20000),locator:webReader?{index:webReader.index,fraction:webReader.fraction()}:{cfi:rendition?.currentLocation()?.start?.cfi}};
  }
  function showContext(){context.textContent=captured?.chapter||'目前閱讀位置';quote.textContent=captured?.quote||'';quote.hidden=!captured?.quote;}
  const noteButton=command('notebook-pen','閱讀筆記',async()=>{
    if(busy||!active)return;if(!captured||captured.bookId!==active.id)capture();editing=null;body.value='';showContext();await renderNotes();notes.showModal();body.focus();
  });
  noteButton.addEventListener('pointerdown',()=>{capture();});
  noteButton.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')capture();});
  document.querySelector('.reader-tools').append(noteButton);
  form.onsubmit=async event=>{
    event.preventDefault();if(!captured)return;const text=body.value.trim();if(!text&&!captured.quote){body.focus();return;}
    save.disabled=true;
    try{await db.put('annotations',{...captured,id:editing||crypto.randomUUID(),text,updated:Date.now()});editing=null;body.value='';await renderNotes();status('筆記已儲存');}
    catch(error){status('筆記儲存失敗：'+error.message);}finally{save.disabled=false;}
  };
  async function renderNotes(){
    const rows=(await db.all('annotations')).filter(n=>n.bookId===active.id&&!['highlight','underline','comment'].includes(n.kind)).sort((a,b)=>b.updated-a.updated);list.replaceChildren();
    if(!rows.length)list.append(el('p','尚無筆記'));
    for(const note of rows){
      const row=el('article');row.className='saved-note';row.append(el('h3',note.chapter||'閱讀位置'),el('time',new Date(note.updated).toLocaleString('zh-TW')));
      if(note.quote)row.append(el('blockquote',note.quote));row.append(el('p',note.text));
      row.append(command('map-pin','回到閱讀位置',async()=>{
        notes.close();if(currentMode!==note.mode)await openBook(note.bookId,note.mode);
        if(webReader)await webReader.show(note.locator.index,note.locator.fraction);else if(note.locator.cfi)await rendition.display(note.locator.cfi);
      }),command('pencil','編輯筆記',()=>{editing=note.id;captured={...note};body.value=note.text;showContext();body.focus();}),command('trash-2','刪除筆記',async()=>{
        if(!confirm('刪除此筆記？'))return;await db.remove('annotations',note.id);if(editing===note.id){editing=null;body.value='';capture();showContext();}await renderNotes();
      }));list.append(row);
    }icons();
  }
  db.all('organization').then(rows=>{groups=rows.find(r=>r.id==='categories')?.groups||[];projects=rows.find(r=>r.id==='projects')?.projects||[];links=rows.find(r=>r.id==='project-links')?.links||{};assignments=rows.filter(r=>!['categories','projects','project-links'].includes(r.id));navigationLoaded=true;if(!['*','',...groups.map(g=>g.id)].includes(nav.projectCategory))nav.projectCategory='*';if(!['@recent','*','',...groups.map(g=>g.id)].includes(nav.literature))nav.literature='@recent';if(!projects.some(p=>'@project:'+p.id===nav.project))nav.project=projects.length?'@project:'+projects[0].id:'@projects-empty';options(filter,nav.tab==='projects'?nav.project:nav.literature,true);categoryFilter.value=nav.projectCategory;drawShelf();icons();}).catch(error=>status('分類載入失敗：'+error.message));
})();
