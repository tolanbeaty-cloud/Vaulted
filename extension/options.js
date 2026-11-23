const D={appUrl:'http://localhost:3000',sites:['amazon.com','nike.com','depop.com','ebay.com','shein.com','tiktok.com']},$=id=>document.getElementById(id);
chrome.storage.sync.get(D).then(c=>{$('app').value=c.appUrl;$('sites').value=c.sites.join('\n')});
$('save').onclick=async()=>{let a;try{a=new URL($('app').value.trim())}catch{$('msg').textContent='Enter a full address starting with https://';return}
  const sites=$('sites').value.split('\n').map(s=>s.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/.*$/,'')).filter(Boolean);
  await chrome.storage.sync.set({appUrl:a.origin,sites});$('msg').textContent='Saved.'};
