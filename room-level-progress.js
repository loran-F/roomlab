(function(g){
'use strict';
const KEY='roomlab-room-levels-v2',PREVIOUS='roomlab-room-levels-v1',LEGACY='roomlab-room-progress-v1';
const labels=Object.freeze(['入门','普通','困难']);
const strengths=Object.freeze([1,3,5]);
function strength(n){return Number.isInteger(n)&&n>=1&&n<=3?strengths[n-1]:null;}
function migrateTier(n){return Number.isInteger(n)&&n>=0&&n<=5?Math.ceil(n/2):0;}
let memory=null,storageWorks=true;
function validRoom(id){return (g.ROOM_CATALOG||[]).some(r=>r.id===id);}
function read(){
 if(memory)return memory;
 const db={schemaVersion:2,rooms:{},processedResults:{}};let current=false;
 try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw){if(raw.schemaVersion!==2)throw Error('Unknown level schema');current=true;for(const [id,value]of Object.entries(raw.rooms||{}))if(validRoom(id)&&Number.isInteger(value.highestCleared)&&value.highestCleared>=0&&value.highestCleared<=3)db.rooms[id]={highestCleared:value.highestCleared};for(const [id,seen]of Object.entries(raw.processedResults||{}))if(seen===true)db.processedResults[id]=true;}}
 catch(_){storageWorks=false;}
 if(!current){
 try{const old=JSON.parse(localStorage.getItem(PREVIOUS)||'null');if(old?.schemaVersion===1){for(const [id,value]of Object.entries(old.rooms||{}))if(validRoom(id))db.rooms[id]={highestCleared:migrateTier(value.highestCleared)};for(const [id,seen]of Object.entries(old.processedResults||{}))if(seen===true)db.processedResults[id]=true;}}catch(_){}
 try{const old=JSON.parse(localStorage.getItem(LEGACY)||'null');if(Array.isArray(old?.completed))for(const id of old.completed)if(validRoom(id))db.rooms[id]={highestCleared:Math.max(1,db.rooms[id]?.highestCleared||0)};}catch(_){}
 }
 return memory=db;
}
function status(roomId,developer=false){if(!validRoom(roomId))return null;const highest=read().rooms[roomId]?.highestCleared||0;return {roomId,highestCleared:highest,unlockedThrough:3,labels:labels.slice(),strengths:strengths.slice(),storageWorks};}
function canPlay(roomId,tier,developer=false){const s=status(roomId,developer);return !!s&&Number.isInteger(tier)&&tier>=1&&tier<=s.unlockedThrough;}
function complete({roomId,difficulty,resultId,win,developer=false}){
 if(developer||win!==true||!validRoom(roomId)||!Number.isInteger(difficulty)||difficulty<1||difficulty>3||typeof resultId!=='string'||!resultId)return false;
 const db=read();if(Object.prototype.hasOwnProperty.call(db.processedResults,resultId))return false;
 db.processedResults[resultId]=true;db.rooms[roomId]={highestCleared:Math.max(difficulty,db.rooms[roomId]?.highestCleared||0)};
 if(storageWorks)try{localStorage.setItem(KEY,JSON.stringify(db));}catch(_){storageWorks=false;}
 return true;
}
g.RoomLevelProgress=Object.freeze({storageKey:KEY,status,canPlay,complete,labels,strengths,strength,migrateTier});
})(window);
