/* Optional companion input for the local desk. Never writes game state. */
(function(){
'use strict';
function sliceState(s){return !!s&&Array.isArray(s.rows)&&[6,8,10,12,14].includes(s.rows.length)&&s.rows.every((r,i)=>r&&r.owner===(i%2?'B':'A')&&Number.isInteger(r.offset)&&Math.abs(r.offset)<=64&&typeof r.flipped==='boolean'&&typeof r.locked==='boolean')&&s.confirmed&&['A','B'].every(r=>typeof s.confirmed[r]==='boolean');}
function outcome(s){return s.win===false?'本关失败，托管已停止':s.win===true?'本关成功，托管已停止':'本关已结束，托管已停止';}
const resultStages=new Set(['game-success','game-fail','room-complete','room-fail']);
function resultOutcome(status){
 if(!status||!resultStages.has(status.stage))return null;
 if(status.stage==='game-success'||status.stage==='room-complete'||status.outcome==='success')return '本关成功，托管已停止';
 if(status.stage==='game-fail'||status.stage==='room-fail'||status.outcome==='fail')return '本关失败，托管已停止';
 return '本关已结束，托管已停止';
}
function capability(mode,role,state){
 if(role==='manual')return {supported:true,kind:'manual',detail:'双端手动：两端均由你操作。'};
 if(mode==='pwslide'&&state!==undefined&&!sliceState(state))return {supported:false,detail:'当前密码版本不是受支持的 A/B 同图切片结构，托管已禁用；请双端手动。'};
 if(mode==='pwslide')return {supported:true,kind:'automatic',detail:'托管仅推动自己的奇/偶行，跟随人工端第一条的可见位置；全部切口接齐后确认。人工端仍需调整并确认。'};
 if(mode==='lightsearch'&&role==='A')return {supported:true,kind:'automatic',detail:'A 按本档公开成功区间的中点真实计时开灯；B 由你收齐道具并回出口。暂停立即取消待按动作。'};
 return window.DevConsoleBotAdapters?.capability(mode,role)||{supported:false,detail:'此玩法尚未完成可靠托管适配，请使用双端手动。'};
}
function create({windows,mode,signal,onChange=()=>{}}){
 let role='manual',paused=false,stopped=false,timer=null,resultTimer=null,anchor=null,nextPull=0,resultWaitUntil=0,actions=0,message='双端手动',gameId=null,commands=[],adapter=null,held=null;
 const clean=[];
 const initialResults=['A','B'].map(r=>windows[r]?.RoomResults?.status?.()).filter(Boolean);
 const resultRunId=initialResults.find(s=>s.stage==='playing')?.runId||initialResults[0]?.runId||null;
 function snapshot(){const state=role==='manual'?null:readLocal(),cap=capability(mode,role,state),tier5Beam=mode==='beam'&&(Number(state?.tier)>=5||Number(state?.config?.maxActive)>=6);return {role,paused,stopped,actions,message,gameId,kind:tier5Beam?'guided':cap.kind||((role==='manual')?'manual':'automatic'),commands:commands.map(x=>({...x})),holding:held?{role,selector:held.selector}:null};}
 function report(text){if(message===text)return;message=text;onChange(snapshot());}
 function release(){if(!held)return;try{held.el.dispatchEvent(new held.win.PointerEvent('pointerup',{bubbles:true,pointerId:held.id,pointerType:'mouse',buttons:0}));}catch(_){}held=null;}
 function clear(){clearTimeout(timer);timer=null;anchor=null;resultWaitUntil=0;release();adapter?.dispose?.();adapter=null;commands=[];}
 function pause(reason='已暂停，可直接操作托管端'){if(stopped||role==='manual')return;paused=true;clear();report(reason);}
 function stop(reason='本轮托管已停止'){if(stopped)return;stopped=true;clear();clearInterval(resultTimer);resultTimer=null;clean.splice(0).forEach(fn=>fn());report(reason);}
 function syncResult(){
  if(stopped||!resultRunId)return false;
  for(const r of ['A','B']){
   const status=windows[r]?.RoomResults?.status?.();
   if(!status||status.runId!==resultRunId)continue;
   const reason=resultOutcome(status);if(reason){stop(reason);return true;}
  }
  return false;
 }
 function click(selector){const b=windows[role].document.querySelector(selector);if(!b||b.disabled||b.hidden||!b.getClientRects().length)return false;b.click();actions++;return true;}
 function clickElement(b){if(!b||b.disabled||b.hidden||!b.getClientRects().length)return false;b.click();actions++;return true;}
 function key(code){const w=windows[role],key=code==='Space'?' ':code;w.dispatchEvent(new w.KeyboardEvent('keydown',{bubbles:true,key,code}));w.dispatchEvent(new w.KeyboardEvent('keyup',{bubbles:true,key,code}));actions++;}
 function down(w,el,id){const original=el.setPointerCapture;try{el.setPointerCapture=()=>{};el.dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true,pointerId:id,pointerType:'mouse',buttons:1}));return true;}catch(_){return false;}finally{el.setPointerCapture=original;}}
 function press(selector){const w=windows[role],el=w.document.querySelector(selector);if(!el||el.disabled||el.hidden||!el.getClientRects().length)return false;if(held?.el===el&&held.win===w)return true;release();const id=19;if(!down(w,el,id))return false;held={el,win:w,id,selector};actions++;return true;}
 function maintain(selector){const w=windows[role],el=w.document.querySelector(selector);if(!el||el.disabled||el.hidden||!el.getClientRects().length){release();return false;}if(held?.el!==el||held.win!==w)return press(selector);if(!down(w,el,held.id)){release();return false;}actions++;return true;}
 function hold(selector,ms){if(!press(selector))return Promise.resolve(false);return new Promise(resolve=>setTimeout(()=>{release();resolve(true);},ms));}
 function setCommands(list){const next=Array.isArray(list)?list.slice(0,40).map(x=>({id:String(x.id),label:String(x.label)})):[];if(JSON.stringify(next)===JSON.stringify(commands))return;commands=next;onChange(snapshot());}
 function external(){const registry=window.DevConsoleBotAdapters;if(!registry||!registry.capability(mode,role).supported)return null;return registry.create(mode,role,{window:windows[role],state:()=>readLocal(),click,clickElement,key,press,maintain,hold,release,commands:setCommands,report,stop});}
 function readLocal(){const w=windows[role];if(mode==='dial')return w.RadioMobile?.state();if(mode==='wires')return w.WiresMobile?.state();if(mode==='vault')return w.VaultMobile?.state();if(mode==='beam')return w.BeamMobile?.state();if(mode==='boss')return w.BossMobile?.state();if(mode==='code')return w.CodeFiveTier?.state();if(['lockbox','silhouette','evidence','mirrors'].includes(mode))return w.PuzzlePack?.state();if(['lookback','caller','shadow'].includes(mode))return w.RoomLabExpansion?.view||w.RoomLabExpansion?.state;if(mode==='pressure')return w.PressureFiveTier?.state?.()||w.RT||w.RT_VIEW;if(mode==='pwslide')return w.PasswordStrip?.state();if(mode==='lightsearch')return w.RhythmLight?.state();if(mode==='maze')return w.MazeMobile?.state();return null;}
 function step(){
  timer=null;if(stopped||syncResult()||paused||role==='manual'||signal.aborted)return;
  try{
   if(['A','B'].some(r=>!windows[r]?.PEER?.conn?.open||windows[r].S?.mod!==mode)){stop('连接中断或已离开本关，托管已停止');return;}
   if(['A','B'].some(r=>['failed','recovering'].includes(windows[r].DungeonConnection?.status()?.state))){pause('连接不稳定，托管已暂停');return;}
   const w=windows[role],s=readLocal();
   if(!s&&adapter){adapter.tick();if(!stopped&&!paused)timer=setTimeout(step,140);return;}
   if(!s){stop('当前玩法状态不可读，托管已停止');return;}
   if(gameId&&gameId!==s.id){stop('游戏轮次已变化，请重新选择托管');return;}gameId=s.id;
   if(s.done||s.phase==='done'){stop(outcome(s));return;}
   if(mode==='pwslide'&&s.phase==='play'){
    if(!sliceState(s)||!w.document.querySelector('.ps-board [data-ps-band]')){stop('当前密码版本/画面不是受支持的同图切片，托管已禁用；请双端手动');return;}
   if(s.confirmed[role]){report('本角色已确认，等待人工端；不再调整条片');timer=setTimeout(step,140);return;}
    const humanRows=s.rows.map((r,i)=>({r,i})).filter(x=>x.r.owner!==role),anchorRow=humanRows.find(x=>!x.r.locked)?.r||humanRows[0]?.r,target=anchorRow?.offset;
    const unlock=humanRows.find(x=>x.r.locked&&(x.r.flipped||x.r.offset!==target))?.i,ownLocked=s.rows.findIndex(r=>r.owner===role&&r.locked&&(r.flipped||r.offset!==target)),flip=s.rows.findIndex(r=>r.owner===role&&r.flipped&&!r.locked);
    if(unlock!==undefined){click('[data-ps-unlock="'+unlock+'"]');report('放行同伴第 '+(unlock+1)+' 条；完成后再放行下一条');}
    else if(ownLocked>=0){report('请手动端放行托管的第 '+(ownLocked+1)+' 条');}
    else if(flip>=0){const selected=w.document.querySelector('[data-ps-select="'+flip+'"]');if(selected?.getAttribute('aria-pressed')!=='true')click('[data-ps-select="'+flip+'"]');else click('#ps-flip');report('翻正自己的第 '+(flip+1)+' 条');}
    else{
    // Offsets are exactly the shared SVG translations visible to both players.
    if(!Number.isFinite(target)||Math.abs(target)>44){report('等待人工端把第一条移入可拼合范围');}
    else{
     const index=s.rows.findIndex(r=>r.owner===role&&r.offset!==target);
     if(index>=0){
      if(target%4||s.rows[index].offset%4){pause('条片正在拖动或位置非微调步长，请松手后恢复');return;}
      const selected=w.document.querySelector('[data-ps-select="'+index+'"]');
      if(selected?.getAttribute('aria-pressed')!=='true')click('[data-ps-select="'+index+'"]');
      else click(s.rows[index].offset>target?'#ps-minus':'#ps-plus');
      report('仅调整 '+role+' 的第 '+(index+1)+' 条，跟随人工端第一条');
     }else if(s.rows.every(r=>r.offset===target)&&!s.confirmed[role]){click('#ps-confirm');report('自己的条片已接齐并确认，等待人工端确认');}
     else report('自己的条片已接齐，等待人工端调整并确认');
    }
    }
   }else if(mode==='lightsearch'&&role==='A'&&s.started){
    const now=performance.now();
    const minMs=Math.max(0,Number(s.successWindow?.min)||10)*1000,maxMs=Math.max(minMs+80,(Number(s.successWindow?.maxExclusive)||11)*1000),targetMs=(minMs+maxMs)/2;
    if(s.challenge==='running'&&now<resultWaitUntil){report('已停止挑战，等待游戏同步结果');}
    else if(s.challenge==='running'){
     if(anchor===null){pause('当前挑战起点未知：请手动结束当前挑战，再点恢复；不会补按旧计时');return;}
     const elapsed=now-anchor;
     if(elapsed>=maxMs){pause('当前挑战已超过本档成功窗口：请手动结束后恢复');return;}
     if(elapsed>=targetMs){if(click('#ls-pull')){anchor=null;resultWaitUntil=now+1000;nextPull=now+Math.max(1000,minMs-1000);report('已按本档成功区间中点停止挑战，等待下一次开灯');}}
     else report('A 正按本档公开区间真实计时；暂停或人工输入会取消待按动作');
    }else if(now>=nextPull){anchor=null;if(click('#ls-pull')){anchor=performance.now();nextPull=now+1000;report('A 已开始挑战，按本档公开区间中点计时');}}
   }else if(adapter){adapter.tick();}
  }catch(e){stop('托管异常已停止：'+e.message);return;}
  if(!stopped&&!paused&&role!=='manual')timer=setTimeout(step,mode==='lightsearch'?40:140);
 }
 function setRole(value){if(stopped)return false;if(!['manual','A','B'].includes(value)||!capability(mode,value).supported)return false;clear();role=value;paused=false;nextPull=0;if(value!=='manual'&&!(mode==='pwslide'||(mode==='lightsearch'&&value==='A')))adapter=external();report(value==='manual'?'双端手动':value+' 托管已启用');if(value!=='manual')step();return true;}
 function resume(){if(stopped||role==='manual')return;paused=false;clear();if(!(mode==='pwslide'||(mode==='lightsearch'&&role==='A')))adapter=external();report('恢复托管');step();}
 for(const r of ['A','B']){
  const d=windows[r].document,handler=e=>{if(e.isTrusted&&r===role&&!paused)pause('检测到 '+r+' 人工输入，已暂停托管；可直接接管');};
  for(const type of ['pointerdown','keydown','wheel','touchstart']){d.addEventListener(type,handler,true);clean.push(()=>d.removeEventListener(type,handler,true));}
 }
 const abort=()=>stop('本轮已取消，旧托管动作已清除');signal.addEventListener('abort',abort,{once:true});clean.push(()=>signal.removeEventListener('abort',abort));
 resultTimer=setInterval(syncResult,100);
 if(signal.aborted)stop();
 function command(id){if(stopped||paused||role==='manual'||!adapter)return false;const valid=commands.some(x=>x.id===id);if(!valid)return false;const before=actions,ok=adapter.command(id);if(ok){if(actions===before)actions++;report('已执行口令：'+(commands.find(x=>x.id===id)?.label||id));}return !!ok;}
 return Object.freeze({setRole,pause,resume,stop,syncResult,snapshot,command});
}
window.DevConsoleBot=Object.freeze({capability,create,resultOutcome});
})();
