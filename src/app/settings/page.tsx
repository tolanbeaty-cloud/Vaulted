'use client';
import {useEffect,useRef,useState} from 'react';
import VaultFace from '@/components/VaultFace';
import {rankVoices,useSpeech} from '@/lib/speech';
import {activeSites,cleanHost,loadCfg,okHost,saveCfg,type Cfg} from '@/lib/settings';
export default function Settings(){
  const {speak,speaking}=useSpeech(),ref=useRef<Cfg|null>(null);
  const [c,setC]=useState<Cfg|null>(null),[voices,setVoices]=useState<string[]>([]),[ext,setExt]=useState('Checking for the extension…'),[nw,setNw]=useState(''),[err,setErr]=useState('');
  const post=(n:Cfg)=>window.postMessage({source:'vault-app',type:'sync',sites:activeSites(n),force:n.force},window.location.origin);
  useEffect(()=>{
    const cfg=loadCfg();ref.current=cfg;setC(cfg);post(cfg);
    const ss=window.speechSynthesis,load=()=>setVoices(rankVoices(ss?.getVoices()??[]).map(v=>v.name));load();ss?.addEventListener('voiceschanged',load);
    const on=(e:MessageEvent)=>{if(e.source!==window||e.data?.source!=='vault-ext')return;
      if(e.data.type==='ready'&&ref.current)post(ref.current);
      if(e.data.type==='ack')setExt(`Extension synced: watching ${e.data.count} stores.`)};
    window.addEventListener('message',on);
    const t=setTimeout(()=>setExt(x=>x.startsWith('Checking')?'Extension not detected. Install it and save this site’s address in its options.':x),1500);
    return()=>{ss?.removeEventListener('voiceschanged',load);window.removeEventListener('message',on);clearTimeout(t)}},[]);
  function update(n:Cfg){ref.current=n;saveCfg(n);setC(n);post(n)}
  function add(){const h=cleanHost(nw);if(!okHost(h)){setErr('Enter a website like example.com');return}
    if(c&&!c.sites.some(s=>s.n===h))update({...c,sites:[...c.sites,{n:h,on:true}]});setNw('');setErr('')}
  if(!c)return <main className="p-8 text-[#929292]">Loading…</main>;
  const box='rounded-2xl bg-[#202020] p-5 mt-4 grid gap-3',inp='rounded-lg bg-[#191919] p-3 text-[#F5F0E8]';
  return <main className="mx-auto max-w-xl p-6">
    <a href="/" className="text-sm text-[#C9A96E] underline">← Back to your vault</a>
    <h1 className="mt-3 font-serif text-3xl">Voice and stores</h1>
    <section className={box}><h2 className="font-serif text-xl">Voice</h2>
      <VaultFace speaking={speaking} size={120} onClick={()=>speak('Hey. This is how I sound. Pick the voice that feels right.')}/>
      <select className={inp} value={c.voice} onChange={e=>update({...c,voice:e.target.value})}>
        <option value="">Best available</option>{voices.map(v=><option key={v} value={v}>{v}</option>)}</select>
      <label className="text-sm text-[#929292]">Speed<input type="range" min=".7" max="1.2" step=".05" value={c.rate} onChange={e=>update({...c,rate:Number(e.target.value)})} className="w-full"/></label>
      <button className="rounded-lg border border-neutral-600 p-3" onClick={()=>speak('Hey. Hold on a second. How about putting a little in the vault instead?')}>Preview</button>
      <p className="text-xs text-[#929292]">Voices named “Natural”, “Neural” or “Premium” sound the most human. Edge and Chrome have the best free ones.</p></section>
    <section className={box}><h2 className="font-serif text-xl">Stores to watch</h2>
      {c.sites.map((s,i)=><label key={s.n} className="flex items-center gap-3"><input type="checkbox" checked={s.on} onChange={e=>update({...c,sites:c.sites.map((x,j)=>j===i?{...x,on:e.target.checked}:x)})}/>{s.n}
        <button className="ml-auto text-xs text-[#929292] underline" onClick={e=>{e.preventDefault();update({...c,sites:c.sites.filter((_,j)=>j!==i)})}}>remove</button></label>)}
      <div className="flex gap-2"><input value={nw} onChange={e=>setNw(e.target.value)} placeholder="Add a store, e.g. zara.com" className={inp+' flex-1'}/><button onClick={add} className="rounded-lg bg-[#C9A96E] px-4 font-semibold text-[#101010]">Add</button></div>
      {err&&<p className="text-sm text-[#C9A96E]">{err}</p>}
      <label className="flex items-center gap-3"><input type="checkbox" checked={c.force} onChange={e=>update({...c,force:e.target.checked})}/>Take over the checkout tab (instead of opening a new tab)</label>
      <p className="text-sm text-[#C9A96E]">{ext}</p>
      <p className="text-xs text-[#929292]">Apps: phone apps can’t be intercepted from a website or a browser extension. That needs separate native iPhone and Android apps.</p></section></main>;
}
