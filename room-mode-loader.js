(function(g){
'use strict';
const version=new URL(document.currentScript.src).search;
const packs={catch:['expansion-games','catch-mobile'],beam:['expansion-games','beam-mobile'],maze:['maze-mobile'],vault:['vault-mobile'],dial:['radio-mobile'],wires:['wires-mobile'],code:['code-symbols','code-five-tier'],pressure:['pressure-five-tier'],pwslide:['password-strip'],lightsearch:['rhythm-light'],lookback:['expansion-games'],caller:['expansion-games'],shadow:['expansion-games'],silhouette:['puzzle-pack'],mirrors:['puzzle-pack'],evidence:['puzzle-pack'],lockbox:['puzzle-pack']};
const noCSS=new Set(['code-symbols','code-five-tier','pressure-five-tier']);
const loaded=new Map();let queue=Promise.resolve();
function file(name,css){const key=name+(css?'.css':'.js');if(loaded.has(key))return loaded.get(key);const promise=new Promise((resolve,reject)=>{const el=document.createElement(css?'link':'script');if(css){el.rel='stylesheet';el.href=key+version;}else{el.src=key+version;el.async=false;}const timer=setTimeout(()=>finish(new Error('加载超时：'+key)),20000);function finish(error){clearTimeout(timer);el.onload=el.onerror=null;if(error){el.remove();loaded.delete(key);reject(error);}else resolve();}el.onload=()=>finish();el.onerror=()=>finish(new Error('加载失败：'+key));document.head.append(el);});loaded.set(key,promise);return promise;}
function load(mode){if(!packs[mode])return Promise.reject(new Error('未知玩法'));const job=queue.then(async()=>{for(const name of packs[mode]){await Promise.all([file(name,false),...(noCSS.has(name)?[]:[file(name,true)])]);}if(!g.RoomGameAdapters?.[mode])throw new Error('玩法未注册：'+mode);});queue=job.catch(()=>{});return job;}
g.RoomModeLoader=Object.freeze({load,modes:Object.freeze(Object.keys(packs)),status:()=>({resources:Array.from(loaded.keys())})});
})(window);
