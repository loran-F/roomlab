/* Optional companion input for the local desk. Never writes game state. */
(function(){
'use strict';
function sliceState(s){return !!s&&Array.isArray(s.rows)&&[6,8].includes(s.rows.length)&&s.rows.every((r,i)=>r&&r.owner===(i%2?'B':'A')&&Number.isInteger(r.offset)&&Math.abs(r.offset)<=64)&&s.confirmed&&['A','B'].every(r=>typeof s.confirmed[r]==='boolean');}
function outcome(s){return s.win===false?'本关失败，托管已停止':s.win===true?'本关成功，托管已停止':'本关已结束，托管已停止';}
const resultStages=new Set(['game-success','game-fail','room-complete','room-fail']);
function resultOutcome(status){
 if(!status||!resultStages.has(status.stage))return null;
 if(status.stage==='game-success'||status.stage==='room-complete'||status.outcome==='success')return '本关成功，托管已停止';
 if(status.stage==='game-fail'||status.stage==='room-fail'||status.outcome==='fail')return '本关失败，托管已停止';
 return '本关已结束，托管已停止';
}
function capability(mode,role,state){
 if(role==='manual')return {supported:true,detail:'双端手动：两端均由你操作。'};
 if(mode==='pwslide'&&state!==undefined&&!sliceState(state))return {supported:false,detail:'当前密码版本不是受支持的 A/B 同图切片结构，托管已禁用；请双端手动。'};
 if(mode==='pwslide')return {supported:true,detail:'托管仅推动自己的奇/偶行，跟随人工端第一条的可见位置；全部切口接齐后确认。人工端仍需调整并确认。'};
 if(mode==='lightsearch'&&role==='A')return {supported:true,detail:'A 真实等待 10.5 秒开灯；B 由你收齐道具并回出口。暂停立即取消待按动作。'};
 return {supported:false,detail:mode==='lightsearch'?'B 的可见地图探索尚未可靠适配，请手动搜索。':'此玩法尚未完成可靠托管适配，请使用双端手动。'};
}
function create({windows,mode,signal,onChange=()=>{}}){
 let role='manual',paused=false,stopped=false,timer=null,resultTimer=null,anchor=null,nextPull=0,resultWaitUntil=0,actions=0,message='双端手动',gameId=null;
 const clean=[];
 const initialResults=['A','B'].map(r=>windows[r]?.RoomResults?.status?.()).filter(Boolean);
 const resultRunId=initialResults.find(s=>s.stage==='playing')?.runId||initialResults[0]?.runId||null;
 function snapshot(){return {role,paused,stopped,actions,message,gameId};}
 function report(text){message=text;onChange(snapshot());}
 function clear(){clearTimeout(timer);timer=null;anchor=null;resultWaitUntil=0;}
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
 function step(){
  timer=null;if(stopped||syncResult()||paused||role==='manual'||signal.aborted)return;
  try{
   if(['A','B'].some(r=>!windows[r]?.PEER?.conn?.open||windows[r].S?.mod!==mode)){stop('连接中断或已离开本关，托管已停止');return;}
   if(['A','B'].some(r=>['failed','recovering'].includes(windows[r].DungeonConnection?.status()?.state))){pause('连接不稳定，托管已暂停');return;}
   const w=windows[role],s=mode==='pwslide'?w.PasswordStrip?.state():w.RhythmLight?.state();
   if(!s){stop('当前玩法状态不可读，托管已停止');return;}
   if(gameId&&gameId!==s.id){stop('游戏轮次已变化，请重新选择托管');return;}gameId=s.id;
   if(s.done||s.phase==='done'){stop(outcome(s));return;}
   if(mode==='pwslide'&&s.phase==='play'){
    if(!sliceState(s)||!w.document.querySelector('.ps-board [data-ps-band]')){stop('当前密码版本/画面不是受支持的同图切片，托管已禁用；请双端手动');return;}
    if(s.confirmed[role]){report('本角色已确认，等待人工端；不再调整条片');timer=setTimeout(step,140);return;}
    // Offsets are exactly the shared SVG translations visible to both players.
    const human=s.rows.filter(r=>r.owner!==role),target=human[0]?.offset;
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
   }else if(mode==='lightsearch'&&s.started){
    const now=performance.now();
    if(s.challenge==='running'&&now<resultWaitUntil){report('已停止挑战，等待游戏同步结果');}
    else if(s.challenge==='running'){
     if(anchor===null){pause('当前挑战起点未知：请手动结束当前挑战，再点恢复；不会补按旧计时');return;}
     const elapsed=now-anchor;
     if(elapsed>=11000){pause('当前挑战已过 11 秒窗口：请手动结束后恢复');return;}
     if(elapsed>=10500){if(click('#ls-pull')){anchor=null;resultWaitUntil=now+1000;nextPull=now+9500;report('已按真实计时停止挑战，等待下一次开灯');}}
     else report('A 正在真实默数；暂停或人工输入会取消待按动作');
    }else if(now>=nextPull){anchor=null;if(click('#ls-pull')){anchor=performance.now();nextPull=now+1000;report('A 已开始挑战，真实等待 10.5 秒');}}
   }
  }catch(e){stop('托管异常已停止：'+e.message);return;}
  if(!stopped&&!paused&&role!=='manual')timer=setTimeout(step,mode==='lightsearch'?40:140);
 }
 function setRole(value){if(stopped)return false;if(!['manual','A','B'].includes(value)||!capability(mode,value).supported)return false;clear();role=value;paused=false;nextPull=0;report(value==='manual'?'双端手动':value+' 托管已启用');if(value!=='manual')step();return true;}
 function resume(){if(stopped||role==='manual')return;paused=false;clear();report('恢复托管');step();}
 for(const r of ['A','B']){
  const d=windows[r].document,handler=e=>{if(e.isTrusted&&r===role&&!paused)pause('检测到 '+r+' 人工输入，已暂停托管；可直接接管');};
  for(const type of ['pointerdown','keydown','wheel','touchstart']){d.addEventListener(type,handler,true);clean.push(()=>d.removeEventListener(type,handler,true));}
 }
 const abort=()=>stop('本轮已取消，旧托管动作已清除');signal.addEventListener('abort',abort,{once:true});clean.push(()=>signal.removeEventListener('abort',abort));
 resultTimer=setInterval(syncResult,100);
 if(signal.aborted)stop();
 return Object.freeze({setRole,pause,resume,stop,syncResult,snapshot});
}
window.DevConsoleBot=Object.freeze({capability,create,resultOutcome});
})();
