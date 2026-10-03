'use strict';
window.LibraryStore = (() => {
  let database;
  async function open() {
    if (database) return database;
    database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('cangjing-library-v1', 2);
      request.onupgradeneeded = () => {
        for (const name of ['books','positions','annotations','organization']) {
          if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, {keyPath:'id'});
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return database;
  }
  async function putOrganization(rows){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('organization','readwrite');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('專案儲存已中止'));for(const row of rows)tx.objectStore('organization').put(row);});}
  window.ReaderData = {putOrganization,
    all: name => run(name,'readonly',s=>s.getAll()),
    put: (name,value) => run(name,'readwrite',s=>s.put(value)),
    remove: (name,id) => run(name,'readwrite',s=>s.delete(id))
  };
  async function run(store, mode, operation) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(store, mode);
      const request = operation(transaction.objectStore(store));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('儲存已中止'));
    });
  }
  async function restore(snapshot){const db=await open();return new Promise((resolve,reject)=>{const transaction=db.transaction(['books','positions','annotations','organization'],'readwrite');transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||Error('還原已中止'));for(const name of ['books','positions','annotations','organization']){const store=transaction.objectStore(name);store.clear();for(const row of snapshot[name])store.put(row);}});}
  async function update(id,transform){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('books','readwrite'),books=tx.objectStore('books'),request=books.get(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('文獻更新已中止'));request.onsuccess=()=>{try{if(!request.result)throw Error('文獻不存在');books.put(transform(request.result));}catch(e){tx.abort();reject(e);}};});}
  return {restore,update,all: () => run('books','readonly',s=>s.getAll()),get:id=>run('books','readonly',s=>s.get(id)),put:book=>run('books','readwrite',s=>s.put(book)),remove:id=>run('books','readwrite',s=>s.delete(id)),position:id=>run('positions','readonly',s=>s.get(id)),savePosition:p=>run('positions','readwrite',s=>s.put(p)),removePosition:async id=>{await run('positions','readwrite',s=>s.delete(id));await run('positions','readwrite',s=>s.delete(id+':web'));await run('positions','readwrite',s=>s.delete(id+':pdf'));}};
})();
