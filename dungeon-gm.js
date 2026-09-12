/* Hidden, host-authoritative route assistance. No gameplay result is fabricated. */
(function(g){
'use strict';
const states=new WeakMap();let panel=null,pending=null,clicks=[],clickRoute=null,clickTimer=null,refreshTimer=null,restoreFocus=null;
function host(){return g._netMode==='host';}
function state(){const d=g.DUNGEON;if(!d)return null;let s=states.get(d);if(!s){s={stamp:null,seen:new Map()};states.set(d,s);}if(host()){
 if(!d.gmEpoch)d.gmEpoch=crypto.randomUUID();
 const stamp=JSON.stringify([d.posA,d.posB,d.over,d.nodes.map(n=>[n.id,!!n.done,!!d.locked[n.id]])]);
 if(s.stamp!==stamp){d.gmRevision=(d.gmRevision||0)+1;s.stamp=stamp;}
 }return s;}
function nextPath(){const d=g.DUNGEON,cur=d&&dgNode(d.posA);if(!cur)return [];
 const visit=(n,path)=>{const choices=n.next.map(dgNode).filter(x=>x&&!x.done&&!d.locked[x.id]).sort((a,b)=>a.x-b.x||a.id.localeCompare(b.id));for(const x of choices){const p=path.concat(x.id);if(x.type==='event'||x.type==='boss')return p;if(x.type==='rest'){const found=visit(x,p);if(found.length)return found;}}return [];};
 return visit(cur,[]);
}
function inspect(){state();const d=g.DUNGEON;let reason='';
 if(!d||d.over)reason='本次路线已经结束。';
 else if(!g.PEER?.conn?.open||g.DungeonConnection?.status()?.state!=='connected'||!g.RoomLoading?.mapReady())reason='连接尚未就绪，请等待同伴重新连接。';
 else if(S.mod!=='dungeon'||document.getElementById('coop-panel')||document.getElementById('room-result')||document.getElementById('room-loading')||d._t||document.getElementById('dg-nodeprogress'))reason='正在集合、准备或玩法中，请先返回地图。';
 else if(d.posA!==d.posB)reason='两人位置不同，请先在同一已完成节点会合。';
 else if(!dgNode(d.posA)?.done)reason='当前节点尚未完成，请先结束当前关卡。';
 const path=reason?[]:nextPath();if(!reason&&!path.length)reason='没有合法的下一关。';
 return {reason,path,target:path.length?dgNode(path.at(-1)):null,epoch:d?.gmEpoch,revision:d?.gmRevision||0,from:d?.posA,routeId:d?.route?.id};
}
function close(){clearInterval(refreshTimer);refreshTimer=null;panel?.remove();panel=null;pending=null;if(restoreFocus?.isConnected)restoreFocus.focus();restoreFocus=null;}
function paint(message){if(!panel)return;const p=inspect();panel.querySelector('[data-gm-target]').textContent=p.target?'即将跳到：'+dgNodeLabel(p.target)+(p.path.length>1?'（沿途安全屋一并略过，不领取补给）':''):'暂时无法跳关';panel.querySelector('[data-gm-reason]').textContent=message||p.reason||(pending?'等待房主确认…':'两人一起前进，不记录玩法成绩或默契评级。');panel.querySelector('[data-gm-skip]').disabled=!!pending||!!p.reason;}
function open(){close();restoreFocus=document.activeElement;panel=document.createElement('section');panel.id='dungeon-gm';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','gm-title');panel.innerHTML='<div class="gm-card"><button class="gm-close" type="button" aria-label="关闭 GM">×</button><h2 id="gm-title">隐藏 GM</h2><p data-gm-target></p><p data-gm-reason role="status"></p><button class="btn primary" data-gm-skip type="button">跳过下一关</button></div>';document.body.append(panel);panel.querySelector('.gm-close').onclick=close;panel.querySelector('[data-gm-skip]').onclick=request;
 panel.onclick=e=>{if(e.target===panel)close();};panel.onkeydown=e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const b=[...panel.querySelectorAll('button:not(:disabled)')];if(e.shiftKey&&document.activeElement===b[0]){e.preventDefault();b.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===b.at(-1)){e.preventDefault();b[0].focus();}}};paint();panel.querySelector('.gm-close').focus();refreshTimer=setInterval(()=>{if(!document.querySelector('.dungeon-screen')||DUNGEON?.over){close();return;}if(pending&&(!PEER.conn?.open||Date.now()-pending.time>5000)){pending=null;paint('请求未获确认，请核对当前位置后重试。');}else if(!pending)paint();},500);
}
function request(){const p=inspect();if(p.reason){paint(p.reason);return;}if(pending)return;const m={t:'gmSkip',v:1,requestId:crypto.randomUUID(),epoch:p.epoch,routeId:p.routeId,revision:p.revision,from:p.from,target:p.target.id};pending={...m,time:Date.now()};paint();if(host())handle(m);else netSend(m);}
function respond(m,ok,reason){const reply={t:'gmReply',v:1,requestId:m.requestId,ok,reason};netSend(reply);if(pending?.requestId===m.requestId){pending=null;if(ok)close();else paint(reason);}return reply;}
function handle(m){if(!host()||m.v!==1||typeof m.requestId!=='string'||m.requestId.length>80)return;const s=state();if(!s)return;
 if(s.seen.has(m.requestId)){netSend(s.seen.get(m.requestId));dgBroadcast();return;}
 const p=inspect();let reason=p.reason;
 if(!reason&&(m.epoch!==p.epoch||m.routeId!==p.routeId||m.revision!==p.revision||m.from!==p.from||m.target!==p.target.id))reason='地图位置已变化，本次请求已失效，请重新查看目标。';
 if(reason){const reply=respond(m,false,reason);s.seen.set(m.requestId,reply);return;}
 // Commit once on A. Skip rest without claiming its supply or a gameplay win.
 for(const id of p.path){const n=dgNode(id);DUNGEON.nodes.forEach(x=>{if(x.layer===n.layer&&x.id!==id&&!x.done)DUNGEON.locked[x.id]=true;});n.done=true;n.gmSkipped=true;}
 DUNGEON.posA=DUNGEON.posB=p.target.id;state();const reply={t:'gmReply',v:1,requestId:m.requestId,ok:true,reason:''};s.seen.set(m.requestId,reply);if(s.seen.size>256)s.seen.delete(s.seen.keys().next().value);close();
 if(p.target.id===DUNGEON.boss||p.target.roomFinale){g.RoomResults?.close();dgBossWin();}else{dgBroadcast();renderDungeonHostMap();dgMsg('GM 已跳过：'+dgNodeLabel(p.target));}
 netSend(reply);
}
const oldSnapshot=dgSnapshot;dgSnapshot=function(){state();const d=oldSnapshot.apply(this,arguments);d.gmRouteId=DUNGEON.route?.id;d.gmEpoch=DUNGEON.gmEpoch;d.gmRevision=DUNGEON.gmRevision||0;d.nodes.forEach(n=>n.gmSkipped=!!dgNode(n.id)?.gmSkipped);return d;};
const oldApply=applyDungeon;applyDungeon=function(data){const r=oldApply.apply(this,arguments);if(DUNGEON&&data.roomId===DUNGEON.roomId&&typeof data.gmRouteId==='string'&&data.gmRouteId===DUNGEON.route?.id&&typeof data.gmEpoch==='string'&&Number.isSafeInteger(data.gmRevision)){DUNGEON.gmEpoch=data.gmEpoch;DUNGEON.gmRevision=data.gmRevision;data.nodes.forEach(n=>{const local=dgNode(n.id);if(local)local.gmSkipped=!!n.gmSkipped;});if(pending&&(pending.epoch!==DUNGEON.gmEpoch||pending.revision!==DUNGEON.gmRevision))close();}return r;};
const oldHost=dgHostOnData;dgHostOnData=function(m){if(m?.t==='gmSkip'){handle(m);return;}if(m?.t==='gmReply')return;return oldHost.apply(this,arguments);};
const oldGuest=dgGuestOnData;dgGuestOnData=function(m){if(m?.t==='gmReply'){if(m.v===1&&pending?.requestId===m.requestId){pending=null;if(m.ok)close();else paint(m.reason);}return;}if(m?.t==='gmSkip')return;return oldGuest.apply(this,arguments);};
const oldClose=closePeer;closePeer=function(){close();clearTimeout(clickTimer);clicks=[];clickRoute=null;return oldClose.apply(this,arguments);};
document.addEventListener('click',e=>{const el=e.target.closest?.('.dg-node');if(!el||!g.DUNGEON||el.dataset.id!==DUNGEON.start||!el.closest('.dungeon-screen')){clearTimeout(clickTimer);clicks=[];return;}const d=DUNGEON,key=d.gmEpoch||d.route?.id;if(key!==clickRoute){clicks=[];clickRoute=key;}const now=Date.now();clicks=clicks.filter(t=>now-t<2200);clicks.push(now);clearTimeout(clickTimer);e.preventDefault();e.stopImmediatePropagation();
 // Buffer entrance navigation so the secret gesture never moves one actor away.
 if(clicks.length===5){clicks=[];open();return;}
 clickTimer=setTimeout(()=>{clicks=[];if(DUNGEON===d&&!panel&&S.mod==='dungeon'&&el.isConnected){if(host())dgTapHost(d.start);else if(g._netMode==='guest')dgTapGuest(d.start);}},450);
},true);
g.DungeonGM={inspect};
})(window);

