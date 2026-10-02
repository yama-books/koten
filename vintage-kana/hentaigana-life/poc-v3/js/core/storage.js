window.HKLife=window.HKLife||{};
HKLife.Storage={
  dbName:"hentaigana-life-poc-v3",store:"world",key:"main",
  async open(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(this.dbName,1);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(this.store))db.createObjectStore(this.store)};
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
  },
  async save(world){
    const payload=JSON.parse(JSON.stringify(world));payload.savedAt=Date.now();
    try{
      const db=await this.open();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(this.store,"readwrite");tx.objectStore(this.store).put(payload,this.key);
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
      });
      localStorage.setItem("hklife:lastSavedAt",String(payload.savedAt));
    }catch(err){
      localStorage.setItem("hklife:fallback",JSON.stringify(payload));
    }
  },
  async load(){
    try{
      const db=await this.open();
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(this.store,"readonly");const req=tx.objectStore(this.store).get(this.key);
        req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
      });
    }catch(err){
      try{return JSON.parse(localStorage.getItem("hklife:fallback")||"null")}catch{return null}
    }
  },
  async clear(){
    try{
      const db=await this.open();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(this.store,"readwrite");tx.objectStore(this.store).delete(this.key);
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
      });
    }catch{}
    localStorage.removeItem("hklife:fallback");
  }
};
