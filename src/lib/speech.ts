'use client';
import {useCallback,useEffect,useState} from 'react';
import {loadCfg} from './settings';
// Free browser voices. Natural/neural voices (Edge, Chrome, Apple "Premium") sound far more human than the default.
const score=(v:SpeechSynthesisVoice)=>(/natural|neural|premium|enhanced/i.test(v.name)?15:0)+(/online|siri|google (us|uk) english|samantha|ava|allison|jenny|aria|guy|daniel|serena/i.test(v.name)?8:0)+(/en-(US|GB)/i.test(v.lang)?2:0);
export const rankVoices=(vs:SpeechSynthesisVoice[])=>vs.filter(v=>/^en/i.test(v.lang)).sort((a,b)=>score(b)-score(a));
export function useSpeech(){
  const [speaking,setSpeaking]=useState(false),[blocked,setBlocked]=useState(false);
  const speak=useCallback((text:string)=>{
    if(typeof window==='undefined'||!('speechSynthesis' in window))return;
    const s=window.speechSynthesis,c=loadCfg(),all=rankVoices(s.getVoices()),v=all.find(x=>x.name===c.voice)??all[0];
    s.cancel();
    const parts=(text.match(/[^.!?]+[.!?]*/g)??[text]).map(p=>p.trim()).filter(Boolean);
    parts.forEach((p,i)=>{
      const u=new SpeechSynthesisUtterance(p);if(v)u.voice=v;u.rate=c.rate;u.pitch=1+(i%2?.04:-.02);
      if(i===0)u.onstart=()=>{setSpeaking(true);setBlocked(false)};
      if(i===parts.length-1)u.onend=()=>setSpeaking(false);
      u.onerror=e=>{setSpeaking(false);if(e.error==='not-allowed')setBlocked(true)};
      s.speak(u)})},[]);
  useEffect(()=>()=>{if(typeof window!=='undefined')window.speechSynthesis?.cancel()},[]);
  return{speak,speaking,blocked};
}
