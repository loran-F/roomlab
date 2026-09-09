/* Dungeon transport watchdog. Uses the existing data listener; not a gameplay timer. */
(function(g){
'use strict';
const WARN_MS=3500,FAIL_MS=9000,TICK_MS=1000;
let current=null;
function active(s){return current===s&&PEER.conn===s.conn;}
function send(s,data){try{if(s.conn.open)s.conn.send(data);}catch(e){/* ICE/heartbeat handles transient send failures. */}}
function removeUI(){document.getElementById('dc-notice')?.remove();document.getElementById('dc-dialog')?.remove();}
function dispose(){const s=current;current=null;if(s){clearInterval(s.timer);s.off.forEach(fn=>fn());s.pending.clear();}removeUI();}
function cancelGather(){if(!DUNGEON)return;clearTimeout(DUNGEON._t);DUNGEON._t=null;hideDgBar();document.querySelectorAll('.dg-ring').forEach(el=>el.style.display='none');}
function blocked(s){return s.state!=='connected'||s.remotePaused;}
function paint(){const s=current;if(!s)return;const screen=document.querySelector('.dungeon-screen');if(screen){screen.dataset.linkState=blocked(s)?(s.state==='failed'?'failed':'recovering'):'connected';if(blocked(s))screen.querySelectorAll('.dg-node').forEach(el=>{el.disabled=true;el.setAttribute('aria-disabled','true');});}
 if(s.state!=='failed'&&blocked(s)&&!document.getElementById('dc-notice')){const el=document.createElement('div');el.id='dc-notice';el.setAttribute('role','status');el.textContent='连接不稳定，正在恢复…集合已取消，暂时不能进入关卡。';document.body.appendChild(el);}
}
function returnToMap(remote){cancelGather();if(DUNGEON&&S.mod!=='dungeon'&&!DUNGEON.over)dungeonAbort(!!remote);}
function recover(s){if(!active(s)||s.state!=='connected')return;s.state='recovering';s.since=Date.now();send(s,{t:'dcPause',v:1});returnToMap(false);paint();}
function resume(s){if(!active(s)||s.state!=='recovering')return;s.state='connected';s.since=0;removeUI();returnToMap(true);send(s,{t:'dcResume',v:1});if(DUNGEON&&!DUNGEON.over){if(g._netMode==='host')dgBroadcast();dgDrawMap();dgMsg('连接已恢复。集合已取消，请重新选择节点后出发。');}paint();}
function fail(s){if(!active(s)||s.state==='failed')return;s.state='failed';clearInterval(s.timer);s.off.forEach(fn=>fn());s.off=[];s.pending.clear();returnToMap(true);clearTimers();clearNetZones();g._dead=true;cancelGather();removeUI();paint();
 const dialog=document.createElement('section');dialog.id='dc-dialog';dialog.setAttribute('role','alertdialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','dc-title');
 dialog.innerHTML='<div class="dc-card"><h2 id="dc-title">同伴已断开连接</h2><p>本次行动已停止，不会扣除机会。请与同伴重新连接房间。</p><button id="dc-reconnect" type="button"></button><button id="dc-menu" type="button">返回密室选择</button></div>';
 document.body.appendChild(dialog);const host=g._netMode==='host',button=document.getElementById('dc-reconnect');button.textContent=host?'重新创建房间':'重新加入房间';button.onclick=()=>{dispose();if(host)renderHostDungeon();else renderDungeonJoin();};document.getElementById('dc-menu').onclick=()=>{dispose();renderDungeonMenu();};button.focus();
 dialog.onkeydown=e=>{if(e.key==='Tab'){const first=button,last=document.getElementById('dc-menu');if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
}
function pcHealthy(s){const pc=s.pc;return !pc||(!['disconnected','failed','closed'].includes(pc.iceConnectionState)&&!['disconnected','failed','closed'].includes(pc.connectionState));}
function checkIce(s){if(!active(s)||s.state==='failed')return;const pc=s.pc;if(!pc)return;if([pc.iceConnectionState,pc.connectionState].some(v=>v==='failed'||v==='closed'))fail(s);else if(!pcHealthy(s))recover(s);}
function watch(conn){dispose();const s=current={conn,pc:conn.peerConnection,state:'connected',remotePaused:false,lastPong:Date.now(),since:0,seq:0,pending:new Set(),off:[],timer:null};
 function listen(target,event,fn,native){if(!target)return;if(native){target.addEventListener(event,fn);s.off.push(()=>target.removeEventListener(event,fn));}else{target.on(event,fn);s.off.push(()=>target.off(event,fn));}}
 listen(conn,'close',()=>fail(s));listen(conn,'error',()=>recover(s));listen(s.pc,'iceconnectionstatechange',()=>checkIce(s),true);listen(s.pc,'connectionstatechange',()=>checkIce(s),true);
 function tick(){if(!active(s)){if(current===s)dispose();return;}if(s.state==='failed')return;const now=Date.now();checkIce(s);if(s.state==='failed')return;if(now-s.lastPong>=FAIL_MS||(s.since&&now-s.since>=FAIL_MS)){fail(s);return;}if(now-s.lastPong>=WARN_MS)recover(s);const seq=++s.seq;s.pending.add(seq);for(const n of s.pending)if(n<seq-12)s.pending.delete(n);send(s,{t:'dcPing',v:1,seq});}
 s.timer=setInterval(tick,TICK_MS);tick();paint();
}
function accept(conn,d){const s=current;if(!s||s.conn!==conn||!active(s)||s.state==='failed')return false;
 if(d.t==='dcPing'){if(d.v===1&&Number.isSafeInteger(d.seq))send(s,{t:'dcPong',v:1,seq:d.seq});return false;}
 if(d.t==='dcPong'){if(d.v===1&&s.pending.delete(d.seq)){s.lastPong=Date.now();if(pcHealthy(s))resume(s);}return false;}
 if(d.t==='dcPause'){if(d.v===1){s.remotePaused=true;returnToMap(true);cancelGather();paint();}return false;}
 if(d.t==='dcResume'){if(d.v===1){s.remotePaused=false;returnToMap(true);cancelGather();if(!blocked(s))removeUI();if(DUNGEON&&!DUNGEON.over){if(g._netMode==='host')dgBroadcast();dgDrawMap();}paint();}return false;}
 if(d.t==='bye'){dispose();return true;}
 if(blocked(s))return ['dgAbort','dg','dgEnd'].includes(d.t);
 return true;
}
function allowed(){return !current||!blocked(current);}
g.DungeonConnection={watch,accept,isBusy:()=>!!current&&current.state!=='failed',status:()=>current?{state:current.remotePaused&&current.state==='connected'?'recovering':current.state,lastPong:current.lastPong,pending:current.pending.size}:null};
const oldClose=closePeer;closePeer=function(){dispose();return oldClose.apply(this,arguments);};
['dgTapHost','dgTapGuest','hostMoveB','dgCheckRing','dgEnterHost','dgBossHost'].forEach(name=>{const old=g[name];g[name]=function(){if(!allowed()){cancelGather();paint();return;}return old.apply(this,arguments);};});
const oldDraw=dgDrawMap;dgDrawMap=function(){const result=oldDraw.apply(this,arguments);paint();return result;};
const oldShell=renderDungeonMapShell;renderDungeonMapShell=function(){const result=oldShell.apply(this,arguments);paint();return result;};
})(window);
