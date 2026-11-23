'use client';
// A vault with a face: blinks, and its mouth moves while it speaks.
export default function VaultFace({speaking,onClick,size=220}:{speaking:boolean;onClick?:()=>void;size?:number}){
  return <button type="button" onClick={onClick} aria-label="Tap the vault to hear it" className="mx-auto block">
    <svg viewBox="0 0 200 200" width={size} height={size} style={{filter:speaking?'drop-shadow(0 0 14px #C9A96E)':undefined}}>
      <rect x="14" y="14" width="172" height="172" rx="26" fill="#1a1a1a" stroke="#C9A96E" strokeWidth="3"/>
      <circle cx="100" cy="100" r="70" fill="#242424" stroke="#C9A96E" strokeWidth="2"/>
      <g className="vf-blink"><circle cx="78" cy="88" r="7" fill="#F5F0E8"/><circle cx="122" cy="88" r="7" fill="#F5F0E8"/></g>
      <path d="M62 74Q78 66 92 72M108 72Q122 66 138 74" stroke="#C9A96E" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <ellipse cx="100" cy="125" rx={speaking?14:16} ry={speaking?9:2.5} fill="#101010" stroke="#C9A96E" strokeWidth="2" className={speaking?'vf-talk':''}/>
      <rect x="177" y="60" width="9" height="22" rx="3" fill="#C9A96E"/><rect x="177" y="118" width="9" height="22" rx="3" fill="#C9A96E"/>
    </svg></button>;
}
