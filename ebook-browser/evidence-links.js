'use strict';
(()=>{
 const compact=s=>String(s||'').replace(/\s/g,'');
 function locate(text,quote){const q=compact(quote);if(!q)return null;let clean='',offsets=[];for(let i=0;i<text.length;i++)if(!/\s/.test(text[i])){clean+=text[i];offsets.push(i);}const at=clean.indexOf(q);if(at<0||clean.indexOf(q,at+1)>=0)return null;return {start:offsets[at],end:offsets[at+q.length-1]+1};}
 function key(version,kind,row){return encodeURIComponent(JSON.stringify([version,kind,row.page,row.quote,row.value]));}
 function collect(state,id,version){const items=[];const readings=[...(state.readings?.jobs||[]),...(state.readings?.history||[])].filter(j=>j.id===id&&j.result&&['completed','partial'].includes(j.state)&&(!version||j.versionId===version));
 for(const j of readings){const add=(kind,rows)=>{for(const r of rows||[]){if(!r.quote||!(j.pages||[]).some(p=>p.page===r.page&&p.text.includes(r.quote)))continue;items.push({...r,documentId:id,version:j.versionId,kind,role:!['strongest','weakest'].includes(kind)&&r.certainty==='extracted'?'作者陳述':'AI 推論',ref:key(j.versionId,kind,r)});}};const im=j.result.imrad;if(im){for(const [name,g]of Object.entries(im.sections))add('section:'+name,g.rows);for(const [name,g]of Object.entries(im.logic))add('logic:'+name,g.rows);add('strongest',im.strongest);add('weakest',im.weakest);}else add('summary',j.result.summary);}
 return items;
 }
 const api={locate,key,collect};if(typeof module!=='undefined')module.exports=api;else window.EvidenceLinks=api;
})();
