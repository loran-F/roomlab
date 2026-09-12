/* Local developer desk. Fresh real game documents/Peer sessions; optional isolated companion. */
(function(){
'use strict';
const $=id=>document.getElementById(id), native=new Set(['lockbox','silhouette','evidence','mirrors','pwslide','lightsearch']);
const CONSOLE_BUILD='dc-2026.09.12.6';
let catalog=null,current=null,serial=0,lastConfig=null,desiredRole="manual";
function towerScope(){return false;}
function hashText(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
function visibleFingerprint(w){if(!w)return '--------';const parts=[];for(const el of w.document.querySelectorAll('h1,h2,h3,p,span,b,strong,button,[role=status]')){if(el.getClientRects().length&&!el.hidden){const t=el.textContent.trim().replace(/\s+/g,' ');if(t)parts.push(t);}}for(const c of w.document.querySelectorAll('canvas'))if(c.getClientRects().length)parts.push('canvas:'+c.width+'x'+c.height);return hashText(parts.join('|'));}
function fixedTeaching(config){return config.scope==='single'&&config.mode==='pwslide'&&config.level===1;}
function updateRetryCopy(config=configuration()){const tower=config.scope==='tower',fixed=fixedTeaching(config),label=tower?'换一张塔图':fixed?'重开固定教学':'换题';$('dc-retry-mode').options[0].textContent=label;$('dc-retry').textContent=tower?'重新生成塔图':fixed?'重开固定教学':'换题重开';}
function showRunMeta(r){const session=r.windows.A?.RoomSession?.current?.(),game=readGame(r.windows.A,r.config.mode),run=session?.runId||game?.id||('desk-'+r.id);$('dc-run-meta').hidden=false;$('dc-run-title').textContent='第 '+r.id+' 轮 · '+(r.config.level===1?'固定教学':'第 '+r.config.level+' 档');$('dc-run-id').textContent='局 ID '+run;$('dc-fingerprint').textContent='可见题面 '+visibleFingerprint(r.windows.A)+' / '+visibleFingerprint(r.windows.B);$('dc-map-meta').textContent='直达会话 · '+r.config.roomId+' · '+r.config.mode+' · tier '+r.config.level+' · protocol '+(session?.protocol||1);}
function botControls(){
 const r=current,mode=r?.started?r.config.mode:$("dc-mode").value,select=$("dc-control"),state=r?.bot?.snapshot(),gameState=r?.started?readGame(r.windows.A,mode):undefined;
 const supported=value=>DevConsoleBot.capability(mode,value,gameState);
 for(const o of select.options){const c=supported(o.value);o.disabled=!c.supported;o.title=c.detail;}
 if(!supported(desiredRole).supported)desiredRole="manual";
 if(towerScope())desiredRole='manual';select.value=desiredRole;select.disabled=!catalog||!!r?.busy||towerScope();
 const chosen=supported(desiredRole);$("dc-bot-capability").textContent=towerScope()?'完整爬塔停在双方真实地图，不启用单玩法托管。':mode==='pwslide'&&!supported('A').supported?supported('A').detail:chosen.detail;
 $("dc-bot-kind").textContent=desiredRole==='manual'?'手动':chosen.kind==='guided'?'指令式托管':'自动托管';
 $("dc-bot-status").textContent=state?.message||(desiredRole==="manual"?"双端手动":"开局后托管 "+desiredRole);
 const b=$("dc-bot-pause");b.disabled=!state||state.stopped||state.role==="manual";b.textContent=state?.paused?"恢复托管":"暂停托管";
 const box=$("dc-bot-commands"),commands=state?.commands||[];box.hidden=!commands.length;box.replaceChildren(...commands.map(c=>{const b=document.createElement('button');b.type='button';b.dataset.botCommand=c.id;b.textContent=c.label;b.disabled=!!state?.paused||!!state?.stopped;b.onclick=()=>{current?.bot?.command(c.id);botControls();};return b;}));
}
function attachBot(r){r.bot=DevConsoleBot.create({windows:r.windows,mode:r.config.mode,signal:r.controller.signal,onChange:botControls});r.bot.setRole(desiredRole);botControls();}
const captions={catalog:'读取游戏目录',idle:'待开局',loading:'加载游戏页面',hosting:'创建房间',joining:'加入房间',map:'准备密室素材',preparing:'自动准备',playing:'进行中',tower:'完整爬塔地图',ended:'本关已结束',error:'开局或连接失败'};
function option(value,label){const el=document.createElement('option');el.value=value;el.textContent=label;return el;}
function levels(){return [[1,'教学 · 固定样本'],[2,'入门'],[3,'标准'],[4,'困难'],[5,'极限']];}
function fillLevels(){const keep=$('dc-level').value;$('dc-level').replaceChildren(...levels($('dc-mode').value).map(x=>option(...x)));if(levels($('dc-mode').value).some(x=>String(x[0])===keep))$('dc-level').value=keep;capability();botControls();}
function capability(){const mode=$('dc-mode').value;if(towerScope())$('dc-capability').textContent='按所选密室的真实成长规则生成完整路线。每次重开使用新 seed；同题固定 seed 重试尚无统一 UI 接口。';else $('dc-capability').textContent=mode==='pwslide'&&Number($('dc-level').value)===1?'固定教学题：密码始终为 1234；“重开固定教学”只重置条片和本轮状态。':mode==='pwslide'?'换题会重置全部条片偏移并生成进阶密码；同题复测尚无可靠接口。':(['lockbox','silhouette','evidence','mirrors'].includes(mode)?'换题会重新创建关卡；部分基础结构或案件题库固定，不保证每次题面不同。':'换题会重新创建关卡；固定地图、规则或结构可能重复。')+' 同题重试尚无统一接口。';updateRetryCopy();}
function controls(){const busy=!!current?.busy;$('dc-scope').disabled=true;$('dc-room').disabled=!catalog||busy;$('dc-mode').disabled=true;$('dc-level').disabled=!catalog||busy;$('dc-start').disabled=busy;$('dc-start').textContent=catalog?'直达开局':'重新读取目录';$('dc-retry').disabled=!lastConfig||busy;$('dc-back').disabled=!catalog&&!current;$('dc-retry-mode').disabled=busy;updateRetryCopy();botControls();}
function setPhase(phase,detail){document.body.dataset.phase=phase;$('dc-status').textContent=captions[phase]||phase;$('dc-ready').textContent=detail||'';controls();}
function abortError(){return new DOMException('Canceled','AbortError');}
function check(r){if(current!==r||r.controller.signal.aborted)throw abortError();}
function pause(ms,r){return new Promise((resolve,reject)=>{check(r);const signal=r.controller.signal;const done=()=>{signal.removeEventListener('abort',cancel);resolve();};const t=setTimeout(done,ms);function cancel(){clearTimeout(t);signal.removeEventListener('abort',cancel);reject(abortError());}signal.addEventListener('abort',cancel,{once:true});});}
async function wait(r,predicate,reason,timeout=30000){const start=Date.now();while(Date.now()-start<timeout){check(r);let value;try{value=predicate();}catch(e){if(e.name==='SecurityError')throw new Error('游戏页面需与验收台同源，请从本地服务打开。');throw e;}if(value)return value;await pause(90,r);}throw new Error(reason);}
function frame(role){return $('dc-frame-'+role.toLowerCase());}
function makeFrame(role){const f=document.createElement('iframe');f.id='dc-frame-'+role.toLowerCase();f.width='390';f.height='844';f.title='角色 '+role+' 游戏画面';f.allow='autoplay';f.hidden=true;return f;}
function clearFrames(r,remove=true){
 if(!r)return;r.controller.abort();clearTimeout(r.monitor);r.off.forEach(fn=>fn());r.off=[];
 for(const role of ['A','B']){const f=r.frames[role];if(!f)continue;try{const w=f.contentWindow;w.dispatchEvent(new w.Event('blur'));w.clearTimers?.();w.closePeer?.();w.clearNetZones?.();w.AC?.close?.().catch(()=>{});w.document.body.inert=true;}catch(_){}if(remove&&f.isConnected)f.replaceWith(makeFrame(role));}
}
function cancel(){const r=current;current=null;if(r)clearFrames(r);for(const role of ['a','b']){$('dc-state-'+role).textContent='未连接';$('dc-state-'+role).dataset.ready='false';}$('dc-room-code').textContent='房间 —';$('dc-run-meta').hidden=true;$('dc-error').hidden=true;setPhase('idle','选择配置后开局');}
function fail(r,error){if(current!==r||r.controller.signal.aborted)return;r.busy=false;r.error=error.message||String(error);clearFrames(r,false);$('dc-error').textContent=r.error+' 可点击“重试本关”重新建局，或返回选择。';$('dc-error').hidden=false;setPhase('error','本轮已停止');$('dc-retry').focus();}
function gameURL(){const u=new URL('roomlab.html',location.href);u.search='';return u.href;}
async function load(r,role,discovery=false){
 const old=frame(role),f=makeFrame(role);old.replaceWith(f);r.frames[role]=f;f.hidden=discovery;
 $('dc-state-'+role.toLowerCase()).textContent='加载中';
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>done(new Error(role+' 端页面加载超时')),45000);function abort(){done(abortError());}function done(error){clearTimeout(timer);f.removeEventListener('load',ready);r.controller.signal.removeEventListener('abort',abort);error?reject(error):resolve();}function ready(){done();}f.addEventListener('load',ready,{once:true});r.controller.signal.addEventListener('abort',abort,{once:true});f.src=gameURL();});
 await wait(r,()=>{const w=f.contentWindow,s=w.RoomLoading?.status();if(s?.error)throw new Error(s.error);return s?.stage==='idle'&&w.PLAYGROUNDS?.length;},role+' 端 Loading 未能完成，请在该画面检查重试提示。',60000);
 check(r);const w=f.contentWindow;
 if(!w.RoomSession||!w.RoomDirectory||!w.RoomLevelProgress)throw new Error(role+' 端缺少直达密室会话接口。');
 w.RoomSession.setDeveloper(true);
 r.windows[role]=w;
 // This frame realm owns its Storage methods. Only gameplay ledgers are redirected.
 const keys=new Set(['roomlab-room-progress-v1','roomlab-room-levels-v1','roomlab-last-room','coop-practice-v1','roomlab_records']),memory=new Map(),proto=w.Storage.prototype,get=proto.getItem,set=proto.setItem,remove=proto.removeItem;
 proto.getItem=function(key){return keys.has(String(key))?(memory.get(String(key))??null):get.call(this,key);};
 proto.setItem=function(key,value){if(keys.has(String(key))){memory.set(String(key),String(value));return;}return set.call(this,key,value);};
 proto.removeItem=function(key){if(keys.has(String(key))){memory.delete(String(key));return;}return remove.call(this,key);};
 const error=e=>{if(e.message&&current===r)fail(r,new Error(role+' 端运行错误：'+e.message));};w.addEventListener('error',error);r.off.push(()=>w.removeEventListener('error',error));
 return w;
}
function readGame(w,mode){if(!w)return null;try{const name={pwslide:'PasswordStrip',lightsearch:'RhythmLight',lockbox:'PuzzlePack',silhouette:'PuzzlePack',evidence:'PuzzlePack',mirrors:'PuzzlePack',vault:'VaultMobile',wires:'WiresMobile',beam:'BeamMobile',dial:'RadioMobile',boss:'BossMobile',code:'CodeFiveTier'}[mode];if(name)return w[name]?.state?.()||null;if(['lookback','caller','shadow'].includes(mode))return w.RoomLabExpansion?.view||w.RoomLabExpansion?.state||null;if(mode==='pressure')return w.PressureFiveTier?.state?.()||w.RT||w.RT_VIEW;return null;}catch(_){return null;}}
function endpoint(w,mode){
 if(!w)return {connected:false,ready:false,stage:'未加载',mode:null,gameId:null};
 try{const d=w.document,connected=!!w.PEER?.conn?.open,loader=w.RoomLoading?.status(),s=readGame(w,mode);let stage='准备中',ready=false;
  if(loader&&loader.stage!=='idle')stage=loader.error?'素材错误':'加载素材';
  else if(d.getElementById('coop-panel'))stage='合作练习';
  else if(w.S?.mod!==mode)stage=w.S?.mod==='dungeon'?'地图':'已离开玩法';
  else if(d.getElementById('intro-ov')||w._introLock||s?.cd>0)stage='倒计时';
  else if(s?.done||s?.phase==='done')stage='已结束';
  else if(mode==='pwslide'){ready=s?.phase==='play';stage=ready?'可操作':'等待准备';}
  else if(mode==='code'){ready=!!s?.started;stage=ready?'可操作':'等待准备';}
  else if(mode==='lightsearch'||['lockbox','silhouette','evidence','mirrors'].includes(mode)){ready=!!s?.started;stage=ready?'可操作':'等待准备';}
  else if(['beam','wires','dial'].includes(mode)){ready=!!(s?.ready?.A&&s?.ready?.B&&s.cd===0);stage=ready?'可操作':'等待准备';}
  else if(mode==='boss'){ready=!!(s?.ready?.A&&s?.ready?.B&&s.phase!=='ready');stage=ready?'可操作':'等待准备';}
  else if(['lookback','caller','shadow'].includes(mode)){ready=!!(s?.ready?.A&&s?.ready?.B&&s.cd===0);stage=ready?'可操作':'等待准备';}
  else if(mode==='pressure'){ready=!!(s?.ready&&s.cd===0);stage=ready?'可操作':'等待准备';}
  else if(mode==='vault'){ready=!!s;stage=s?.phase==='read'?'可操作 · 待扫描':ready?'可操作':'等待准备';}
  else {ready=!!(d.querySelector('canvas')||d.querySelector('#playarea')?.childElementCount||d.querySelector('.manual'));stage=ready?'可操作':'等待界面';}
  return {connected,ready,stage,mode:w.S?.mod||null,gameId:s?.id||null,tier:w.RoomSession?.current?.()?.tier||s?.tier||w._roomGameContext?.tier||w.coopDifficulty?.().tier||null,dataListeners:w.PEER?.conn?.listenerCount?.('data')||0,link:w.DungeonConnection?.status()?.state||null};
 }catch(_){return{connected:false,ready:false,stage:'页面不可访问',mode:null};}
}
function paintEndpoints(r){const result={};for(const role of ['A','B']){const e=endpoint(r.windows[role],r.config?.mode);result[role]=e;const label=$('dc-state-'+role.toLowerCase());label.textContent=(e.connected?'已连接 · ':'')+e.stage;label.dataset.ready=String(e.ready);}return result;}
function click(w,selector){const b=w.document.querySelector(selector);if(b&&!b.disabled&&!b.hidden&&b.getClientRects().length){b.click();return true;}return false;}
function textButton(w,text){const box=w.document.getElementById('coop-work');const b=Array.from(box?.querySelectorAll('button')||[]).find(b=>b.textContent.trim()===text);if(b&&!b.disabled){b.click();return true;}return false;}
async function hold(r,w,b){if(r.held.has(b))return;r.held.add(b);const capture=b.setPointerCapture;try{b.setPointerCapture=()=>{};b.dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true,pointerId:1,pointerType:'mouse',buttons:1}));}finally{b.setPointerCapture=capture;}try{await pause(740,r);}finally{if(b.isConnected)b.dispatchEvent(new w.PointerEvent('pointerup',{bubbles:true,pointerId:1,pointerType:'mouse',buttons:0}));}}
async function prepareUI(r){
 // Preserve both visible clues before either player finishes and clears its panel.
 r.mirrorClues=r.mirrorClues||{};
 for(const role of ['A','B']){const panel=r.windows[role].document.getElementById('coop-panel');if(panel?.querySelector('h2')?.textContent.includes('镜像门')){const clue=panel.querySelector('#coop-work p')?.textContent||'';if(clue.includes('告诉同伴'))r.mirrorClues[role]=clue;}}
 for(const role of ['A','B']){check(r);const w=r.windows[role],d=w.document,mode=r.config.mode,panel=d.getElementById('coop-panel');
  if(panel){
   const title=panel.querySelector('h2')?.textContent||'';
   if(title.includes('镜像门')){const clue=r.mirrorClues[role==='A'?'B':'A']||'';if(!r.themed.has(panel)&&clue.includes('告诉同伴')){r.themed.add(panel);for(const word of clue.match(/左|中|右/g)||[])textButton(w,word);}continue;}
   if(textButton(w,'冒险继续')||textButton(w,'准备好了'))continue;
   const choices={maze:'→ 右',dial:'7',wires:'2',code:'4',vault:role==='A'?'描述亮格的位置和内容':'点击对应位置的空格，记录内容',boss:role==='A'?'右臂':'左侧'};
   if(choices[mode]){textButton(w,choices[mode]);continue;}
   if(mode==='pressure'&&role==='A'){textButton(w,'＋ 加压');textButton(w,'＋ 加压');continue;}
   if(mode==='beat'){textButton(w,'现在点击');continue;}
   const b=d.querySelector('#coop-work button[aria-pressed]');if(b&&!b.disabled)await hold(r,w,b);continue;
  }
  if(mode==='dial'&&d.getElementById('radio-ready')?.disabled){w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));w.dispatchEvent(new w.KeyboardEvent('keyup',{key:'ArrowRight',bubbles:true}));}
  if(['lookback','caller','shadow'].includes(mode))click(w,'#x-practice [data-x]');
  for(const selector of ['#pp-ready','#ps-ready','#ls-ready','#bm-ready','#wm-ready','#mb-ready','#radio-ready','#x-ready','#cf-ready','#rt-ready'])click(w,selector);
 }
}
function configureNode(r){const a=r.windows.A,b=r.windows.B,mode=r.config.mode,level=r.config.level;
 const id=mode==='boss'?a.DUNGEON.boss:a.DUNGEON.nodes.find(n=>n.type==='event'&&n.layer===1).id;
 for(const w of [a,b]){const n=w.dgNode(id);if(!n)throw new Error('两端地图节点未同步');n.mode=mode;n.type=mode==='boss'?'boss':'event';n.roomTutorial=level===1;n.roomAdvanced=level>1;n.routeTier=level;
  // Configure a fresh developer entry; do not manufacture cleared floors/history.
  n.coopConfig={mode,tier:level,streak:1,baseScale:Math.max(.7,1-(level-1)*.1),timeScale:Math.max(.7,1-(level-1)*.1),theme:r.config.roomId==='room-4'?'镜像双胞胎':r.config.roomId==='room-8'?'异形惊扰':'',alarm:0};
 }
 r.nodeId=id;a.dgBroadcast();return id;
}
async function start(config){
 if(current?.busy)return;
 $('dc-scope').value=config.scope;$('dc-room').value=config.roomId;$('dc-mode').value=config.mode;fillLevels();$('dc-level').value=String(config.level);capability();
 const old=current;current=null;if(old)clearFrames(old);
 const r=current={id:++serial,controller:new AbortController(),frames:{},windows:{},off:[],busy:true,error:null,config:{...config},held:new WeakSet(),themed:new WeakSet(),radio:new WeakSet(),roomCode:null};lastConfig={...config};
 $('dc-error').hidden=true;$('dc-room-code').textContent='房间 —';setPhase('loading','等待两端游戏资源');
 try{
  await Promise.all(['A','B'].map(role=>load(r,role)));check(r);const a=r.windows.A,b=r.windows.B;
  const plan=a.RoomDirectory.getPlan(config.roomId);if(!plan||plan.primary!==config.mode)throw new Error('密室与玩法目录不一致');
  if(!a.RoomGameAdapters?.[config.mode]?.host||!a.RoomGameAdapters?.[config.mode]?.guest)throw new Error('当前玩法尚未注册完整 A/B 适配器');
  setPhase('hosting','A 正在创建直达房间');a.RoomSession.levels(config.roomId);
  const levelButtons=Array.from(a.document.querySelectorAll('.direct-room button')).slice(0,5);if(!levelButtons[config.level-1]||levelButtons[config.level-1].disabled)throw new Error('开发模式未开放第 '+config.level+' 档');levelButtons[config.level-1].click();
  await wait(r,()=>a.PEER?.room&&a.PEER?.peer?.open,'A 建房失败，请确认本地 Peer 服务已启动。');r.roomCode=String(a.PEER.room);$('dc-room-code').textContent='房间 '+r.roomCode;
  setPhase('joining','B 正在加入同一直达房间');b.RoomSession.levels(config.roomId);const joinButton=Array.from(b.document.querySelectorAll('.direct-room button')).find(x=>x.textContent.trim()==='加入同伴');if(!joinButton)throw new Error('B 端缺少加入入口');joinButton.click();const input=b.document.querySelector('.direct-room input');const submit=Array.from(b.document.querySelectorAll('.direct-room button')).find(x=>x.textContent.trim()==='加入');if(!input||!submit)throw new Error('B 端加入表单不完整');input.value=r.roomCode;input.dispatchEvent(new b.Event('input',{bubbles:true}));submit.click();
  await wait(r,()=>a.PEER?.conn?.open&&b.PEER?.conn?.open,'B 加入失败，请检查房间服务或网络。');setPhase('preparing','等待直达会话握手与双端准备');
  await wait(r,()=>{const x=a.RoomSession.current(),y=b.RoomSession.current();return x&&y&&x.runId===y.runId&&x.roomId===config.roomId&&x.mode===config.mode&&x.tier===config.level&&y.tier===config.level&&x.role==='A'&&y.role==='B';},'A/B 直达会话元数据未能同步。',30000);
  const end=Date.now()+45000;
  while(Date.now()<end){check(r);const e=paintEndpoints(r);if(e.A.link==='failed'||e.B.link==='failed'||!e.A.connected||!e.B.connected)throw new Error('准备期间双端连接中断');if(e.A.ready&&e.B.ready){r.busy=false;r.started=true;attachBot(r);showRunMeta(r);setPhase('playing',config.mode==='vault'?'A 可手动开始扫描':'双方已准备 · 手动操作');monitor(r);return;}await prepareUI(r);await pause(100,r);}
  throw new Error('准备超时：'+paintEndpoints(r).A.stage+' / '+paintEndpoints(r).B.stage+'，请重试或检查游戏界面。');
 }catch(e){if(e.name!=='AbortError')fail(r,e);}
}
function monitor(r){if(current!==r||r.controller.signal.aborted)return;const e=paintEndpoints(r);
 r.bot?.syncResult();
 if(!e.A.connected||!e.B.connected||e.A.link==='failed'||e.B.link==='failed'){fail(r,new Error((!e.A.connected?'A':'B')+' 端连接已断开'));return;}
 if(r.tower){showRunMeta(r);setPhase('tower','双方停在真实地图，可检查节点、连线与规模');r.monitor=setTimeout(()=>monitor(r),500);return;}
 if(e.A.link==='recovering'||e.B.link==='recovering')setPhase('playing','连接不稳定，等待游戏恢复');
 else if(e.A.mode==='dungeon'||e.B.mode==='dungeon'||e.A.stage==='已结束'||e.B.stage==='已结束'){const s=readGame(r.windows.A,r.config.mode);r.bot?.stop(s?.win===false?'本关失败，托管已停止':s?.win===true?'本关成功，托管已停止':'本关已结束，托管已停止');setPhase('ended','本局已结束或已返回地图，可重试本关');}
 else setPhase('playing',r.config.mode==='vault'?'手动操作 · A 可开始或重看扫描':'双方已准备 · 手动操作');
 r.monitor=setTimeout(()=>monitor(r),350);
}
function configuration(){return {scope:$('dc-scope').value,roomId:$('dc-room').value,mode:$('dc-mode').value,level:Number($('dc-level').value)};}
async function discover(){
 const r=current={id:++serial,controller:new AbortController(),frames:{},windows:{},off:[],busy:true};setPhase('catalog','首次读取当前游戏注册信息');
 try{if(location.protocol==='file:')throw new Error('请通过本地服务打开：http://127.0.0.1:8080/dev-console.html');const w=await load(r,'A',true),plans=w.RoomDirectory.plans;if(plans.length!==17)throw new Error('直达目录应为 17 房，当前为 '+plans.length);const rooms=plans.map(p=>{const room=w.ROOM_CATALOG.find(x=>x.id===p.roomId);return {id:p.roomId,name:room?.name||p.title,mode:p.primary,title:p.title};});catalog={rooms,modes:rooms.map(x=>({id:x.mode,name:x.title,roomId:x.id})),plans:plans.map(p=>({roomId:p.roomId,primary:p.primary,title:p.title})),accessMode:'developer',version:w.APP_VER,progressionVersion:w.RoomLevelProgress?.schemaVersion||1,protocol:1};
  $('dc-game-version').textContent='游戏 '+catalog.version;$('dc-console-version').textContent='验收台 '+CONSOLE_BUILD;$('dc-progression-version').textContent='五档规则 v'+catalog.progressionVersion;$('dc-route-version').textContent='会话协议 v'+catalog.protocol;const local=/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/.test(location.hostname);$('dc-origin').textContent=(local?'本地':'线上')+' · '+location.host;$('dc-origin').dataset.local=String(local);
  $('dc-room').replaceChildren(...catalog.rooms.map((x,i)=>option(x.id,'#'+(i+1)+' · '+x.name)));$('dc-mode').replaceChildren(...catalog.rooms.map(x=>option(x.mode,x.title)));$('dc-room').value=catalog.rooms[0].id;$('dc-mode').value=catalog.rooms[0].mode;fillLevels();cancel();
 }catch(e){if(e.name!=='AbortError'){fail(r,e);$('dc-start').disabled=false;$('dc-start').textContent='重新读取目录';}}
}
$('dc-scope').onchange=()=>{capability();controls();};$('dc-room').onchange=()=>{const p=catalog?.plans.find(x=>x.roomId===$('dc-room').value);if(p)$('dc-mode').value=p.primary;fillLevels();};$('dc-mode').onchange=fillLevels;$('dc-level').onchange=capability;
$('dc-start').onclick=()=>catalog?start(configuration()):discover();$('dc-retry').onclick=()=>{if(lastConfig)start(lastConfig);};$('dc-back').onclick=cancel;
$('dc-control').onchange=()=>{desiredRole=$('dc-control').value;if(current?.bot&&!current.bot.snapshot().stopped)current.bot.setRole(desiredRole);botControls();};
$('dc-bot-pause').onclick=()=>{const bot=current?.bot;if(!bot)return;bot.snapshot().paused?bot.resume():bot.pause();botControls();};
window.addEventListener('pagehide',()=>{const r=current;current=null;clearFrames(r);});
window.DevConsole=Object.freeze({snapshot(){const r=current,d=r?.windows?.A?.DUNGEON;return {phase:document.body.dataset.phase,sessionId:r?.id||null,config:r?.config?{...r.config}:null,roomCode:r?.roomCode||null,error:r?.error||null,busy:!!r?.busy,bot:r?.bot?.snapshot()||null,catalog:catalog?JSON.parse(JSON.stringify(catalog)):null,route:d?.route?JSON.parse(JSON.stringify(d.route)):null,progression:d?.progression?JSON.parse(JSON.stringify(d.progression)):null,runMeta:$('dc-run-meta').hidden?null:{title:$('dc-run-title').textContent,runId:$('dc-run-id').textContent,fingerprint:$('dc-fingerprint').textContent,map:$('dc-map-meta').textContent},A:endpoint(r?.windows.A,r?.config?.mode),B:endpoint(r?.windows.B,r?.config?.mode)};}});
discover();
})();


