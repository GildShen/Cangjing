'use strict';
CangjingPlugin.onCommand('summarize-library',async()=>{
 const documents=await CangjingPlugin.getDocuments();
 return documents.length?documents.map(d=>`${d.title} · ${d.type||'EPUB'} · ${d.bibliography?.authors||d.author||'作者未標示'}`).join('\n'):'尚無文件。匯入後可再次執行。';
});

CangjingPlugin.onCommand('export-notes',()=>CangjingPlugin.exportNotes());
CangjingPlugin.onPanel('document-metadata',async context=>{
 const document=(await CangjingPlugin.getDocuments()).find(d=>d.id===context.documentId);
 return document?`${document.title}\n格式：${document.type||'EPUB'}\n作者：${document.bibliography?.authors||document.author||'作者未標示'}\n年份：${document.bibliography?.year||'未填入'}\nDOI：${document.bibliography?.doi||'未填入'}`:'文件已移除';
});
