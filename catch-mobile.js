(function(){
'use strict';
var catchCtx=null;
function catchSession(){var m=window.RoomSession&&RoomSession.current();return m&&m.mode==='catch'?m:null;}
var catchLevels=[null,{goal:6,timeLimit:75,receiverWidth:96,maxActive:2,gravityPerTick:.0015,windScale:0,fall:.8,delay:2000,badRate:0},{goal:10,timeLimit:70,receiverWidth:84,maxActive:3,gravityPerTick:.0025,windScale:.2,fall:.9,delay:1400,badRate:.15},{goal:14,timeLimit:70,receiverWidth:76,maxActive:4,gravityPerTick:.004,windScale:.4,fall:1.05,delay:1050,badRate:.22},{goal:18,timeLimit:70,receiverWidth:68,maxActive:5,gravityPerTick:.0055,windScale:.65,fall:1.2,delay:800,badRate:.29},{goal:22,timeLimit:75,receiverWidth:60,maxActive:6,gravityPerTick:.007,windScale:.9,fall:1.35,delay:550,badRate:.34}];
function catchConfig(tier){return Object.assign({moveAccelerationPerTick:.7,moveRetention:.72,badPenalty:3},catchLevels[Math.max(1,Math.min(5,tier||1))]);}
// Shared HTML owns the run token and final snapshot. This hook only binds UI actions.
var resultConn=null,resultRun=null,oldResultRuns=new Set();
var priorResultPanel=showFB;showFB=function(data){if(S.mod==='catch'&&window.RoomResults&&RoomResults.status())return;return priorResultPanel.apply(this,arguments);};
window.catchResultBegin=function(runId,who,conn){
 var meta=catchSession();if(meta)return runId===meta.runId&&who===meta.role&&conn===PEER.conn;
 if(window._dungeon)return true;
 if(!window.RoomResults||typeof runId!=='string'||!runId||runId.length>240||conn!==PEER.conn||S.mod!=='catch')return false;
 if(resultConn!==conn){resultConn=conn;resultRun=null;oldResultRuns.clear();}
 if(oldResultRuns.has(runId))return false;
 if(resultRun&&resultRun!==runId)oldResultRuns.add(resultRun);
 resultRun=runId;
 RoomResults.begin({runId:runId,role:who,connection:conn,gameId:'catch',title:'情报空投',dungeon:null,
 onContinue:function(){if(who==='A'&&window._host&&window._host.mode==='catch')window._host.reset();},
 onExit:function(){netSend({t:'bye'});clearTimers();closePeer();renderHall();}});
 return true;
};

window.CatchVariation={config:catchConfig,create:function(ctx,config){
 var plan=RoomVariation.start('catch',catchSession()||ctx||catchCtx),index=0,seed=plan.tier===1?1:plan.seed||1,cfg=config||catchConfig(plan.tier);
 function random(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;}
 return {tier:plan.tier,plan:plan,config:cfg,spawn:function(){var i=index++,wave=plan.waves[Math.floor(i/3)%plan.waves.length],r=random(),type=plan.tier===1?['good','good','gold','bad','good','gold'][i%6]:r<cfg.badRate?'bad':r>.83?'gold':'good';return {id:(catchSession()?.runId||'catch')+':'+i,type:type,x:plan.tier===1?[150,190,165,285,130,175][i%6]:(wave.side<0?30:182)+random()*128,vy:cfg.fall*(plan.tier===1?1:.94+random()*.12),vx:plan.tier===1?0:(random()-.5)*(plan.tier-1)*.3,delay:cfg.delay*(plan.tier===1?1:.9+random()*.2)};}};
}};
// Standalone catch only. Reuses the existing protocol dispatchers, never adds data listeners.
var link=null;
function linkLive(s){return link===s&&PEER.conn===s.conn&&S.mod==='catch'&&!window._dungeon&&s.canvas.isConnected;}
function linkSend(s,d){try{if(s.conn.open)s.conn.send(d);}catch(e){}}
function linkBlocked(){return !!(link&&linkLive(link)&&(link.state!=='connected'||link.remotePaused));}
function linkRemoveUI(){var n=document.getElementById('ct-connection');if(n)n.remove();}
function linkDispose(){var s=link;link=null;if(!s)return;clearInterval(s.timer);s.conn.off('close',s.close);if(s.pc)s.pc.removeEventListener('iceconnectionstatechange',s.ice);s.pending.clear();linkRemoveUI();}
function linkRelease(s){window._inL=false;PEER.gdir=0;if(s.role==='B'&&window._guestSetDir)window._guestSetDir(0);var b=$('ct-tap');if(b)b.setAttribute('aria-pressed','false');}
function linkPaint(s){
 if(!linkLive(s))return;var blocked=linkBlocked(),b=$('ct-tap');if(blocked&&b)b.disabled=true;
 if(!blocked){linkRemoveUI();return;}
 var box=$('ct-connection');if(!box){box=document.createElement('section');box.id='ct-connection';box.setAttribute('role','status');document.querySelector('.catch-mobile').appendChild(box);}
 if(s.state==='failed'){
  if($('msg'))$('msg').textContent='连接已断开，本局已停止。';
  if(box.dataset.failed)return;box.dataset.failed='true';box.setAttribute('role','alert');
  box.innerHTML='<strong>同伴已断开连接</strong><p>本局已停止。请重新连接房间，再开始一局。</p><button id="ct-reconnect">'+(s.role==='A'?'重新创建房间':'重新加入房间')+'</button><button id="ct-menu">返回玩法选择</button>';
  $('ct-reconnect').onclick=function(){var role=s.role,next=location.search.slice(1).split('&').filter(function(p){return p&&!/^(m|role)=/.test(p);});next.push('m=catch','role='+role);linkDispose();clearTimers();closePeer();location.search='?'+next.join('&');};
  $('ct-menu').onclick=function(){linkDispose();clearTimers();closePeer();location.search='';};
 }else box.textContent='连接暂时不稳定，已暂停操作和计时，正在等待恢复…';
}
function linkFail(s){if(!linkLive(s)||s.state==='failed')return;linkSend(s,{t:'ctEnd',sender:s.id});s.state='failed';linkRelease(s);window._dead=true;clearTimers();clearNetZones();var lesson=$('coop-panel');if(lesson)lesson.remove();var intro=$('intro-ov');if(intro)intro.remove();clearInterval(s.timer);s.conn.off('close',s.close);if(s.pc)s.pc.removeEventListener('iceconnectionstatechange',s.ice);s.pending.clear();linkPaint(s);}
function linkTick(s){
 if(!linkLive(s)){if(link===s)linkDispose();return;}if(s.state==='failed')return;
 var now=performance.now(),ice=s.pc&&s.pc.iceConnectionState,bad=ice==='disconnected'||ice==='failed'||ice==='closed';
 if(!s.conn.open||ice==='closed'){linkFail(s);return;}
 if(bad||now-s.last>3000){if(s.state!=='recovering'){s.state='recovering';s.since=now;linkRelease(s);}}
 else if(s.state==='recovering'){s.state='connected';s.since=0;linkRelease(s);}
 if(now-s.last>8000||(s.since&&now-s.since>8000)){linkFail(s);return;}
 if(now-s.sent>=700){s.sent=now;var id=s.id+':'+(++s.seq);s.pending.add(id);if(s.pending.size>16)s.pending.delete(s.pending.values().next().value);linkSend(s,{t:'ctPing',id:id,sender:s.id,paused:s.state==='recovering'});}
 if(s.remotePaused)linkRelease(s);linkPaint(s);
}
function linkMessage(d){
 if(!d||!['ctPing','ctPong','ctEnd'].includes(d.t))return false;
 var s=link;if(!s||!linkLive(s)||s.state==='failed')return true;
 if(d.t==='ctEnd'){if(s.remoteId&&d.sender===s.remoteId)linkFail(s);return true;}
 if(d.t==='ctPing'&&typeof d.id==='string'&&d.id.length<100){if(s.remoteId&&d.sender===s.remoteId)s.remotePaused=d.paused===true;linkSend(s,{t:'ctPong',id:d.id,sender:s.id});}
 if(d.t==='ctPong'&&s.pending.has(d.id)&&typeof d.sender==='string'){s.pending.delete(d.id);s.last=performance.now();if(s.remoteId!==d.sender)s.remotePaused=false;s.remoteId=d.sender;}
 linkTick(s);return true;
}
function linkStart(role,canvas){
 linkDispose();if(catchSession()||window._dungeon||!PEER.conn)return;
 var s={conn:PEER.conn,pc:PEER.conn.peerConnection,canvas:canvas,role:role,state:'connected',remotePaused:false,last:performance.now(),sent:0,since:0,seq:0,id:Math.random().toString(36).slice(2),pending:new Set()};link=s;
 s.close=function(){linkFail(s);};s.ice=function(){linkTick(s);};s.conn.on('close',s.close);if(s.pc)s.pc.addEventListener('iceconnectionstatechange',s.ice);s.timer=setInterval(function(){linkTick(s);},250);linkTick(s);
}
var catchHD=dgHostOnData;dgHostOnData=function(d){if(linkMessage(d))return;return catchHD.apply(this,arguments);};
var catchGD=dgGuestOnData;dgGuestOnData=function(d){if(linkMessage(d))return;return catchGD.apply(this,arguments);};
window.CatchConnection={paused:linkBlocked,status:function(){return link&&linkLive(link)?{state:link.state,remotePaused:link.remotePaused,role:link.role}:null;}};
function plantRoom(){var m=catchSession();if(m)return m.roomId==='room-1';return !!window._dungeon&&typeof DUNGEON!=='undefined'&&DUNGEON&&DUNGEON.roomId==='room-1';}
window.catchMobileText=function(txt){return plantRoom()?String(txt).replace(/绿箱|好物/g,'花盆').replace(/金箱/g,'牛奶').replace(/红箱|坏物/g,'碎砖').replace(/接收篮|接货员/g,'接物布'):txt;};
function shape(c,color,points){c.fillStyle=color;c.beginPath();points.forEach(function(p,i){if(i)c.lineTo(p[0],p[1]);else c.moveTo(p[0],p[1]);});c.closePath();c.fill();c.stroke();}
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();c.stroke();}
function catchVisualHalf(){var m=catchSession();return m?catchConfig(m.tier).receiverWidth/2:32;}
function plantScene(c,px,items){
 c.clearRect(0,0,340,400);c.fillStyle='#ecd8b8';c.fillRect(0,0,340,400);c.strokeStyle='#cfb895';c.lineWidth=1;
 for(var y=40;y<330;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(340,y);c.stroke();}
 // Quiet apartment edges leave the entire central falling lane clear.
 [0,284].forEach(function(x){c.fillStyle='#cfb895';c.fillRect(x,34,56,243);c.fillStyle='#759b99';c.fillRect(x+6,42,44,225);c.fillStyle='#adc6bd';c.fillRect(x+12,49,13,205);c.fillStyle='#ead2ac';c.fillRect(x+4,112,48,6);c.fillRect(x+4,189,48,6);});
 c.fillStyle='#b6b89c';c.fillRect(0,367,340,33);c.strokeStyle='#343b32';c.lineWidth=2;
 // The cloth lip matches the existing receiver center and collision width.
 var half=catchVisualHalf(),left=Math.max(17,px-half-12),right=Math.min(323,px+half+12);
 function person(x,girl){c.fillStyle=girl?'#5d8957':'#686b42';c.fillRect(x-10,355,20,27);oval(c,x,346,12,14,'#f3c394');c.fillStyle='#3e342a';if(girl){c.fillRect(x-13,332,26,10);c.fillRect(x-13,338,5,15);c.fillRect(x+8,338,5,15);}else{oval(c,x,334,14,5,'#3e342a');c.fillStyle='#272c2a';c.fillRect(x-11,341,22,6);}c.fillStyle='#343b32';c.fillRect(x-9,381,7,5);c.fillRect(x+3,381,7,5);}
 person(left,false);person(right,true);shape(c,'#f3efe0',[[px-half,352],[px+half,352],[px+half-9,366],[px-half+9,366]]);c.strokeStyle='#5a806c';c.beginPath();c.moveTo(px-half+5,357);c.quadraticCurveTo(px,373,px+half-5,357);c.stroke();
 items.forEach(function(it){c.save();c.translate(it.x,it.y);c.strokeStyle='#343b32';c.lineWidth=1.8;
 if(it.type==='good'){c.strokeStyle='#356344';c.beginPath();c.moveTo(0,2);c.lineTo(0,-18);c.stroke();oval(c,-7,-14,8,5,'#68a04f');oval(c,6,-20,7,5,'#93ba65');oval(c,8,-8,8,5,'#528b4c');c.strokeStyle='#343b32';shape(c,'#c67c50',[[-11,0],[11,0],[8,15],[-8,15]]);c.fillStyle='#e9ab73';c.fillRect(-12,-1,24,4);}
 else if(it.type==='gold'){shape(c,'#fff9df',[[-10,-10],[0,-17],[10,-10],[10,15],[-10,15]]);c.fillStyle='#719cb5';c.fillRect(-9,-5,18,8);c.fillStyle='#343b32';c.font='bold 9px sans-serif';c.textAlign='center';c.fillText('+2',0,12);}
 else{shape(c,'#d66a55',[[-14,-5],[-3,-12],[12,-5],[9,9],[-8,12]]);c.strokeStyle='#fff2df';c.lineWidth=2.5;c.beginPath();c.moveTo(-5,-4);c.lineTo(5,5);c.moveTo(5,-4);c.lineTo(-5,5);c.stroke();}c.restore();});
}
window.catchMobileDraw=function(c,px,items){
 if(plantRoom()){plantScene(c,px,items);return;}
 c.clearRect(0,0,340,400);c.fillStyle='#ffe8ac';c.fillRect(0,0,340,400);c.strokeStyle='#eac98c';c.lineWidth=1;
 for(var y=45;y<350;y+=55){c.beginPath();c.moveTo(18,y);c.lineTo(322,y);c.stroke();}
 c.fillStyle='#dec38c';c.fillRect(0,365,340,3);c.fillStyle='#e9a342';c.strokeStyle='#30253a';c.lineWidth=3;c.beginPath();c.moveTo(px-32,338);c.lineTo(px+32,338);c.lineTo(px+25,362);c.lineTo(px-25,362);c.closePath();c.fill();c.stroke();c.fillStyle='#30253a';c.font='bold 12px sans-serif';c.textAlign='center';c.fillText('接收篮',px,354);
 items.forEach(function(it){c.lineWidth=2;c.strokeStyle='#30253a';c.fillStyle=it.type==='good'?'#91cba1':it.type==='gold'?'#ffcd55':'#ed8875';c.beginPath();if(it.type==='good')c.rect(it.x-10,it.y-10,20,20);else if(it.type==='gold'){c.moveTo(it.x,it.y-12);c.lineTo(it.x+12,it.y+10);c.lineTo(it.x-12,it.y+10);c.closePath();}else c.arc(it.x,it.y,11,0,Math.PI*2);c.fill();c.stroke();if(it.type==='bad'){c.fillStyle='#30253a';c.font='bold 14px sans-serif';c.fillText('×',it.x,it.y+5);}});
};
function layout(role){
 var canvas=document.querySelector('#stage canvas');if(!canvas)return;
 var count=$('count').textContent,goal=$('goal').textContent,fb=$('fb');clearNetZones();
 $('app').innerHTML='<section class="catch-mobile"><header class="ct-top"><button id="back" aria-label="返回">‹</button><strong>情报空投</strong><span id="count">'+count+'</span></header><div class="ct-status"><span id="goal">'+goal+'</span><span>绿箱 +1 · 金箱 +2 · 红色避开</span></div><div class="ct-arena" id="stage"></div><div id="msg" class="msg" role="status">移动接收篮接物资，遇到红色危险物及时避开。</div><footer class="ct-controls"><div class="ct-role"><b class="ct-role-'+role.toLowerCase()+'">'+role+'</b><span>你负责'+(role==='A'?'左移':'右移')+'，两人共同控制接收篮</span></div><button id="ct-tap" class="ct-role-'+role.toLowerCase()+'" disabled>'+(role==='A'?'← 按住向左移动':'按住向右移动 →')+'</button><p>按住移动，松手减速 · 可与同伴一起刹停</p></footer></section>';
 if(plantRoom()){var shell=document.querySelector('.catch-mobile');shell.classList.add('ct-plant');shell.dataset.roomTheme='room-1';shell.querySelector('.ct-top strong').textContent='接住小花盆';shell.querySelector('.ct-status span:last-child').textContent='花盆 +1 · 牛奶 +2 · 碎砖 −3秒';$('msg').textContent='两人托住接物布：接花盆和牛奶，避开红色碎砖。';shell.querySelector('.ct-role span').textContent='你负责'+(role==='A'?'左移':'右移')+'，一起托稳接物布';}
 $('stage').appendChild(canvas);if(fb)$('app').appendChild(fb);$('back').onclick=function(){if(catchSession()&&catchCtx)return catchCtx.abort();return gobackMenu();};
 var button=$('ct-tap');function set(v){button.setAttribute('aria-pressed',String(!!v));if(role==='A')window._inL=!!v;else if(window._guestSetDir)window._guestSetDir(v?1:0);}
 button.onpointerdown=function(e){if(button.disabled)return;e.preventDefault();try{button.setPointerCapture(e.pointerId);}catch(_){}set(true);};button.onpointerup=button.onpointercancel=button.onlostpointercapture=function(){set(false);};
 function release(){set(false);}window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);
 linkStart(role,canvas);
 var timer=setInterval(function(){if(!button.isConnected){clearInterval(timer);return;}var s=role==='B'&&window._guestState?window._guestState():null;button.disabled=!!window._dead||!!window._introLock||linkBlocked()||(role==='B'&&(!s||s.dead||s.win));},80);
 var conn=PEER.conn;function close(){release();button.disabled=true;clearInterval(timer);if($('msg'))$('msg').textContent='连接断开，请返回后重新建房。';}if(conn)conn.on('close',close);
 var observer=new MutationObserver(function(){if(!button.isConnected){if(link&&link.canvas===canvas)linkDispose();clearInterval(timer);release();window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',release);if(conn&&conn.off)conn.off('close',close);observer.disconnect();}});observer.observe($('app'),{childList:true});
}
var host=startHostGame;startHostGame=function(){var isCatch=S.mod==='catch';host();if(isCatch)layout('A');};
var guest=renderGuestUI;renderGuestUI=function(code){var isCatch=S.mod==='catch';guest(code);if(isCatch)layout('B');};
window.catchDirectMount=function(ctx,config){
 catchCtx=ctx;var role=ctx.role,themed=ctx.roomId==='room-1';clearNetZones();
 $('app').innerHTML='<section class="catch-mobile '+(themed?'ct-plant':'')+'"><header class="ct-top"><button id="ct-back" aria-label="返回">‹</button><strong>'+(themed?'接住小花盆':'情报空投')+'</strong><span id="count">准备中</span></header><div class="ct-status"><span id="goal">0 / '+config.goal+'</span><span>'+(themed?'花盆 +1 · 牛奶 +2 · 碎砖避开':'绿箱 +1 · 金箱 +2 · 红色避开')+'</span></div><div class="ct-arena"><canvas id="ct-direct-canvas" width="340" height="400"></canvas></div><p id="msg" class="msg" role="status">先看清落物，再和同伴一起准备；按住移动，松手减速。</p><footer class="ct-controls"><div class="ct-role"><b class="ct-role-'+role.toLowerCase()+'">'+role+'</b><span>你负责'+(role==='A'?'左移':'右移')+'，两人共同托住接物布</span></div><button id="ct-ready">我准备好了</button><button id="ct-tap" class="ct-role-'+role.toLowerCase()+'" disabled>'+(role==='A'?'← 按住向左移动':'按住向右移动 →')+'</button><p>两人都松手可刹停 · 注意落物横向飘动</p></footer></section>';
 return {canvas:$('ct-direct-canvas'),button:$('ct-tap'),ready:$('ct-ready'),status:$('msg'),count:$('count'),goal:$('goal'),back:$('ct-back')};
};
window.RoomGameAdapters=window.RoomGameAdapters||{};window.RoomGameAdapters.catch={host:function(ctx){catchCtx=ctx;return RoomDirectCore.catchHost(ctx,catchConfig(catchSession()?.tier||ctx.tier));},guest:function(ctx){catchCtx=ctx;return RoomDirectCore.catchGuest(ctx,catchConfig(catchSession()?.tier||ctx.tier));}};
})();
