'use client';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient,hasSupabase} from '@/lib/supabase/client';
export default function Login(){
  const r=useRouter(),form=useRef<HTMLFormElement>(null),[msg,setMsg]=useState('');
  async function submit(mode:'in'|'up'){
    if(!hasSupabase()){r.replace('/');return}
    const f=form.current;if(!f||!f.reportValidity())return;
    const d=new FormData(f),creds={email:String(d.get('email')),password:String(d.get('password'))},auth=createClient().auth;
    const {data,error}=mode==='in'?await auth.signInWithPassword(creds):await auth.signUp(creds);
    if(error){setMsg(error.message);return}
    if(mode==='up'&&!data.session){setMsg('Check your email to confirm your account, then sign in.');return}
    r.replace('/');
  }
  return <main className="mx-auto max-w-sm p-8"><h1 className="font-serif text-3xl tracking-widest text-[#C9A96E]">VAULT</h1>
    <form ref={form} className="mt-8 grid gap-3" onSubmit={e=>{e.preventDefault();submit('in')}}>
      <input name="email" type="email" required placeholder="Email" className="rounded-lg bg-[#191919] p-3"/>
      <input name="password" type="password" required minLength={8} placeholder="Password (8+ characters)" className="rounded-lg bg-[#191919] p-3"/>
      <button type="submit" className="rounded-lg bg-[#C9A96E] p-3 font-semibold text-[#101010]">Sign in</button>
      <button type="button" className="rounded-lg border border-neutral-700 p-3" onClick={()=>submit('up')}>Create account</button>
      <p className="text-sm text-[#C9A96E]">{msg}</p></form></main>;
}
