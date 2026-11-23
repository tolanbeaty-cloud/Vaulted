// Pure calculations, kept separate from UI.
import type {Vault} from './types';
const DAY=864e5;
const start=(v:Vault)=>new Date(v.start_date).getTime();
export const unlockAt=(v:Vault)=>start(v)+v.duration_days*DAY;
export const daysDone=(v:Vault,now=Date.now())=>Math.max(0,Math.min(v.duration_days,Math.floor((now-start(v))/DAY)));
export const progress=(v:Vault,now=Date.now())=>Math.round(daysDone(v,now)/v.duration_days*100);
export const isUnlocked=(v:Vault,now=Date.now())=>now>=unlockAt(v)||!!v.overridden_at||v.status==='completed';
export const xp=(days:number,purchases:number)=>days*10+Math.floor(days/7)*25+purchases*15;
export const level=(x:number)=>Math.floor(x/150)+1;
export const dollars=(c:number)=>'$'+(c/100).toLocaleString(undefined,{maximumFractionDigits:2});
