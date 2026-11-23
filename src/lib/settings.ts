'use client';
// Voice and store preferences, kept in this browser. The store list is also sent to the extension.
export type Cfg={voice:string;rate:number;force:boolean;sites:{n:string;on:boolean}[]};
export const DEFAULT_SITES=['amazon.com','nike.com','depop.com','ebay.com','shein.com','tiktok.com'];
const K='vault.cfg.v1';
const def=():Cfg=>({voice:'',rate:.95,force:true,sites:DEFAULT_SITES.map(n=>({n,on:true}))});
export function loadCfg():Cfg{try{return{...def(),...JSON.parse(localStorage.getItem(K)||'{}')}}catch{return def()}}
export const saveCfg=(c:Cfg)=>{try{localStorage.setItem(K,JSON.stringify(c))}catch{}};
export const activeSites=(c:Cfg)=>c.sites.filter(s=>s.on).map(s=>s.n);
export const cleanHost=(s:string)=>s.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/.*$/,'');
export const okHost=(s:string)=>/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s)&&s.length<=60;
