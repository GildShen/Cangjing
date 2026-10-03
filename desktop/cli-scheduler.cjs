'use strict';
class CliScheduler{
 constructor(){this.pending=[];this.active=null;this.serial=0;}
 run(owner,operation,priority='interactive'){return new Promise((resolve,reject)=>{this.pending.push({owner,operation,priority,resolve,reject,serial:++this.serial});this.next();});}
 next(){if(this.active)return;this.pending.sort((a,b)=>(a.priority==='background')-(b.priority==='background')||a.serial-b.serial);const task=this.pending.shift();if(!task)return;this.active=task;Promise.resolve().then(task.operation).then(task.resolve,task.reject).finally(()=>{this.active=null;this.next();});}
 cancel(owner){const removed=this.pending.filter(t=>t.owner===owner);this.pending=this.pending.filter(t=>t.owner!==owner);for(const task of removed)task.reject(Error('已取消等待中的 CLI 工作'));return removed.length>0;}
}
module.exports={CliScheduler};
