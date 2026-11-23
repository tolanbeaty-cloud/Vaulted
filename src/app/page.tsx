'use client';
import {useCallback,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import VaultFace from '@/components/VaultFace';
import {useSpeech} from '@/lib/speech';
import {repo,msg} from '@/lib/repo';
import {createClient,hasSupabase} from '@/lib/supabase/client';
import {daysDone,dollars,level,progress,unlockAt,xp} from '@/lib/calc';
import type {Totals,Vault} from '@/lib/types';
export default function Dashboard(){
  const {speak,speaking}=useSpeech(),r=useRouter(),[vault,setVault]=useState<Vault|null>(null),[t,setT]=useState<Totals|null>(null),[err,setErr]=useState(''),[ready,setReady]=useState(false);
  const load=useCallback(async()=>{
    try{const vs=await repo().vaults(),a=vs.find(v=>v.status==='active')??null;setVault(a);setT(a?await repo().totals(a):null)}
    catch(e){setErr('Could not load your vaults: '+msg(e))}setReady(true)},[]);
  useEffect(()=>{(async()=>{
    if(hasSupabase()){const{data}=await createClient().auth.getUser();if(!data.user){r.replace('/login');return}}
    load()})()},[load,r]);
  async function create(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget),n=String(f.get('name')).trim(),d=Number(f.get('days'));
    if(n.length<2||!(d>=1&&d<=730)){setErr('Name needs 2+ characters and duration 1–730 days.');return}
    try{await repo().createVault(n,d);setErr('');load()}catch(e){setErr('Could not create the vault: '+msg(e))}}
  async function add(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!vault)return;const form=e.currentTarget,f=new FormData(form),p=Math.round(Number(f.get('price'))*100);
    const n=String(f.get('item')).trim(),s=String(f.get('store')).trim();
    if(!n||!s||!(p>0)){setErr('Enter an item, a store and a price above $0.');return}
    try{await repo().addPurchase(vault.id,n,s,p);form.reset();setErr('');load()}catch(e){setErr('Could not save that purchase: '+msg(e))}}
  const talk=()=>vault&&speak(`${vault.name}. Day ${daysDone(vault)} of ${vault.duration_days}. Your savings are locked, and I’ve got them safe.`);
  if(!ready)return <main className="p-8 text-[#929292]">Loading…</main>;
  const inp='rounded-lg bg-[#191919] p-3',btn='rounded-lg bg-[#C9A96E] px-5 py-3 font-semibold text-[#101010]';
  return <main className="mx-auto max-w-2xl p-6">
    <p className="text-xs tracking-[.25em] text-[#C9A96E]">LOCK AWAY YOUR SPENDING. UNLOCK YOUR FUTURE.</p>
    {err&&<p className="mt-3 text-[#C9A96E]">{err}</p>}
    {!vault?<form onSubmit={create} className="mt-6 grid gap-3 rounded-2xl bg-[#202020] p-6"><h2 className="font-serif text-2xl">Create a vault</h2>
      <input name="name" placeholder="Vault name" maxLength={40} className={inp}/>
      <select name="days" className={inp}>{[7,14,30,60,90,180].map(d=><option key={d} value={d}>{d} days</option>)}</select><button className={btn}>Lock the vault</button></form>
    :<><motion.section initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="mt-6 rounded-2xl bg-[#202020] p-8 text-center">
      <VaultFace speaking={speaking} onClick={talk}/><h1 className="mt-3 font-serif text-3xl">{vault.name}</h1>
      <p className="mt-4 text-xs tracking-[.25em] text-[#C9A96E]">{t?.unlocked?'YOUR VAULT IS OPEN':'YOUR SAVINGS ARE LOCKED'}</p>
      <p className="font-serif text-5xl">{t?.potential_cents!=null?dollars(t.potential_cents):'$••••••'}</p>
      <div className="mt-4 h-2 overflow-hidden rounded bg-[#191919]"><div className="h-full bg-[#C9A96E]" style={{width:`${progress(vault)}%`}}/></div>
      <p className="mt-2 text-sm text-[#929292]">Day {daysDone(vault)} of {vault.duration_days} · unlocks {new Date(unlockAt(vault)).toLocaleDateString()}</p>
      <p className="mt-2 text-sm">Level {level(xp(daysDone(vault),t?.resisted??0))} · {t?.resisted??0} resisted</p></motion.section>
    <form onSubmit={add} className="mt-4 grid gap-3 rounded-2xl bg-[#202020] p-6"><h2 className="font-serif text-2xl">Log a resisted purchase</h2>
      <input name="item" placeholder="Item" maxLength={60} className={inp}/><input name="store" placeholder="Store" maxLength={40} className={inp}/>
      <input name="price" type="number" min="0" step="0.01" placeholder="Price ($)" className={inp}/><button className={btn}>Record</button></form></>}
    <p className="mt-6 text-sm"><a href="/settings" className="text-[#C9A96E] underline">Voice and store settings</a></p>
    <p className="mt-2 text-sm text-[#929292]">VAULT is not a bank and never holds your money. Avoided purchases are potential savings, not deposits.</p></main>;
}
