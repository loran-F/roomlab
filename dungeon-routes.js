/* Host-generated, constrained route graphs. Loaded after game registration. */
(function(g){
'use strict';
const VERSION=3, TYPES=['fork','parallel','crossroads'];
const NAMES={fork:'分叉汇合',parallel:'双线并行',crossroads:'中段交汇'};
const ADAPTER_ONLY=['lockbox','silhouette','evidence','mirrors','pwslide','lightsearch'];
function policyOptions(policy,nativePool){
 if(policy==null)return null;
 if(typeof policy!=='object'||typeof policy.primary!=='string'||!Array.isArray(policy.pool)||typeof policy.boss!=='boolean')throw new Error('Invalid room route policy');
 const registry=g.PLAYGROUNDS,native=g.EV_POOL_NET||nativePool,adapters=g.RoomGameAdapters||{};
 function supported(mode){
  if(!Array.isArray(registry)||!registry.some(p=>p.id===mode))return false;
  const adapter=adapters[mode],ready=adapter&&typeof adapter.host==='function'&&typeof adapter.guest==='function';
  return ADAPTER_ONLY.includes(mode)?!!ready:!!ready||native.includes(mode);
 }
 const ordered=Number.isInteger(policy.order)&&policy.order>0;
 if(ordered&&policy.available===false)throw new Error('Room is not yet unlocked');
 const modes=Array.from(new Set(ordered?policy.pool:[policy.primary,...policy.pool]));
 [policy.primary,...modes].forEach(mode=>{if(typeof mode!=='string'||mode==='boss'||!supported(mode))throw new Error('Room mode has no dungeon adapter: '+mode);});
 if(policy.boss&&(!Array.isArray(registry)||!registry.some(p=>p.id==='boss')))throw new Error('Boss is not registered');
 const tutorialMode=policy.tutorialMode||policy.primary,advancedMode=policy.advancedMode||policy.primary,finaleMode=policy.finaleMode||(policy.boss?'boss':policy.primary);
 if(ordered&&(!supported(tutorialMode)||!supported(advancedMode)||(!policy.boss&&!supported(finaleMode))))throw new Error('Room stage mode has no dungeon adapter');
 return {roomId:policy.roomId,primary:policy.primary,pool:modes,firstVisit:!!policy.firstVisit,boss:policy.boss,title:String(policy.title||''),...(ordered?{order:policy.order,stage:policy.stage,tutorial:policy.tutorial!==false&&policy.tutorialMode!==null,tutorialMode,advancedMode,finaleMode,advanced:policy.advancedPrimary??policy.advanced!==false}: {})};
}
function rng(seed){let n=seed>>>0;return function(){n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
function profile(room){
 const minutes=Math.max(3,Math.min(30,Number(room.minutes)||8));
 const level=room.difficulty==='简单'?1:room.difficulty==='困难'?3:2;
 const bounds=minutes<=6?[4,4]:minutes<=9?[4,5]:[5,6];
 return {minutes,level,min:bounds[0],max:bounds[1],supply:level===1?'必经安全屋':level===2?'可选安全屋':'稀少补给',baseScale:level===1?1.08:level===2?1:.92};
}
function growthProfile(room,policy){
 const base=profile(room),stage=Number.isInteger(policy.stage)?policy.stage:policy.order<=4?1:policy.order<=8?2:policy.order<=13?3:4;
 if(stage<1||stage>4)throw new Error('Invalid route growth stage');
 const config=[null,{min:3,max:4,maxBranches:1,nodeMin:5,nodeMax:7},{min:5,max:6,maxBranches:2,nodeMin:9,nodeMax:13},{min:7,max:8,maxBranches:3,nodeMin:16,nodeMax:23},{min:10,max:12,maxBranches:3,nodeMin:26,nodeMax:36}][stage];
 return {...base,...config,stage,order:policy.order,supply:stage===1?'必经安全屋':'可选安全屋'};
}
function generateGrowth(room,seed,requested,families,policy){
 if(requested&&!TYPES.includes(requested))throw new Error('Unknown route layout');
 const p=growthProfile(room,policy),random=rng(seed),pick=a=>a[Math.floor(random()*a.length)],integer=(min,max)=>min+Math.floor(random()*(max-min+1));
 const pool=policy.pool.length?policy.pool:policy.order===1?[policy.primary]:[];
 if(!pool.length)throw new Error('No previously unlocked room games');
 const type=requested||pick(TYPES),floors=integer(p.min,p.max),guaranteed=p.stage===1,restRow=Math.max(1,Math.floor(floors*.6));
 const counts=Array(floors).fill(1),limits=Array(floors).fill(p.maxBranches);
 if(policy.tutorial)limits[0]=1;
 if(policy.boss&&policy.advanced)limits[floors-1]=1;
 // Each template has a random narrow floor, rather than a repeated column grid.
 if(type==='fork'&&floors>3)limits[integer(1,floors-2)]=1;
 if(type==='crossroads'&&floors>3)limits[integer(1,floors-2)]=Math.max(1,p.maxBranches-1);
 const extra=guaranteed?1:0,capacity=limits.reduce((sum,n)=>sum+n,0),low=Math.max(floors,p.nodeMin-2-extra),high=Math.min(capacity,p.nodeMax-2-extra);
 if(high<low)throw new Error('Growth node budget cannot fit route floors');
 const target=integer(low,high);
 // Reserve a genuine middle branch before allocating the remaining node budget.
 // Its sibling stays playable, so the safe room can always be bypassed.
 if(p.maxBranches>1){const wide=pick(limits.map((n,i)=>n===p.maxBranches&&i>0&&i<floors-1?i:-1).filter(i=>i>=0));counts[wide]=p.maxBranches;}
 let sum=counts.reduce((a,b)=>a+b,0);
 while(sum<target){const candidates=counts.map((n,i)=>n<limits[i]?i:-1).filter(i=>i>=0);counts[pick(candidates)]++;sum++;}
 if(guaranteed)counts.splice(restRow,0,1);
 const rows=[],nodes=[];
 function row(count,type){const layer=rows.length,xs=count===1?[50]:count===2?[24,76]:[16,50,84];const group=xs.map(x=>{const n={id:'n'+nodes.length,layer,type,x:Math.round((x+(count===1?0:(random()-.5)*6))*10)/10,y:0,done:type==='start',next:[],prev:[],mode:null};nodes.push(n);return n;});rows.push(group);}
 row(1,'start');counts.forEach((count,i)=>row(count,guaranteed&&i===restRow?'rest':'event'));row(1,'boss');
 function link(a,b){a.next.push(b.id);b.prev.push(a.id);}
 for(let l=0;l<rows.length-1;l++){const a=rows[l],b=rows[l+1];let i=0,j=0;link(a[0],b[0]);while(i<a.length-1||j<b.length-1){if(i===a.length-1)j++;else if(j===b.length-1)i++;else if(random()<(type==='parallel'?.8:.45)){i++;j++;}else if(random()<.5)i++;else j++;link(a[i],b[j]);}}
 if(!guaranteed){const options=rows.filter((r,i)=>i>1&&i<rows.length-2&&r.length>1);if(!options.length)throw new Error('Missing optional safe-room branch');pick(pick(options)).type='rest';}
 if(policy.tutorial)rows[1].forEach(n=>{n.mode=policy.tutorialMode;n.roomTutorial=true;});
 if(policy.boss&&policy.advanced)rows[rows.length-2].forEach(n=>{n.mode=policy.advancedMode;n.roomAdvanced=true;});
 const end=nodes[nodes.length-1];end.roomFinale=true;end.roomAdvanced=policy.advanced;
 if(!policy.boss){end.type='event';end.mode=policy.finaleMode;}
 const byId=Object.fromEntries(nodes.map(n=>[n.id,n])),uses={};
 nodes.forEach(n=>{
  n.y=90-n.layer/(rows.length-1)*80;n.routeTier=Math.min(4,1+Math.floor((p.stage-1)/2)+Math.floor(n.layer/5));
  if(n.type!=='event')return;
  if(!n.mode){const parents=n.prev.map(id=>byId[id]).filter(n=>n.type==='event'),siblings=rows[n.layer].filter(s=>s!==n&&s.mode).map(s=>s.mode);
   const ranked=pool.map(mode=>({mode,repeats:parents.filter(parent=>parent.mode===mode).length,chains:parents.filter(parent=>parent.mode===mode&&parent.prev.some(id=>byId[id].mode===mode)).length}));
   const best=Math.min(...ranked.map(x=>x.chains*100+x.repeats));const choices=ranked.filter(x=>x.chains*100+x.repeats===best).map(x=>({...x,weight:(siblings.includes(x.mode)?.12:1)/(1+(uses[x.mode]||0))*(families&&parents.some(parent=>families[parent.mode]&&families[parent.mode]===families[x.mode])?.6:1)}));
   let value=random()*choices.reduce((sum,x)=>sum+x.weight,0);n.mode=choices[choices.length-1].mode;choices.some(x=>{value-=x.weight;if(value<=0){n.mode=x.mode;return true;}return false;});
  }uses[n.mode]=(uses[n.mode]||0)+1;
 });
 const d={roomId:room.id,hp:5,maxHp:5,nodes,start:nodes[0].id,boss:end.id,posA:nodes[0].id,posB:nodes[0].id,cur:'A',locked:{},over:false,win:false,_t:null,coopHistory:[],coopAlarm:0,
  route:{version:VERSION,seed:seed>>>0,type,name:p.stage===1?'入门路线':type==='parallel'?'分路并行':NAMES[type],floors,layers:counts.length,minutes:p.minutes,level:p.level,supply:p.supply,baseScale:p.baseScale,ending:policy.boss?'boss':'primary',id:(seed>>>0).toString(36)+'-'+room.id,stage:p.stage,order:p.order,maxBranches:p.maxBranches,nodeCount:nodes.length},
  progression:{roomId:room.id,primary:policy.primary,pool:policy.pool.slice(),firstVisit:policy.firstVisit,boss:policy.boss,title:policy.title,order:p.order,stage:p.stage,tutorial:policy.tutorial,tutorialMode:policy.tutorialMode,advancedMode:policy.advancedMode,finaleMode:policy.finaleMode,advanced:policy.advanced}};
 const check=validate(d);if(!check.ok)throw new Error(check.errors.join('; '));return d;
}
function generate(room,pool,seed,requested,families,options){
 const policy=policyOptions(options,pool);
 if(policy&&policy.order)return generateGrowth(room,seed,requested,families,policy);
 if(policy)pool=policy.pool;
 if(!pool.length)throw new Error('No registered dungeon games');
 if(requested&&!TYPES.includes(requested))throw new Error('Unknown route layout');
 const random=rng(seed),pick=a=>a[Math.floor(random()*a.length)],p=profile(room);
 const floors=p.min+Math.floor(random()*(p.max-p.min+1));
 const type=requested||pick(p.level===1?['fork','parallel']:TYPES);
 const counts=Array.from({length:floors},()=>p.level===1?2:pick([2,2,3]));
 if(type==='parallel')counts.fill(2);
 if(type==='fork')counts[Math.floor(floors/2)]=1;
 if(type==='crossroads'){counts[Math.floor(floors/2)]=1;counts[0]=3;counts[counts.length-1]=3;}
 const guaranteed=p.level===1,restRow=Math.floor(counts.length*.6);
 if(guaranteed)counts.splice(restRow,0,1);
 const nodes=[],rows=[];let nextId=0;
 function row(count,type){const layer=rows.length;const xs=count===1?[50]:count===2?[24,76]:[16,50,84];const group=xs.map(x=>{const n={id:'n'+nextId++,layer,type,x:Math.round((x+(count===1?0:(random()-.5)*8))*10)/10,y:0,done:type==='start',next:[],prev:[],mode:null};nodes.push(n);return n;});rows.push(group);return group;}
 row(1,'start');counts.forEach((n,i)=>row(n,guaranteed&&i===restRow?'rest':'event'));row(1,'boss');
 function link(a,b){if(!a.next.includes(b.id)){a.next.push(b.id);b.prev.push(a.id);}}
 for(let l=0;l<rows.length-1;l++){
  const a=rows[l],b=rows[l+1];let i=0,j=0;link(a[i],b[j]);
  // Monotone staircase: covers every endpoint without crossing edges.
  while(i<a.length-1||j<b.length-1){
   if(i===a.length-1)j++;else if(j===b.length-1)i++;
   else if(type==='parallel'||random()<.6){i++;j++;}
   else if((i+1)/a.length<(j+1)/b.length)i++;else j++;
   link(a[i],b[j]);
  }
 }
 if(!guaranteed&&(p.level===2||random()<.45)){
  const options=rows.filter((r,i)=>i>=2&&i<rows.length-2&&r.length>1);if(options.length)pick(pick(options)).type='rest';
 }
 if(policy){
  rows[1].forEach(n=>{n.mode=policy.primary;n.roomTutorial=true;});
  rows[rows.length-2].forEach(n=>{n.mode=policy.primary;n.roomAdvanced=true;});
  const end=rows[rows.length-1][0];end.roomFinale=true;
  if(!policy.boss){end.type='event';end.mode=policy.primary;end.roomAdvanced=true;}
 }
 const reviewLayers=new Set();
 if(policy&&pool.some(mode=>mode!==policy.primary)){
  const middle=rows.filter((r,i)=>i>1&&i<rows.length-2);
  middle.forEach(r=>{if(r[0].layer%2===0)reviewLayers.add(r[0].layer);});
  // An optional rest must not let a path skip its only review encounter.
  if(!middle.some(r=>reviewLayers.has(r[0].layer)&&r.every(n=>n.type==='event'))){
   const required=middle.find(r=>r.every(n=>n.type==='event'));if(required)reviewLayers.add(required[0].layer);
  }
 }
 const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
 nodes.forEach(n=>{
  n.y=90-n.layer/(rows.length-1)*80;
  n.routeTier=Math.min(4,p.level===3?2+Math.floor(n.layer/3):p.level===2?1+Math.floor(n.layer/4):1);
  if(n.type!=='event')return;
  if(policy&&n.mode===policy.primary)return;
  let choices=pool;
  if(policy){
   // Alternate main-game practice with unlocked review/reward floors.
   const review=pool.filter(mode=>mode!==policy.primary);
   choices=reviewLayers.has(n.layer)&&review.length?review:[policy.primary];
  }
  const siblings=rows[n.layer].filter(x=>x!==n&&x.mode).map(x=>x.mode);
  const parents=n.prev.map(id=>byId[id]).filter(x=>x.type==='event');
  const ranked=choices.map(mode=>({mode,weight:(siblings.includes(mode)?.02:1)*parents.reduce((w,parent)=>w*(parent.mode===mode?.04:families&&families[mode]&&families[mode]===families[parent.mode]?.25:1),1)}));
  let value=random()*ranked.reduce((sum,x)=>sum+x.weight,0);n.mode=ranked[ranked.length-1].mode;
  ranked.some(x=>{value-=x.weight;if(value<=0){n.mode=x.mode;return true;}return false;});
 });
 const d={roomId:room.id,hp:5,maxHp:5,nodes,start:nodes[0].id,boss:nodes[nodes.length-1].id,posA:nodes[0].id,posB:nodes[0].id,cur:'A',locked:{},over:false,win:false,_t:null,coopHistory:[],coopAlarm:0,
  route:{version:2,seed:seed>>>0,type,name:NAMES[type],floors,layers:counts.length,minutes:p.minutes,level:p.level,supply:p.supply,baseScale:p.baseScale,ending:policy&&!policy.boss?'primary':'boss',id:(seed>>>0).toString(36)+'-'+room.id}};
 if(policy)d.progression={roomId:room.id,primary:policy.primary,pool:policy.pool.slice(),firstVisit:policy.firstVisit,boss:policy.boss,title:policy.title};
 const check=validate(d);if(!check.ok)throw new Error(check.errors.join('; '));return d;
}
function validate(d){
 const errors=[],byId=new Map(d.nodes.map(n=>[n.id,n]));
 if(byId.size!==d.nodes.length)errors.push('Duplicate node ID');
 function reach(id,dir,blocked=new Set()){const seen=new Set(),stack=[id];while(stack.length){const id=stack.pop();if(seen.has(id)||blocked.has(id))continue;seen.add(id);const n=byId.get(id);if(n)stack.push(...n[dir]);}return seen;}
 const from=reach(d.start,'next'),to=reach(d.boss,'prev');
 d.nodes.forEach(n=>{
  if(!from.has(n.id)||!to.has(n.id))errors.push('Unreachable '+n.id);
  if(n.x<12||n.x>88||!Number.isFinite(n.y))errors.push('Invalid position');
  n.next.forEach(id=>{const t=byId.get(id);if(!t||t.layer!==n.layer+1||!t.prev.includes(n.id))errors.push('Invalid edge');});
  n.prev.forEach(id=>{const t=byId.get(id);if(!t||!t.next.includes(n.id))errors.push('Invalid reverse edge');});
 });
 const edges=d.nodes.flatMap(n=>n.next.map(id=>[n,byId.get(id)]));
 edges.forEach(([a,b],i)=>edges.slice(i+1).forEach(([c,e])=>{if(b&&e&&a.layer===c.layer&&a.id!==c.id&&b.id!==e.id&&(a.x-c.x)*(b.x-e.x)<0)errors.push('Crossing edges');}));
 if(d.progression&&d.route&&d.route.version>=3){
  const plan=d.progression,end=byId.get(d.boss),first=d.nodes.filter(n=>n.layer===1),pool=plan.pool.length?plan.pool:plan.order===1?[plan.primary]:[];
  if(plan.tutorial&&(first.length!==1||first.some(n=>n.mode!==plan.tutorialMode||!n.roomTutorial)))errors.push('Missing primary tutorial');
  if(!end||!end.roomFinale||!!end.roomAdvanced!==!!plan.advanced||(plan.boss?end.type!=='boss':end.type!=='event'||end.mode!==plan.finaleMode))errors.push('Invalid room finale');
  if(plan.boss&&plan.advanced&&d.nodes.filter(n=>n.layer===end.layer-1).some(n=>!n.roomAdvanced||n.mode!==plan.advancedMode||n.type!=='event'))errors.push('Missing primary advanced encounter');
  if(d.nodes.some(n=>n.roomAdvanced&&!n.roomFinale&&(!plan.boss||n.layer!==end.layer-1||n.mode!==plan.advancedMode)))errors.push('Unexpected advanced encounter');
  if(d.nodes.some(n=>n.type==='event'&&!(n.roomTutorial||n.roomAdvanced||n.roomFinale)&&!pool.includes(n.mode)))errors.push('Mode outside unlocked pool');
  if(d.nodes.some(n=>n.roomTutorial&&(n.layer!==1||!plan.tutorial)))errors.push('Unexpected tutorial');
  const counts=new Map();d.nodes.forEach(n=>counts.set(n.layer,(counts.get(n.layer)||0)+1));if([...counts.values()].some(n=>n>d.route.maxBranches))errors.push('Excess route width');
  const rests=d.nodes.filter(n=>n.type==='rest'),bypass=reach(d.start,'next',new Set(rests.map(n=>n.id))).has(d.boss);
  if(rests.length!==1)errors.push('Expected exactly one safe room');
  if(rests.some(n=>n.roomTutorial||n.roomAdvanced||n.roomFinale||n.id===d.start||n.id===d.boss))errors.push('Safe room replaces protected encounter');
  if(rests.some(n=>!from.has(n.id)||!to.has(n.id)))errors.push('Safe room has no complete route');
  if(plan.stage===1?bypass:!bypass)errors.push('Invalid safe-room bypass');
  if(d.route.supply!==(plan.stage===1?'必经安全屋':'可选安全屋'))errors.push('Invalid supply description');
 }else if(d.progression){
  const plan=d.progression,first=d.nodes.filter(n=>n.layer===1),end=byId.get(d.boss),last=end&&d.nodes.filter(n=>n.layer===end.layer-1);
  if(!first.length||first.some(n=>n.type!=='event'||n.mode!==plan.primary||!n.roomTutorial))errors.push('Missing primary tutorial');
  if(!last||!last.length||last.some(n=>n.type!=='event'||n.mode!==plan.primary||!n.roomAdvanced))errors.push('Missing advanced primary');
  if(!end||!end.roomFinale||(plan.boss?end.type!=='boss':end.type!=='event'||end.mode!==plan.primary||!end.roomAdvanced))errors.push('Invalid room finale');
  if(!Array.isArray(plan.pool)||d.nodes.some(n=>n.type==='event'&&!plan.pool.includes(n.mode)))errors.push('Mode outside room pool');
 }
 return {ok:!errors.length,errors};
}
const api=g.DungeonRoutes={profile,growthProfile,generate,validate,types:TYPES,policyOptions};
if(typeof newDungeon!=='function')return;
const originalNew=newDungeon,originalSnapshot=dgSnapshot,originalApply=applyDungeon;
// Calling the previous constructor first preserves other modules' session resets.
newDungeon=function(){
 originalNew();
 if(window._netMode!=='host')return;
 const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);
 const policy=g.RoomProgression&&typeof g.RoomProgression.getRoutePolicy==='function'?g.RoomProgression.getRoutePolicy(selectedRoom()):null;
 DUNGEON=generate(selectedRoom(),EV_POOL_NET.slice(),bytes[0],null,g.COOP_UPGRADE&&g.COOP_UPGRADE.families,policy);
};
dgSnapshot=function(){
 const snapshot=originalSnapshot();if(!DUNGEON.route)return snapshot;
 snapshot.route={...DUNGEON.route};snapshot.start=DUNGEON.start;snapshot.boss=DUNGEON.boss;
 if(DUNGEON.progression)snapshot.progression=JSON.parse(JSON.stringify(DUNGEON.progression));
 snapshot.nodes=DUNGEON.nodes.map(n=>({id:n.id,layer:n.layer,type:n.type,x:n.x,y:n.y,mode:n.mode,done:n.done,locked:!!DUNGEON.locked[n.id],next:n.next.slice(),prev:n.prev.slice(),routeTier:n.routeTier,roomTutorial:!!n.roomTutorial,roomAdvanced:!!n.roomAdvanced,roomFinale:!!n.roomFinale}));
 return snapshot;
};
applyDungeon=function(data){
 if(data.route&&[1,2,VERSION].includes(data.route.version)){
  // Build B's board from A's graph, never from a local random constructor.
  if(!DUNGEON||!DUNGEON.route||DUNGEON.route.id!==data.route.id){
   const candidate={...data,nodes:data.nodes.map(n=>({...n,next:n.next.slice(),prev:n.prev.slice()}))};
   if(!validate(candidate).ok)return;
   DUNGEON={...candidate,route:{...data.route},locked:{},cur:'B',_t:null};
  }
  if(data.progression)DUNGEON.progression=JSON.parse(JSON.stringify(data.progression));
 }
 return originalApply(data);
};
// Apply room difficulty and depth alongside the existing repeat-mode modifier.
const originalDifficulty=g.coopDifficulty;
if(originalDifficulty)g.coopDifficulty=function(){
 const c=originalDifficulty();if(!window._dungeon||!DUNGEON||!DUNGEON.route)return c;
 const n=dgNode(window._dgNode);if(!n||S.mod==='dungeon')return c;
 if(n.roomTutorial)return {...c,tier:1,timeScale:1};
 const depth=Math.max(0,n.layer-1)/Math.max(1,DUNGEON.nodes.find(x=>x.id===DUNGEON.boss).layer-1);
 const scale=DUNGEON.route.baseScale*(1-depth*.07);
 return {...c,tier:Math.max(c.tier||1,n.routeTier||1,n.roomAdvanced?2:1),timeScale:Math.max(.5,(c.timeScale||1)*scale)};
};
function describe(room){const p=profile(room),plan=g.RoomProgression&&g.RoomProgression.getPlan(room);return (p.min===p.max?p.min:p.min+'–'+p.max)+(p.level===1?' 关挑战':' 层路线')+(plan&&!plan.boss?' + 终章 · ':' + 首领 · ')+p.supply;}
const oldDraw=dgDrawMap;
dgDrawMap=function(){
 oldDraw();if(!DUNGEON||!DUNGEON.progression)return;
 DUNGEON.nodes.forEach(n=>{
  const tag=n.roomFinale?'终章':n.roomTutorial?'入门':n.roomAdvanced?'进阶':null;if(!tag)return;
  const button=document.querySelector('.dg-node[data-id="'+n.id+'"]'),label=button&&button.querySelector('.dg-node-label');if(!label)return;
  const mark=document.createElement('small');mark.className='route-stage';mark.textContent=tag;label.appendChild(mark);button.setAttribute('aria-label',button.getAttribute('aria-label')+'，'+tag);
 });
};
const oldMenu=renderDungeonMenu;
renderDungeonMenu=function(){
 oldMenu();const target=document.getElementById('room-info');if(!target)return;
 function update(){const meta=target.querySelector('.room-meta');if(meta&&!meta.textContent.includes('约'))meta.innerHTML=meta.innerHTML.replace(/(\d+)分钟/,'约$1分钟');}
 update();const observer=new MutationObserver(()=>{if(!target.isConnected){observer.disconnect();return;}update();});observer.observe(target,{childList:true});
 const previous=window._routeMenuObserver;if(previous)previous.disconnect();window._routeMenuObserver=observer;
};
const oldShell=renderDungeonMapShell;
renderDungeonMapShell=function(role,code){
 oldShell(role,code);if(!DUNGEON||!DUNGEON.route)return;
 const screen=document.querySelector('.dungeon-screen');if(!screen)return;
 const newRoute=screen.dataset.routeId!==DUNGEON.route.id;screen.dataset.routeId=DUNGEON.route.id;
 let bar=screen.querySelector('.route-summary');if(!bar){bar=document.createElement('div');bar.className='route-summary';screen.querySelector('.dg-topline').after(bar);}
 const room=ROOM_CATALOG.find(r=>r.id===DUNGEON.roomId),r=DUNGEON.route;
 bar.replaceChildren();['约 '+r.minutes+' 分钟 · '+(room?room.difficulty:''),r.name,r.layers+' 层 + '+(r.ending==='primary'?'终章':'首领')].forEach((text,i)=>{const el=document.createElement(i===1?'b':'span');el.textContent=text;bar.appendChild(el);});
 const help=screen.querySelector('.dg-map-help');if(help){let p=help.querySelector('.route-details');if(!p){p=document.createElement('p');p.className='route-details';help.appendChild(p);}p.textContent=r.supply+'。每层选一条分支；重试保留地图，新开一局重新生成。时间为顺利通关的预估，练习和重试会延长。';}
 dgDrawMap();
 if(newRoute){const paper=screen.querySelector('.scroll-paper'),node=dgNode(DUNGEON[role==='A'?'posA':'posB']);if(paper&&node)paper.scrollTop=node.y/100*dgMapHeight()-paper.clientHeight*.68;}
};
})(typeof window==='undefined'?globalThis:window);
