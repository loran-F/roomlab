/* Room content, local unlock ledger and native-game dungeon bridge. No publishing. */
(function(g){
'use strict';
const STORAGE='roomlab-room-progress-v1';
const NATIVE=['lockbox','silhouette','evidence','mirrors','pwslide','lightsearch'];
const LEGACY=['catch','beam','beat','maze','dial','wires','code','vault','pressure','lookback','caller','shadow','boss'];
const ROWS=[
 ['room-1','catch','接住小花盆','接住窗边落下的花盆，守护两个人的小家。',['beam','pwslide'],false],
 ['room-13','pwslide','出口密码锁','A 水平拖动奇数条，B 水平拖动偶数条，共同还原同一个四位密码。',['code','lockbox'],false],
 ['room-14','silhouette','衣帽间剪影','借灯光与服饰的影子，还原镜前的目标轮廓。',['mirrors','pwslide'],false],
 ['room-15','beam','鱼箱入库','两人托稳搬运梁，把鱼箱安全送进收货口。',['catch','pressure'],false],
 ['room-18','vault','旧照片里的秘密','记住一闪而过的旧档案，拼出他漫长的过去。',['evidence','code'],false],
 ['room-16','maze','山径迷踪','一人探路，一人看地图，打开岔路机关找到出口。',['evidence','lightsearch'],false],
 ['room-12','caller','夜班身份核验','查验公司来电的身份与任务，找出混进来的冒牌员工。',['vault','pwslide'],true],
 ['room-5','lockbox','神秘封印盒','听同伴描述盒子背面的变化，拆开留下的封印。',['code','shadow'],false],
 ['room-19','mirrors','引光解封','转动镜片，把光引向剑上的封印。',['silhouette','code'],false],
 ['room-2','lightsearch','暗房寻电','一人掌握亮灯时机，一人趁亮搜索房间。',['maze','shadow'],false],
 ['room-4','shadow','双胞胎的影子','录下另一个自己的行动，让影子替同伴打开门。',['silhouette','lockbox'],false],
 ['room-17','lookback','停走生存赛','观察者随时转身，两个人互报信号、停走过关。',['beat','maze'],false],
 ['room-8','pressure','收容舱稳压','盯住压力与安全区，让收容舱保持稳定。',['wires','dial'],true],
 ['room-3','wires','最后一道机关','逐步核对线索，剪断危险线路，失误时合作救场。',['pressure','code'],true],
 ['room-20','code','符咒辨认','描述符咒细节，找出能解除封印的暗号。',['lockbox','mirrors'],false],
 ['room-21','dial','深夜电台','两人调整频率与增益，从杂音里接回清晰信号。',['caller','beat'],false],
 ['room-22','evidence','宫廷疑案','对照物证与口供，查清人物、工具和时间。',['vault','code'],false]
];
const ROOM_ORDER=['room-1','room-13','room-15','room-14','room-18','room-16','room-20','room-19','room-21','room-17','room-4','room-22','room-3','room-12','room-5','room-2','room-8'];
const plans=ROWS.map(r=>({roomId:r[0],primary:r[1],title:r[2],brief:r[3],supports:r[4],boss:r[5],order:ROOM_ORDER.indexOf(r[0])+1})).sort((a,b)=>a.order-b.order);
ROOM_CATALOG.sort((a,b)=>ROOM_ORDER.indexOf(a.id)-ROOM_ORDER.indexOf(b.id));
let memory=[],storageWorks=true,context=null,pendingSession=null,serial=0,accessMode='player';
function validIds(ids){return Array.isArray(ids)?Array.from(new Set(ids.filter(id=>plans.some(p=>p.roomId===id)))):[];}
function history(options){try{const raw=localStorage.getItem(STORAGE),data=JSON.parse(raw||'{}');memory=validIds(memory.concat(validIds(data.completed)));if(raw&&(data.version==null||data.version===1)&&!testView(options))save();}catch(e){storageWorks=false;}return plans.filter(p=>memory.includes(p.roomId)).map(p=>p.roomId);}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify({version:2,orderVersion:1,completed:validIds(memory)}));}catch(e){storageWorks=false;}}
function completed(options){return history(options);}
function getPlan(room){const id=typeof room==='string'?room:room&&room.id;return plans.find(p=>p.roomId===id)||null;}
function testView(options){return accessMode==='developer'||!!(options&&options.testAllUnlocked);}
function isRoomUnlocked(room,options){return !!getPlan(room);}
function unlock(roomId,joinedCompletion){if(accessMode==='developer'||!getPlan(roomId)||(!joinedCompletion&&!isRoomUnlocked(roomId)))return false;const ids=history(),fresh=!ids.includes(roomId);if(fresh){memory=ids.concat(roomId);save();}return fresh;}
function supportsDungeon(mode){if(!PLAYGROUNDS.some(p=>p.id===mode))return false;if(LEGACY.includes(mode))return true;const a=g.RoomGameAdapters&&g.RoomGameAdapters[mode];return NATIVE.includes(mode)&&!!a&&typeof a.host==='function'&&typeof a.guest==='function';}
function unlocked(options){return testView(options)?PLAYGROUNDS.map(p=>p.id):plans.filter(p=>completed().includes(p.roomId)).map(p=>p.primary);}
function getRoutePolicy(room,options){const p=getPlan(room);if(!p)return null;const known=unlocked(options),randomPool=(p.order===1?[p.primary]:plans.filter(q=>q.order<p.order&&known.includes(q.primary)).map(q=>q.primary)).filter(supportsDungeon);return {primary:p.primary,pool:randomPool.slice(),randomPool:randomPool.slice(),masteredPool:known.slice(),strictPool:true,order:p.order,stage:p.order<=4?1:p.order<=8?2:p.order<=13?3:4,available:isRoomUnlocked(p.roomId,options),tutorialMode:p.primary,advancedMode:p.primary,finaleMode:p.boss?'boss':p.primary,tutorialPrimary:true,advancedPrimary:true,finalePrimary:true,firstVisit:!testView(options)&&!completed().includes(p.roomId),boss:p.boss,title:p.title,roomId:p.roomId};}
function progress(options){const cleared=completed(options);return {version:2,orderVersion:1,accessMode:testView(options)?'developer':'player',order:ROOM_ORDER.slice(),completed:cleared,history:history(options),unlockedRooms:plans.filter(p=>isRoomUnlocked(p.roomId,options)).map(p=>p.roomId),masteredPool:unlocked(options),nextRoomId:plans.find(p=>!cleared.includes(p.roomId))?.roomId||null,storageWorks};}
function setAccessMode(mode){if(!['player','developer'].includes(mode))throw new Error('Invalid progression access mode');accessMode=mode;menu();return progress();}
const api=g.RoomProgression={plans,getPlan,getRoutePolicy,supportsDungeon,completed,unlocked,storageKey:STORAGE,progress,isRoomUnlocked,masteredPool:unlocked,setAccessMode,order:()=>ROOM_ORDER.slice()};
g.RoomGameAdapters=g.RoomGameAdapters||{};
function invalidate(){if(context)context.ended=true;context=null;pendingSession=null;g._roomGameContext=null;}
function ctxFor(role){const n=dgNode(window._dgNode),d=DUNGEON;if(!n||!d)return null;const token=pendingSession||d.route&&d.route.id+':'+n.id+':'+(++serial)||Date.now()+':'+(++serial);pendingSession=null;const c={protocol:1,sessionId:token,roomId:d.roomId,nodeId:n.id,mode:n.mode,role,tutorial:!!n.roomTutorial,finale:!!(n.roomFinale||n.finalEncounter),tier:typeof coopDifficulty==='function'?coopDifficulty().tier:1,theme:getPlan(d.roomId),ended:false};
 c.isActive=()=>context===c&&!c.ended&&DUNGEON===d&&window._dungeon&&window._dgNode===c.nodeId&&S.mod===c.mode;
 c.finish=result=>{if(role!=='A'||!c.isActive())return false;const data=typeof result==='boolean'?{win:result}:result;if(!data||typeof data.win!=='boolean')return false;if(g.RoomResults)return g.RoomResults.report(data);c.ended=true;dungeonEnd(data.win);return true;};
 c.abort=()=>{if(!c.isActive())return false;c.ended=true;dungeonAbort();return true;};context=c;g._roomGameContext=c;return c;
}
function resultContext(c){
 if(!g.RoomResults)return;const room=ROOM_CATALOG.find(r=>r.id===c.roomId),d=DUNGEON,n=dgNode(c.nodeId);
 g.RoomResults.begin({runId:c.sessionId,role:c.role,connection:PEER.conn,gameId:c.mode,roomTitle:room&&room.name,title:(PLAYGROUNDS.find(p=>p.id===c.mode)||{}).name,art:room&&room.image,dungeon:{roomId:c.roomId,nodeId:c.nodeId,final:c.finale},
 apply:data=>{if(data.win){d.coopHistory=d.coopHistory||[];d.coopHistory.push({node:n.id,mode:n.mode});n.done=true;if(c.finale){d.over=true;d.win=true;unlock(c.roomId);}}else{if(d.roomId==='room-8')d.coopAlarm=Math.min(3,(d.coopAlarm||0)+1);d.hp=Math.max(0,d.hp-1);const back=n.prev.map(id=>dgNode(id)).find(p=>p&&p.done);if(back)d.posA=d.posB=back.id;if(d.hp===0){d.over=true;d.win=false;}}return {hpAfter:d.hp,over:!!d.over,win:!!d.win,snapshot:dgSnapshot()};},
 onResult:r=>{if(c.role==='B'&&r.dungeon&&r.dungeon.snapshot){applyDungeon(r.dungeon.snapshot);if(r.stage==='room-complete')unlock(c.roomId,true);}},
 onContinue:r=>{clearTimers();invalidate();window._dungeon=false;S.mod='dungeon';if(c.role==='A'){if(r.dungeon.over)newDungeon();dgBroadcast();renderDungeonHostMap();}else renderDungeonGuestMap(PEER.room);},
 onExit:()=>{netSend({t:'bye'});clearTimers();closePeer();invalidate();window._dungeon=false;window._netMode=null;renderDungeonMenu();}});
}
g.roomResultsBeginLegacy=function(role,token){if(!window._dungeon||NATIVE.includes(S.mod))return null;pendingSession=token||('result:'+Date.now()+':'+(++serial));const c=ctxFor(role);if(c)resultContext(c);return c&&c.sessionId;};
function adapter(role){const a=g.RoomGameAdapters[S.mod];if(!a||typeof a[role==='A'?'host':'guest']!=='function')return false;const c=ctxFor(role);if(!c)return false;resultContext(c);a[role==='A'?'host':'guest'](c);return true;}
// Native adapters include their own un-timed instructions and preparation.
const oldEnter=dgEnterHost;dgEnterHost=function(id){if(DUNGEON&&!isRoomUnlocked(DUNGEON.roomId))return;const n=dgNode(id);if(!n||!NATIVE.includes(n.mode)||n.type!=='event')return oldEnter.apply(this,arguments);if(window._netMode!=='host'||n.done||DUNGEON.locked[id])return;if(!supportsDungeon(n.mode)){dgMsg('这个玩法暂时无法进入，请返回选择其他密室。');return;}
 invalidate();DUNGEON.nodes.forEach(x=>{if(x.layer===n.layer&&x.id!==id&&!x.done)DUNGEON.locked[x.id]=true;});window._dungeon=true;window._dgNode=id;S.mod=n.mode;pendingSession=(DUNGEON.route?DUNGEON.route.id:'room')+':'+id+':'+(++serial);dgBroadcast();netSend({t:'enter',node:id,mode:n.mode,roomSessionId:pendingSession});adapter('A');
};
const oldManual=renderManual;renderManual=function(){if(window._dungeon&&NATIVE.includes(S.mod)){adapter('B');return;}return oldManual.apply(this,arguments);};
const oldPlay=renderPlayDungeonHost;renderPlayDungeonHost=function(){if(window._dungeon&&NATIVE.includes(S.mod)){adapter('A');return;}return oldPlay.apply(this,arguments);};
const oldGuest=dgGuestOnData;dgGuestOnData=function(d){if(d&&d.t==='enter'){invalidate();pendingSession=d.roomSessionId||null;}if(d&&['dgAbort','dgEnd','bye'].includes(d.t))invalidate();return oldGuest.apply(this,arguments);};
const oldAbort=dungeonAbort;dungeonAbort=function(){invalidate();return oldAbort.apply(this,arguments);};
// One host terminal gateway for all modes, including ordinary-game finales.
let settled=null;
const oldEnd=dungeonEnd;dungeonEnd=function(ok){if(!DUNGEON||window._netMode!=='host')return oldEnd.apply(this,arguments);const n=dgNode(window._dgNode);if(!window._dungeon||DUNGEON.over||!n||n.done)return;const stamp=(DUNGEON.route?DUNGEON.route.id:'room')+':'+n.id;if(settled===stamp&&(!context||context.ended))return;settled=stamp;invalidate();clearTimers();if(ok&&(n.roomFinale||n.finalEncounter)){dgBossWin();return;}const result=oldEnd.apply(this,arguments);settled=null;return result;};
const oldBoss=dgBossWin;dgBossWin=function(){invalidate();return oldBoss.apply(this,arguments);};
const oldDifficulty=coopDifficulty;coopDifficulty=function(){const c=oldDifficulty();const n=window._dungeon&&DUNGEON&&dgNode(window._dgNode);if(!n)return c;if(n.roomTutorial)return {...c,tier:1,streak:1,timeScale:1,baseScale:1};if(n.roomAdvanced)return {...c,tier:Math.max(2,c.tier||1)};return c;};
// Meaningful titles apply only to the primary game of the selected room.
const oldLabel=dgNodeLabel;dgNodeLabel=function(n){const p=DUNGEON&&getPlan(DUNGEON.roomId);return p&&n.type==='event'&&n.mode===p.primary?p.title:oldLabel(n);};
const oldPG=dgPG;dgPG=function(mode){const p=DUNGEON&&getPlan(DUNGEON.roomId),game=oldPG(mode);return game&&p&&mode===p.primary?{...game,name:p.title}:game;};
const oldOver=renderDungeonOver;renderDungeonOver=function(win){let fresh=false,p=null;if(win&&DUNGEON&&DUNGEON.over&&DUNGEON.win){p=getPlan(DUNGEON.roomId);if(p)fresh=unlock(p.roomId);}oldOver.apply(this,arguments);if(p){const el=document.createElement('section');el.className='rp-unlocked';const game=PLAYGROUNDS.find(x=>x.id===p.primary);el.innerHTML='<strong></strong><p></p>';el.querySelector('strong').textContent=(fresh?'新玩法已解锁：':'已掌握：')+(game?game.name:p.title);el.querySelector('p').textContent=storageWorks?'今后会出现在主题相符的密室里。进度已保存在这台设备。':'本次已解锁；浏览器未允许保存，关闭页面后可能丢失进度。';$('app').prepend(el);}};
function menu(){const info=$('room-info');if(!info)return;function refresh(){if(!info.isConnected)return;const p=getPlan(selectedRoom());if(!p)return;const ready=supportsDungeon(p.primary),allowed=isRoomUnlocked(p.roomId),create=$('dm2');if(create){create.disabled=!ready||!allowed;create.title=!allowed?'请先通关第 '+(p.order-1)+' 间密室':ready?'':'该玩法正在接入中';create.setAttribute('aria-disabled',String(create.disabled));}let lock=info.nextElementSibling;if(!lock||lock.id!=='rp-room-lock'){lock=document.createElement('p');lock.id='rp-room-lock';lock.className='rp-map-help';lock.setAttribute('role','status');lock.style.cssText='text-align:center;margin:8px 16px;';info.after(lock);}lock.hidden=allowed;lock.textContent=allowed?'':'🔒 通关上一密室后解锁';}
 refresh();if(g._roomProgressObserver)g._roomProgressObserver.disconnect();const observer=new MutationObserver(refresh);observer.observe(info,{childList:true});g._roomProgressObserver=observer;
}
const oldMenu=renderDungeonMenu;renderDungeonMenu=function(){invalidate();settled=null;oldMenu.apply(this,arguments);menu();};
const oldHostDungeon=renderHostDungeon;renderHostDungeon=function(){if(!isRoomUnlocked(selectedRoom())){renderDungeonMenu();return false;}return oldHostDungeon.apply(this,arguments);};
const oldBossHost=dgBossHost;dgBossHost=function(){if(DUNGEON&&!isRoomUnlocked(DUNGEON.roomId))return false;return oldBossHost.apply(this,arguments);};
const oldMap=renderDungeonMapShell;renderDungeonMapShell=function(){invalidate();oldMap.apply(this,arguments);if(!DUNGEON)return;const p=getPlan(DUNGEON.roomId),screen=document.querySelector('.dungeon-screen');if(!p||!screen)return;const help=screen.querySelector('.dg-map-help');if(help){const el=document.createElement('p');el.className='rp-map-help';el.textContent='本室主打：'+p.title+'。首次挑战先学基础，终章再挑战进阶；通关后解锁 '+(PLAYGROUNDS.find(x=>x.id===p.primary)||{name:p.title}).name+'。';help.querySelector('.rp-map-help')?.remove();help.appendChild(el);}if(!p.boss){screen.querySelectorAll('.route-summary span,.route-details').forEach(el=>{el.textContent=el.textContent.replace(/首领/g,'终章');});}document.querySelectorAll('.dg-node').forEach(el=>{const n=dgNode(el.dataset.id);if(n)el.classList.toggle('rp-finale',!!n.roomFinale);});};
})(window);

