'use client';
import {useEffect,useState} from 'react';
import VaultFace from '@/components/VaultFace';
import {useSpeech} from '@/lib/speech';
import {repo,msg} from '@/lib/repo';
import {createClient,hasSupabase} from '@/lib/supabase/client';
import {daysDone} from '@/lib/calc';
import type {Vault} from '@/lib/types';
// Opened by the browser extension when you reach a checkout on a store you chose.
export default function Shield(){
  const {speak,speaking,blocked}=useSpeech();
  const [site,setSite]=useState('this store'),[back,setBack]=useState(''),[v,setV]=useState<Vault|null>(null);
  const [amt,setAmt]=useState('10'),[done,setDone]=useState(''),[err,setErr]=useState('');
  const line=(s:string,a:Vault|null)=>a?`Hey, hold on a second. That’s a ${s} checkout. You’ve still got ${a.duration_days-daysDone(a)} days left on this one. How about putting a little in me instead?`:`Hey, hold on a second. That’s a ${s} checkout. Start a vault, and I’ll help you hold the line.`;
  useEffect(()=>{(async()=>{
    const q=new URLSearchParams(window.location.search),s=(q.get('site')||'this store').slice(0,40);
    setSite(s);setBack(q.get('forced')==='1'?'1':'');
    if(hasSupabase()){const{data}=await createClient().auth.getUser();if(!data.user){window.location.href='/login';return}}
    try{const a=(await repo().vaults()).find(x=>x.status==='active')??null;setV(a);speak(line(s,a))}catch(e){setErr(msg(e))}})()},[speak]);
  const cents=Math.round(Number(amt)*100),ok=!!v&&cents>0&&cents<=1e8&&!done;
  async function run(kind:'put'|'walk'){
    if(!ok||!v){setErr('Enter an amount above $0.');return}
    try{
      if(kind==='put'){await repo().addDeposit(v.id,cents);setDone('Recorded. Now move that money into your own savings account.');speak('Good call. Move that money into your savings, and I will keep it safe.')}
      else{await repo().addPurchase(v.id,'Checkout at '+site,site,cents);setDone('Logged as a resisted purchase.');speak('Smart. That is one more purchase resisted.')}
      setErr('')}catch(e){setErr(msg(e))}}
  const btn='rounded-lg px-5 py-3 font-semibold disabled:opacity-40';
  return <main className="mx-auto max-w-md p-6 text-center">
    <VaultFace speaking={speaking} onClick={()=>speak(line(site,v))}/>
    {blocked&&<p className="text-sm text-[#C9A96E]">Tap the vault to hear it.</p>}
    <p className="mt-4 text-xs tracking-[.25em] text-[#C9A96E]">BEFORE YOU SPEND…</p>
    <h1 className="font-serif text-3xl">You’re at a {site} checkout</h1>
    <p className="mt-2 text-[#929292]">You made a commitment to yourself. Put money in your vault instead?</p>
    {err&&<p className="mt-3 text-[#C9A96E]">{err}</p>}{done&&<p className="mt-3 text-[#C9A96E]">{done}</p>}
    {v&&<div className="mt-6 grid gap-3 rounded-2xl bg-[#202020] p-5">
      <label className="text-left text-sm text-[#929292]">Amount ($)<input value={amt} onChange={e=>setAmt(e.target.value)} type="number" min="0" step="0.01" className="mt-1 w-full rounded-lg bg-[#191919] p-3 text-[#F5F0E8]"/></label>
      <button disabled={!ok} onClick={()=>run('put')} className={btn+' bg-[#C9A96E] text-[#101010]'}>Put it in my vault</button>
      <button disabled={!ok} onClick={()=>run('walk')} className={btn+' border border-neutral-600'}>I’ll walk away (that was my cart)</button>
      {back&&<button onClick={()=>history.back()} className="text-sm text-[#929292] underline">Continue to checkout anyway</button>}</div>}
    {!v&&!err&&<a href="/" className="mt-6 inline-block text-[#C9A96E] underline">Create a vault</a>}
    <p className="mt-6 text-xs text-[#929292]">VAULT never moves your money. Moving it to savings is your step, and this records it.</p></main>;
}
