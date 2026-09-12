(function(g){
'use strict';
let active=null,developer=false,selected='room-1',difficulty=1,epoch=0,connection=null,pending=null,screen='selector',flowTimer=null,revision=0,note='';
const originalSend=netSend;
function current(){return active?Object.freeze({...active.meta}):null;}
function send(payload){if(active&&PEER.conn?.open)PEER.conn.send({t:'directData',runId:active.meta.runId,payload});}
netSend=function(payload){if(active)return send(payload);return originalSend(payload);};
function stop(){epoch++;clearTimeout(flowTimer);flowTimer=null;if(active){active.ended=true;active.controller?.abort();active.lease?.release();}active=null;clearTimers();RoomResults.close();}
function room(){return ROOM_CATALOG.find(r=>r.id===selected);}
function button(label,fn,disabled=false){const b=document.createElement('button');b.textContent=label;b.disabled=disabled;b.onclick=fn;return b;}
function back(panel,fn=lobby){const b=button('‹ 返回',fn);b.id='direct-back';b.className='direct-back';panel.prepend(b);}
function discardProposal(){clearTimeout(flowTimer);flowTimer=null;const old=pending;pending=null;old?.controller?.abort();old?.lease?.release();}
function disconnect(){connection=null;discardProposal();closePeer();}
function shell(title){const app=document.getElementById('app');app.replaceChildren();const panel=document.createElement('main');panel.className='direct-room';const h=document.createElement('h1');h.textContent=title;panel.append(h);app.append(panel);return panel;}
function state(){return Object.freeze({screen,role:connection?.role||(PEER.isHost?'A':null),roomId:selected,mode:RoomDirectory.getPlan(selected)?.primary,difficulty,tier:RoomLevelProgress.strength(difficulty),roomCode:PEER.room||null,connected:!!connection&&!!PEER.conn?.open,runId:active?.meta.runId||pending?.meta.runId||null,proposalId:pending?.id||null,proposalPhase:pending?.phase||null,revision});}
function editable(){return screen==='selector'&&!pending&&connection?.role!=='B'&&PEER.isHost;}
function persist(){try{localStorage.setItem('roomlab-last-room',selected);localStorage.setItem('roomlab-last-difficulty',String(difficulty));}catch(_){}}
function broadcast(returned=false){if(connection?.role==='A'&&PEER.conn?.open)PEER.conn.send({t:'directSelection',protocol:3,sessionId:connection.id,revision,roomId:selected,difficulty,tier:RoomLevelProgress.strength(difficulty),developer,returned});}
function renderSelector(){
 screen=pending?(pending.phase==='offered'?'proposal':'preparing'):'selector';
 const app=document.getElementById('app');app.innerHTML='<section class="room-select direct-selector"><div class="direct-toolbar"><span id="direct-room-code"></span></div><div class="direct-card"><h1 class="room-title" id="room-title"></h1><div class="room-carousel"><button class="room-arrow prev" id="room-prev" aria-label="上一间">❮</button><img id="room-cover" class="room-cover" alt="密室封面"><button class="room-arrow next" id="room-next" aria-label="下一间">❯</button></div><div class="room-info" id="room-info"></div><p class="room-pagination" id="room-pagination"></p></div><div class="direct-choice"><div class="direct-tiers"></div><p id="direct-status" role="status"></p><div class="direct-proposal-actions"></div><button id="dm3" class="direct-join-link">加入其他房间</button></div></section>';
 const page=app.firstElementChild;back(page.querySelector('.direct-toolbar'),home);
 document.getElementById('direct-room-code').textContent=PEER.room?'房间码：'+PEER.room:'正在创建房间…';
 const r=room();document.getElementById('room-title').textContent=r.theme+' | '+r.name;
 const info=document.getElementById('room-info');for(const [cls,text]of [['room-recommend','['+r.recommend+']'],['room-meta',(r.rating?r.rating+'分 | ':'')+r.minutes+'分钟 | 2人开场'],['room-tag',r.difficulty],['room-tag',r.tag]]){const el=document.createElement('span');el.className=cls;el.textContent=text;info.append(el);}
 const rooms=RoomDirectory.plans.map(p=>ROOM_CATALOG.find(r=>r.id===p.roomId)),index=rooms.findIndex(r=>r.id===selected);
 document.getElementById('room-pagination').textContent=(index+1)+' / '+rooms.length;
 RoomCoverLoader.mount({root:page.querySelector('.direct-card'),image:document.getElementById('room-cover'),rooms,initialId:selected,onReady:()=>{}});
 const move=delta=>selectRoom(rooms[(index+delta+rooms.length)%rooms.length].id);
 for(const [id,delta]of [['room-prev',-1],['room-next',1]]){const b=document.getElementById(id);b.disabled=!editable();b.onclick=()=>move(delta);}
 let x=null;const carousel=page.querySelector('.room-carousel');carousel.onpointerdown=e=>{x=e.clientX;};carousel.onpointerup=e=>{if(x!==null&&Math.abs(e.clientX-x)>50)move(e.clientX<x?1:-1);x=null;};carousel.onpointercancel=()=>x=null;
 RoomLevelProgress.labels.forEach((label,i)=>{const b=button(label,()=>selectTier(i+1),!editable());b.id='direct-tier-'+(i+1);b.setAttribute('aria-pressed',String(difficulty===i+1));page.querySelector('.direct-tiers').append(b);});
 const isB=connection?.role==='B',actions=page.querySelector('.direct-proposal-actions');
 document.getElementById('direct-status').textContent=pending?(pending.phase==='offered'?(isB?'同伴邀请你一起进入，是否确认？':'等待同伴确认，可取消后重新选择。'):'双方正在准备玩法…'):note||(isB?'跟随房主选择，收到邀请后确认。':connection?'同伴已加入，选好后请确认。':'选好密室与难度，等待同伴加入。');
 if(pending){if(isB&&pending.phase==='offered'){const yes=button('确认进入',acceptProposal),no=button('拒绝',rejectProposal);yes.id='direct-accept';no.id='direct-reject';actions.append(yes,no);}else if(!isB){const cancel=button('取消提案',cancelProposal);cancel.id='direct-cancel';actions.append(cancel);}}
 else{const start=button(isB?'等待房主确认':'确认选择',startGame,!connection||isB||!PEER.conn?.open);start.id='direct-start';actions.append(start);}
 document.getElementById('dm3').onclick=join;
}
function selectRoom(id){if(!editable()||!RoomDirectory.getPlan(id))return false;selected=id;revision++;note='';persist();renderSelector();broadcast();return true;}
function selectTier(value){if(!editable()||!Number.isInteger(value)||value<1||value>3)return false;difficulty=value;revision++;note='';persist();renderSelector();broadcast();return true;}
function levels(id=selected){if(pending&&!active)return false;if(active)stop();discardProposal();if(connection?.role!=='B'&&RoomDirectory.getPlan(id))selected=id;note='';if(!PEER.peer&&!PEER.isHost)return lobby();if(connection?.role!=='B')revision++;persist();renderSelector();broadcast(true);}
function lobby(){stop();disconnect();revision=0;note='';screen='selector';host();}
function home(){stop();disconnect();screen='home';S.mod=null;S.role=null;renderMain();document.getElementById('main-enter').onclick=lobby;document.getElementById('main-play').onclick=lobby;}
function fail(message){stop();disconnect();screen='error';const p=shell(message);back(p);p.append(button('返回密室',lobby));}
function proposalPacket(t,p=pending){return {t,sessionId:connection?.id,proposalId:p?.id};}
function cancelProposal(){if(connection?.role!=='A'||!pending||pending.phase==='playing')return false;PEER.conn.send(proposalPacket('directCancel'));if(active)stop();discardProposal();note='已取消，可重新选择。';renderSelector();return true;}
function startGame(){if(!editable()||connection?.role!=='A'||!PEER.conn?.open)return false;
 const id=crypto.randomUUID(),meta=Object.freeze({protocol:3,proposalId:id,roomId:selected,mode:RoomDirectory.getPlan(selected).primary,difficulty,tier:RoomLevelProgress.strength(difficulty),developer,runId:crypto.randomUUID()});
 pending={id,meta,revision,phase:'offered'};note='';renderSelector();PEER.conn.send({...proposalPacket('directProposal'),revision,meta});return true;
}
function acceptProposal(){if(connection?.role!=='B'||pending?.phase!=='offered')return false;pending.phase='accepted';PEER.conn.send({...proposalPacket('directVote'),accepted:true});renderSelector();return true;}
function rejectProposal(){if(connection?.role!=='B'||pending?.phase!=='offered')return false;PEER.conn.send({...proposalPacket('directVote'),accepted:false});discardProposal();note='已拒绝，等待房主重新选择。';renderSelector();return true;}
function readyToLaunch(p){if(connection?.role!=='A'||pending!==p||p.phase!=='preparing'||!p.localReady||!p.remoteReady)return;p.phase='launching';PEER.conn.send(proposalPacket('directLaunch',p));}
async function prepareProposal(p){
 const session=connection,conn=PEER.conn;p.controller=new AbortController();p.phase='preparing';renderSelector();
 flowTimer=setTimeout(()=>{if(pending===p){if(session.role==='A')cancelProposal();else{conn.send(proposalPacket('directPrepareError',p));discardProposal();note='准备超时，请重新邀请。';renderSelector();}}},45000);
 try{await RoomModeLoader.load(p.meta.mode);if(pending!==p||connection!==session)return;
 p.lease=await RoomAssets.prepare(RoomAssets.manifest(['room:'+p.meta.roomId,'mode:'+p.meta.mode]),{signal:p.controller.signal});
 if(pending!==p||connection!==session){p.lease.release();return;}p.localReady=true;
 if(session.role==='A')readyToLaunch(p);else conn.send(proposalPacket('directPrepared',p));
 }catch(e){if(pending!==p||connection!==session)return;conn.send(proposalPacket('directPrepareError',p));discardProposal();note='玩法加载失败，可重新确认重试。';renderSelector();}
}

function validMeta(meta){return !(!meta||meta.protocol!==3||typeof meta.runId!=='string'||!meta.runId||!RoomDirectory.getPlan(meta.roomId)||RoomDirectory.getPlan(meta.roomId).primary!==meta.mode||!RoomLevelProgress.canPlay(meta.roomId,meta.difficulty)||meta.tier!==RoomLevelProgress.strength(meta.difficulty));}
async function begin(meta,role,preparedLease){
 if(!validMeta(meta))return false;
 stop();screen='playing';const loadingStatus=document.getElementById('direct-status');if(loadingStatus)loadingStatus.textContent='正在准备玩法…';const startButton=document.getElementById('direct-start');if(startButton)startButton.disabled=true;selected=meta.roomId;difficulty=meta.difficulty;const boundConnection=PEER.conn;const runDeveloper=role==='A'?developer:meta.developer===true;const s=active={meta:Object.freeze({...meta,role,developer:runDeveloper}),ended:false};S.mod=meta.mode;S.role=role;g._dungeon=false;g._dgNode=null;g._netMode=role==='A'?'host':'guest';
 const ctx={...s.meta,sessionId:meta.runId,tutorial:meta.tier===1,isActive:()=>active===s&&!s.ended&&PEER.conn===boundConnection&&!!boundConnection?.open,send:payload=>{if(active!==s||s.ended||PEER.conn!==boundConnection||!boundConnection?.open)return false;boundConnection.send({t:'directData',runId:s.meta.runId,payload});return true;},finish:data=>role==='A'&&active===s&&!s.ended?RoomResults.report(data):false,abort:()=>fail('本局已结束')};
 const save=r=>{if(r.win)RoomLevelProgress.complete({roomId:meta.roomId,difficulty:meta.difficulty,resultId:r.resultId,win:true,developer:runDeveloper});};
 RoomResults.begin({runId:meta.runId,role,connection:PEER.conn,gameId:meta.mode,title:RoomDirectory.getPlan(meta.roomId).title,roomTitle:room().name,roomSession:s.meta,developer:runDeveloper,tutorial:meta.tier===1,onResult:save,apply:data=>{if(data.win)save({win:true,resultId:meta.runId+':result'});},onContinue:()=>levels(meta.roomId),onExit:()=>lobby()});
 s.controller=new AbortController();try{if(preparedLease)s.lease=preparedLease;else{await RoomModeLoader.load(meta.mode);if(!ctx.isActive())return false;s.lease=await RoomAssets.prepare(RoomAssets.manifest(['room:'+meta.roomId,'mode:'+meta.mode]),{signal:s.controller.signal});}}catch(e){if(active===s)fail('素材未加载完成，请返回重试');return false;}if(!ctx.isActive())return false;
 const adapter=RoomGameAdapters[meta.mode];if(!adapter?.[role==='A'?'host':'guest']){fail('该玩法正在接入，请稍后重试');return false;}adapter[role==='A'?'host':'guest'](ctx);return true;
}

function bind(conn,role){
 clearTimeout(flowTimer);PEER.conn=conn;connection={role,id:role==='A'?crypto.randomUUID():null};const session=connection,seen=new Set();if(role==='B')revision=-1;
 conn.on('data',async d=>{if(PEER.conn!==conn||connection!==session||!d)return;
 if(['roomResult','roomResultAck','roomResultAdvance'].includes(d.t)){RoomResults.consume(d,conn);return;}
 if(d.t==='directSelection'&&role==='B'){
  if(d.protocol!==3){fail('双方版本不同，请刷新后重新加入');return;}
  if(typeof d.sessionId!=='string'||!RoomDirectory.getPlan(d.roomId)||!RoomLevelProgress.canPlay(d.roomId,d.difficulty)||d.tier!==RoomLevelProgress.strength(d.difficulty)||!Number.isSafeInteger(d.revision)||d.revision<=revision)return;
  if(session.id&&session.id!==d.sessionId)return;if(active&&!d.returned)return;
  if(active)stop();discardProposal();session.id=d.sessionId;revision=d.revision;selected=d.roomId;difficulty=d.difficulty;note='';renderSelector();return;
 }
 if(d.t==='directProposal'&&role==='B'){
  if(d.sessionId!==session.id||active||pending||typeof d.proposalId!=='string'||seen.has(d.proposalId)||!validMeta(d.meta)||d.meta.proposalId!==d.proposalId||d.revision!==revision||d.meta.roomId!==selected||d.meta.difficulty!==difficulty)return;
  seen.add(d.proposalId);pending={id:d.proposalId,meta:Object.freeze({...d.meta}),revision,phase:'offered'};renderSelector();return;
 }
 if(d.t==='directData'){if(!active||d.runId!==active.meta.runId)return;if(pending)pending.phase='playing';const payload=d.payload;if(RoomResults.consume(payload,conn))return;(role==='A'?dgHostOnData:dgGuestOnData)(payload);return;}
 const p=pending;if(!p||d.sessionId!==session.id||d.proposalId!==p.id)return;
 if(d.t==='directCancel'&&role==='B'){if(active)stop();discardProposal();note='房主已取消邀请。';renderSelector();return;}
 if(d.t==='directVote'&&role==='A'&&p.phase==='offered'){
  if(d.accepted===false){discardProposal();note='同伴拒绝了邀请，可重新选择。';renderSelector();return;}
  if(d.accepted!==true)return;p.phase='preparing';conn.send(proposalPacket('directPrepare',p));prepareProposal(p);return;
 }
 if(d.t==='directPrepare'&&role==='B'&&p.phase==='accepted'){prepareProposal(p);return;}
 if(d.t==='directPrepared'&&role==='A'&&p.phase==='preparing'){p.remoteReady=true;readyToLaunch(p);return;}
 if(d.t==='directPrepareError'){if(active)stop();discardProposal();note='同伴准备失败，请重新确认。';renderSelector();return;}
 if(d.t==='directLaunch'&&role==='B'&&p.phase==='preparing'&&p.localReady){
  p.phase='launching';const lease=p.lease;p.lease=null;
  if(await begin(p.meta,'B',lease)){if(pending===p&&connection===session)conn.send(proposalPacket('directMounted',p));}return;
 }
 if(d.t==='directMounted'&&role==='A'&&p.phase==='launching'&&p.localReady&&p.remoteReady){
  p.phase='playing';const lease=p.lease;p.lease=null;await begin(p.meta,'A',lease);return;
 }
 });
 conn.on('close',()=>{if(connection===session)fail('同伴已断开连接');});conn.on('error',()=>{if(connection===session)fail('连接中断，请重新加入');});
 note='';renderSelector();if(role==='A')broadcast();
}
function host(){
 if(PEER.peer||PEER.isHost)return;PEER.isHost=true;screen='selector';const token=epoch;renderSelector();
 flowTimer=setTimeout(()=>{if(token===epoch)fail('连接超时，请重新创建');},20000);
 loadPeerLib(lib=>{if(token!==epoch||!PEER.isHost)return;if(!lib)return fail('联网组件加载失败');const code=String(Math.floor(1000+Math.random()*9000)),peer=newPeerId('direct'+code,peerOpts());PEER.peer=peer;
 peer.on('open',()=>{if(PEER.peer===peer){clearTimeout(flowTimer);PEER.room=code;renderSelector();}});
 peer.on('error',()=>{if(PEER.peer===peer)fail('连接失败，请返回重试');});
 peer.on('connection',conn=>{if(PEER.peer!==peer||PEER.conn){conn.close();return;}PEER.conn=conn;conn.on('open',()=>{if(PEER.peer!==peer){conn.close();return;}bind(conn,'A');});});});
}
function join(){stop();disconnect();screen='joining';const token=epoch,p=shell('加入同伴'),input=document.createElement('input');input.id='direct-code-input';input.inputMode='numeric';input.maxLength=4;input.placeholder='四位房间码';input.setAttribute('aria-label','房间码');back(p);const status=document.createElement('p');status.id='direct-status';
 const submit=button('加入',()=>{const code=input.value.trim();if(!/^\d{4}$/.test(code)){status.textContent='请输入四位房间码';return;}submit.disabled=true;input.disabled=true;status.textContent='连接中…';flowTimer=setTimeout(()=>{if(token===epoch)fail('加入超时，请检查房间码');},20000);
 loadPeerLib(lib=>{if(token!==epoch)return;if(!lib)return fail('联网组件加载失败');const peer=newPeerId(undefined,peerOpts());PEER.peer=peer;PEER.room=code;PEER.isHost=false;
 peer.on('open',()=>{if(token!==epoch||PEER.peer!==peer)return;const conn=peer.connect('direct'+code,{reliable:true});conn.on('open',()=>{if(token!==epoch||PEER.peer!==peer){conn.close();return;}bind(conn,'B');});});peer.on('error',()=>{if(PEER.peer===peer)fail('加入失败，请检查房间码');});});});submit.id='direct-join';p.append(input,submit,status);
}
function boot(){for(const r of ROOM_CATALOG)RoomAssets.register('room:'+r.id,[{src:'assets/rooms/webp/'+r.id+'.webp',fallback:r.image}]);try{const saved=localStorage.getItem('roomlab-last-room');if(RoomDirectory.getPlan(saved))selected=saved;const savedDifficulty=localStorage.getItem('roomlab-last-difficulty');const storedTier=savedDifficulty===null?RoomLevelProgress.migrateTier(Number(localStorage.getItem('roomlab-last-tier'))):Number(savedDifficulty);if(Number.isInteger(storedTier)&&storedTier>=1&&storedTier<=3)difficulty=storedTier;}catch(_){}lobby();}
g.RoomSession=Object.freeze({current,state,boot,home,lobby,levels,host,join,selectRoom,selectTier,selectDifficulty:selectTier,start:startGame,acceptProposal,rejectProposal,cancelProposal,send,setDeveloper:value=>{if(active||pending)throw Error('Cannot change access during a run');developer=!!value;},begin});
})(window);
