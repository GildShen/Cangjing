'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PdfWheel=api;})(typeof window==='object'?window:globalThis,()=>{
 class BoundaryWheel{
  constructor({now=()=>performance.now(),quiet=240}={}){this.now=now;this.quiet=quiet;this.last=-Infinity;this.consumed=false;this.rendering=false;this.blocked=false;}
  beginRender(){this.rendering=true;this.blocked=true;}
  endRender(){this.rendering=false;}
  reset(){this.last=-Infinity;this.consumed=false;this.rendering=false;this.blocked=false;}
  wheel({deltaX=0,deltaY=0,ctrlKey=false,shiftKey=false,allowed=true,top=0,max=0,index,count,enabled=true}){
   if(!enabled||!allowed||ctrlKey||shiftKey||!deltaY||Math.abs(deltaX)>=Math.abs(deltaY))return null;
   const time=this.now(),newGesture=time-this.last>=this.quiet;this.last=time;if(newGesture&&!this.rendering){this.consumed=false;this.blocked=false;}if(this.rendering||this.blocked||this.consumed)return null;
   if(deltaY>0&&top>=max-1&&index<count-1){this.consumed=true;this.blocked=true;return {index:index+1,anchor:'top'};}
   if(deltaY<0&&top<=1&&index>0){this.consumed=true;this.blocked=true;return {index:index-1,anchor:'bottom'};}return null;
  }
 }
 return {BoundaryWheel};
});
