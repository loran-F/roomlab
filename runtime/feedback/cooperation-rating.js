(function(g){
'use strict';
const KEY='roomlab-cooperation-rating-v1',VERSION='v1';
const attempts=new Set(['beat','beam','vault','wires','lockbox','silhouette','evidence','mirrors','pwslide']);
let memory=null,storageWorks=true;
function score(r,config={}){
 if(!r||typeof r.win!=='boolean'||r.stage==='interrupted'||r.reasonCode==='disconnected')return null;
 if(!r.win)return {version:VERSION,grade:'C',score:null,provisional:false,basis:'本次目标未完成'};
 const m=r.metrics||{};let numerator,denominator,label;
 if(attempts.has(r.gameId)){numerator=m.mistakesRemaining;denominator=m.maxMistakes;label='剩余机会';}
 else if(['pressure','boss'].includes(r.gameId)){numerator=m.hp;denominator=config.initialHp;label='剩余耐久';}
 if(Number.isFinite(numerator)&&Number.isFinite(denominator)&&denominator>0&&numerator>=0&&numerator<=denominator){const value=70+30*numerator/denominator;return {version:VERSION,grade:value>=95?'S':value>=85?'A':'B',score:value,provisional:false,basis:label+' '+numerator+' / '+denominator};}
 return {version:VERSION,grade:'B',score:null,provisional:true,basis:'仅依据通关，表现数据尚不完整'};
}
function read(){if(memory)return memory;try{const raw=localStorage.getItem(KEY);if(raw){const data=JSON.parse(raw);if(data.schemaVersion!==1||!data.results||!data.rooms)throw Error('Invalid rating store');memory=data;}}catch(_){storageWorks=false;}return memory||(memory={schemaVersion:1,ratingVersion:VERSION,results:{},rooms:{}});}
function record(r,rating,context={}){
 if(!rating||context.role!=='A'||context.excluded||!r.resultId)return false;
 const db=read();if(Object.prototype.hasOwnProperty.call(db.results,r.resultId))return false;
 const roomId=r.dungeon&&r.dungeon.roomId;
 db.results[r.resultId]={gameId:r.gameId,win:r.win,rating,roomId:roomId||null};
 if(r.stage==='room-complete'&&roomId){const old=db.rooms[roomId]||{clearCount:0,bestStars:0};db.rooms[roomId]={clearCount:old.clearCount+1,bestStars:Math.max(old.bestStars,1),lastClearAt:Date.now()};}
 // Keep tombstones: pruning IDs without a closed-session watermark permits replay double-counting.
 if(storageWorks)try{localStorage.setItem(KEY,JSON.stringify(db));}catch(_){storageWorks=false;}
 return true;
}
function decorate(root,r,rating){if(!rating)return;const box=document.createElement('section');box.className='cr-result';const grade=document.createElement('strong');grade.textContent='本局评级 '+rating.grade+(rating.provisional?' · 暂定':'');const basis=document.createElement('p');basis.textContent=rating.basis;box.append(grade,basis);if(r.stage==='room-complete'){const stars=document.createElement('p');stars.textContent='★ ☆ ☆ · 密室通关（完整节点记录不足，星级暂定）';box.append(stars);}root.append(box);}
g.CooperationRating=Object.freeze({VERSION,score,record,decorate,status:()=>({storageWorks}),storageKey:KEY});
})(window);
