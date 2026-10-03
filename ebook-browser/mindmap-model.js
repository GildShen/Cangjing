'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MindMapModel=api;})(typeof window==='object'?window:globalThis,()=>{
 const GROUPS={questions:'研究問題',concepts:'理論與概念',methods:'研究方法',findings:'研究發現',limitations:'結論與限制',other:'其他／待確認'};
 const certainty=s=>s.some(x=>x.certainty==='ambiguous')?'待確認':s.some(x=>x.certainty==='inferred')?'AI 推論':'作者明載';
 function project(documents,graphs,results={}){
  const root={id:'scope-root',label:'範圍內文獻',kind:'scope',sources:[],children:[]};
  for(const doc of documents){const result=results[doc.id]||{},graph=graphs[doc.id]||{nodes:[],edges:[]},groups=new Map(),used=new Set();const branch=key=>{if(!groups.has(key))groups.set(key,{id:doc.id+':group:'+key,label:GROUPS[key],kind:'group',sources:[],children:[]});return groups.get(key);};
   const add=(key,item)=>branch(key).children.push(item);
   for(const key of ['questions','methods','findings','limitations'])for(const [i,item]of (result[key]||[]).entries()){const sources=[{documentId:doc.id,page:item.page,quote:item.quote,certainty:'ambiguous'}];const exact=graph.nodes.filter(n=>n.name===item.value&&n.sources.some(s=>s.documentId===doc.id&&s.page===item.page&&s.quote===item.quote));for(const n of exact)used.add(n.id);add(key,{id:doc.id+':field:'+key+':'+i,label:item.value,kind:'content',sources:exact.length?exact.flatMap(n=>n.sources.filter(s=>s.documentId===doc.id)):sources,originalIds:exact.map(n=>n.id),children:[]});}
   for(const n of graph.nodes){const sources=n.sources.filter(s=>s.documentId===doc.id);if(!sources.length||used.has(n.id))continue;const key=({concept:'concepts',theory:'concepts',method:'methods',finding:'findings'})[n.type]||'other';add(key,{id:doc.id+':node:'+n.id,label:n.name,kind:'content',sources,originalIds:[n.id],children:[]});}
   const children=Object.keys(GROUPS).filter(k=>groups.has(k)).map(k=>groups.get(k));if(children.length)root.children.push({id:doc.id+':root',label:doc.title,kind:'document',documentId:doc.id,sources:[],children});
  }
  return root.children.length===1?root.children[0]:root;
 }
 function wrap(text,maxWidth,measure){const lines=[];let line='';for(const char of Array.from(String(text))){if(char==='\n'){lines.push(line);line='';continue;}if(line&&measure(line+char)>maxWidth){lines.push(line);line=char;}else line+=char;}lines.push(line);return lines;}
 function layout(root,{collapsed=new Set(),measure=s=>Array.from(s).length*14,gap=24,depthGap=72}={}){
  const nodes=[],edges=[],widths=[];function prepare(item,depth){const label=item.kind==='document'&&Array.from(item.label).length>40?Array.from(item.label).slice(0,40).join('')+'…':item.label;const width=item.kind==='content'?256:232,lines=wrap(label,width-40,measure),height=Math.max(64,lines.length*24+40+(item.kind==='content'?24:item.children.length&&item.kind!=='group'?44:0));const children=collapsed.has(item.id)?[]:(item.children||[]).map(n=>prepare(n,depth+1));const childHeight=children.reduce((n,c)=>n+c.span,0)+Math.max(0,children.length-1)*gap;const row={...item,lines,width,height,depth,visibleChildren:children,span:Math.max(height,childHeight),badge:item.kind==='content'?certainty(item.sources):item.children.length+' 項'};widths[depth]=Math.max(widths[depth]||0,width);return row;}const tree=prepare(root,0),xs=[32];for(let i=1;i<widths.length;i++)xs[i]=xs[i-1]+widths[i-1]+depthGap;
  function place(row,top){row.x=xs[row.depth];row.y=top+(row.span-row.height)/2;nodes.push(row);const childHeight=row.visibleChildren.reduce((n,c)=>n+c.span,0)+Math.max(0,row.visibleChildren.length-1)*gap;let cursor=top+(row.span-childHeight)/2;for(const child of row.visibleChildren){place(child,cursor);edges.push({parent:row.id,child:child.id,x1:row.x+row.width,y1:row.y+row.height/2,x2:child.x,y2:child.y+child.height/2});cursor+=child.span+gap;}}
  place(tree,32);return {nodes,edges,width:xs.at(-1)+(widths.at(-1)||232)+32,height:tree.span+64};
 }
 return {GROUPS,certainty,project,wrap,layout};
});
