// Runs only on your device. It reads page addresses to spot checkouts and sends nothing anywhere.
const DEFAULTS={appUrl:'http://localhost:3000',sites:['amazon.com','nike.com','depop.com','ebay.com','shein.com','tiktok.com'],force:true,pause:600000};
const CHECKOUT=/(checkout|\/cart|\/basket|\/bag|payment|place-order|\/buy\b)/i;
chrome.webNavigation.onCommitted.addListener(async d=>{
  if(d.frameId!==0)return;let u;try{u=new URL(d.url)}catch{return}
  if(!/^https?:$/.test(u.protocol))return;
  const c=await chrome.storage.sync.get(DEFAULTS),host=u.hostname.replace(/^www\./,'');
  const site=c.sites.find(s=>host===s||host.endsWith('.'+s));
  if(!site||!CHECKOUT.test(u.pathname))return;
  const{last={}}=await chrome.storage.local.get('last');
  if(Date.now()-(last[site]||0)<c.pause)return;          // once per store every 10 minutes, so "Continue anyway" works
  last[site]=Date.now();await chrome.storage.local.set({last});
  const app=new URL('/shield',c.appUrl);app.searchParams.set('site',site);
  if(c.force){app.searchParams.set('forced','1');chrome.tabs.update(d.tabId,{url:app.toString()})}   // replaces the checkout tab
  else chrome.tabs.create({url:app.toString()});
});
