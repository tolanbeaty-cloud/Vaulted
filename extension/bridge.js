// Lets your VAULT website send your store list to this extension. It only talks to the address saved in Options.
(async()=>{
  const{appUrl}=await chrome.storage.sync.get({appUrl:''});
  if(location.origin!==appUrl)return;
  const ok=s=>typeof s==='string'&&s.length<=60&&/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s);
  window.addEventListener('message',async e=>{
    const d=e.data;
    if(e.source!==window||e.origin!==location.origin||!d||d.source!=='vault-app'||d.type!=='sync'||!Array.isArray(d.sites))return;
    const sites=d.sites.filter(ok).slice(0,60);
    await chrome.storage.sync.set({sites,force:!!d.force});
    window.postMessage({source:'vault-ext',type:'ack',count:sites.length},location.origin);
  });
  window.postMessage({source:'vault-ext',type:'ready'},location.origin);
})();
