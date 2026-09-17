(function(g){
'use strict';
const version=new URL(document.currentScript.src).search;
const packs={catch:['expansion-games','catch-mobile'],beam:['expansion-games','beam-mobile'],maze:['maze-location-model','maze-mobile','maze-art-skin'],vault:['vault-mobile'],dial:['radio-mobile'],wires:['wires-mobile'],code:['code-symbols','code-five-tier'],pressure:['pressure-five-tier'],pwslide:['password-strip','picture-guess-deck','picture-guess-core','picture-guess-input','picture-guess'],lightsearch:['rhythm-light'],lookback:['expansion-games'],caller:['expansion-games'],shadow:['expansion-games'],silhouette:['puzzle-pack'],mirrors:['puzzle-pack'],evidence:['puzzle-pack'],lockbox:['puzzle-pack']};
const locations={"maze-art-skin":"games/maze/maze-art-skin","picture-guess-deck":"games/password-strip/picture-guess-deck","picture-guess-core":"games/password-strip/picture-guess-core","picture-guess-input":"games/password-strip/picture-guess-input","picture-guess":"games/password-strip/picture-guess","maze-location-model":"games/maze/maze-location-model","expansion-games":"games/shared/expansion/expansion-games","puzzle-pack":"games/shared/puzzles/puzzle-pack","catch-mobile":"games/catch/catch-mobile","beam-mobile":"games/beam/beam-mobile","maze-mobile":"games/maze/maze-mobile","vault-mobile":"games/vault/vault-mobile","radio-mobile":"games/radio/radio-mobile","wires-mobile":"games/wires/wires-mobile","code-symbols":"games/code/code-symbols","code-five-tier":"games/code/code-five-tier","pressure-five-tier":"games/pressure/pressure-five-tier","password-strip":"games/password-strip/password-strip","rhythm-light":"games/rhythm-light/rhythm-light"};
const noCSS=new Set(['picture-guess-deck','picture-guess-core','picture-guess-input','maze-location-model','code-symbols','code-five-tier','pressure-five-tier']);
const loaded=new Map();let queue=Promise.resolve();
function failure(message,key,code){const error=new Error(message+key);error.resource=key;error.code=code;return error;}
function waitFor(entry,key){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{entry.timeouts++;reject(failure('加载超时：',key,'RESOURCE_TIMEOUT'));},20000);
  entry.promise.then(()=>{clearTimeout(timer);resolve();},error=>{clearTimeout(timer);reject(error);});
 });
}
function file(name,css){
 const key=locations[name]+(css?'.css':'.js');let entry=loaded.get(key);
 if(!entry){
  const el=document.createElement(css?'link':'script');entry={state:'loading',timeouts:0,error:null,promise:null};
  if(css){el.rel='stylesheet';el.href=key+version;}else{el.src=key+version;el.async=false;}
  // A detached classic script may still execute when its response arrives.
  // Timeout ends only this wait: keep one in-flight element until load/error.
  entry.promise=new Promise((resolve,reject)=>{
   el.onload=()=>{el.onload=el.onerror=null;entry.state='ready';resolve();};
   el.onerror=()=>{el.onload=el.onerror=null;entry.state='failed';entry.error='RESOURCE_LOAD_ERROR';el.remove();if(loaded.get(key)===entry)loaded.delete(key);reject(failure('加载失败：',key,'RESOURCE_LOAD_ERROR'));};
  });
  loaded.set(key,entry);document.head.append(el);
 }
 return waitFor(entry,key);
}
function load(mode){if(!packs[mode])return Promise.reject(new Error('未知玩法'));const job=queue.then(async()=>{for(const name of packs[mode]){await Promise.all([file(name,false),...(noCSS.has(name)?[]:[file(name,true)])]);}if(!g.RoomGameAdapters?.[mode])throw new Error('玩法未注册：'+mode);});queue=job.catch(()=>{});return job;}
g.RoomModeLoader=Object.freeze({load,modes:Object.freeze(Object.keys(packs)),status:()=>({resources:Array.from(loaded.keys()),entries:Array.from(loaded,([resource,entry])=>({resource,state:entry.state,timeouts:entry.timeouts,error:entry.error}))})});
})(window);
