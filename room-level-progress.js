(function(g){
'use strict';
const KEY='roomlab-room-levels-v1',LEGACY='roomlab-room-progress-v1';
const labels=Object.freeze(['教学','入门','标准','困难','极限']);
let memory=null,storageWorks=true;
function validRoom(id){return (g.ROOM_CATALOG||[]).some(r=>r.id===id);}
function read(){
 if(memory)return memory;
 const db={schemaVersion:1,rooms:{},processedResults:{}};
 try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw){if(raw.schemaVersion!==1)throw Error('Unknown level schema');for(const [id,value]of Object.entries(raw.rooms||{}))if(validRoom(id)&&Number.isInteger(value.highestCleared)&&value.highestCleared>=0&&value.highestCleared<=5)db.rooms[id]={highestCleared:value.highestCleared};for(const [id,seen]of Object.entries(raw.processedResults||{}))if(seen===true)db.processedResults[id]=true;}}
 catch(_){storageWorks=false;}
 try{const old=JSON.parse(localStorage.getItem(LEGACY)||'null');if(Array.isArray(old?.completed))for(const id of old.completed)if(validRoom(id))db.rooms[id]={highestCleared:Math.max(1,db.rooms[id]?.highestCleared||0)};}catch(_){}
 return memory=db;
}
function status(roomId,developer=false){if(!validRoom(roomId))return null;const highest=read().rooms[roomId]?.highestCleared||0;return {roomId,highestCleared:highest,unlockedThrough:5,labels:labels.slice(),storageWorks};}
function canPlay(roomId,tier,developer=false){const s=status(roomId,developer);return !!s&&Number.isInteger(tier)&&tier>=1&&tier<=s.unlockedThrough;}
function complete({roomId,tier,resultId,win,developer=false}){
 if(developer||win!==true||!validRoom(roomId)||!Number.isInteger(tier)||tier<1||tier>5||typeof resultId!=='string'||!resultId)return false;
 const db=read();if(Object.prototype.hasOwnProperty.call(db.processedResults,resultId))return false;
 db.processedResults[resultId]=true;db.rooms[roomId]={highestCleared:Math.max(tier,db.rooms[roomId]?.highestCleared||0)};
 if(storageWorks)try{localStorage.setItem(KEY,JSON.stringify(db));}catch(_){storageWorks=false;}
 return true;
}
g.RoomLevelProgress=Object.freeze({storageKey:KEY,status,canPlay,complete,labels});
})(window);
