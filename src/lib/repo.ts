// One interface, two backends: local browser storage (default) and Supabase.
import {createClient,hasSupabase} from './supabase/client';
import {isUnlocked} from './calc';
import type {Totals,Vault} from './types';
export const msg=(e:unknown):string=>typeof e==='object'&&e!==null&&'message' in e?String((e as {message:unknown}).message):'Something went wrong';
export interface Repo{
  vaults():Promise<Vault[]>;
  createVault(name:string,days:number):Promise<void>;
  addPurchase(vaultId:string,name:string,store:string,priceCents:number):Promise<void>;
  addDeposit(vaultId:string,cents:number):Promise<void>;
  totals(v:Vault):Promise<Totals>;
}
type Local={vaults:Vault[];purchases:{vault_id:string;price_cents:number}[];deposits?:{vault_id:string;cents:number}[]};
const K='vault.local.v1';
const read=():Local=>{try{return JSON.parse(localStorage.getItem(K)||'')}catch{return{vaults:[],purchases:[]}}};
const write=(d:Local)=>{try{localStorage.setItem(K,JSON.stringify(d))}catch{}};
const local:Repo={
  async vaults(){return read().vaults},
  async createVault(name,days){const d=read(),s=new Date(),u=new Date(s.getTime()+days*864e5);
    d.vaults.unshift({id:crypto.randomUUID(),name,start_date:s.toISOString().slice(0,10),duration_days:days,unlock_date:u.toISOString().slice(0,10),status:'active'});write(d)},
  async addPurchase(id,_n,_s,p){const d=read();d.purchases.push({vault_id:id,price_cents:p});write(d)},
  async addDeposit(id,c){const d=read();(d.deposits=d.deposits??[]).push({vault_id:id,cents:c});write(d)},
  async totals(v){const p=read().purchases.filter(x=>x.vault_id===v.id),ok=isUnlocked(v);
    return{potential_cents:ok?p.reduce((a,x)=>a+x.price_cents,0):null,actual_cents:ok?(read().deposits??[]).filter(x=>x.vault_id===v.id).reduce((a,x)=>a+x.cents,0):null,resisted:p.length,unlocked:ok}},
};
const supa:Repo={
  async vaults(){const{data,error}=await createClient().from('vaults').select('id,name,start_date,duration_days,unlock_date,status,overridden_at').order('created_at',{ascending:false});
    if(error)throw error;return data as Vault[]},
  // No .select() on inserts: price columns are not readable by the browser (see supabase/schema.sql).
  async createVault(name,days){const{error}=await createClient().from('vaults').insert({name,duration_days:days});if(error)throw error},
  async addPurchase(vault_id,name,store,price_cents){const{error}=await createClient().from('purchases').insert({vault_id,name,store,price_cents});if(error)throw error},
  // Self-reported deposit (VAULT never moves money). Allowed by the row-level security policy.
  async addDeposit(vault_id,c){const{error}=await createClient().from('ledger_entries').insert({vault_id,type:'deposit',source:'self_reported',state:'settled',amount_cents:c,idempotency_key:crypto.randomUUID()});if(error)throw error},
  async totals(v){const{data,error}=await createClient().rpc('vault_totals',{p_vault:v.id});if(error)throw error;
    return(data?.[0]??{potential_cents:null,actual_cents:null,resisted:0,unlocked:false}) as Totals},
};
export const repo=():Repo=>hasSupabase()?supa:local;
