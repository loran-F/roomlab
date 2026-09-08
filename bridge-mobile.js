/* Mobile bridge game: one authoritative simulation for standalone and dungeon. */
(function(){
'use strict';
var active=null,view=null,dispose=null,seq=0,held=false,role='A';
function send(d){netSend(d);}
function clean(){if(dispose){dispose();dispose=null;}active=null;view=null;held=false;}
function make(){return {id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),time:window._dungeon?coopTime(60):60,ready:{A:false,B:false},cd:3,inputs:{A:false,B:false},seen:{A:0,B:0},seq:{A:-1,B:-1},px:170,pv:0,pW:110,ball:null,carrying:false,spawn:.7,lastDir:0,got:0,goal:5,spills:0,limit:5,rescue:null,rescueUsed:false,done:false,win:false,msg:'接住货物，平稳送到右侧出口。双方同时按住可以刹车。'};}
function snapshot(s){return {id:s.id,time:s.time,ready:s.ready,cd:s.cd,inputs:s.inputs,px:s.px,pv:s.pv,pW:s.pW,ball:s.ball,carrying:s.carrying,got:s.got,goal:s.goal,spills:s.spills,limit:s.limit,rescue:s.rescue,rescueUsed:s.rescueUsed,done:s.done,win:s.win,msg:s.msg};}
function input(d,who){var s=active;if(!s||d.id!==s.id||s.done)return;if(d.t==='brReady'){s.ready[who]=true;return;}if(!Number.isInteger(d.seq)||d.seq<=s.seq[who])return;s.seq[who]=d.seq;s.inputs[who]=!!d.v;s.seen[who]=performance.now();}
function act(v){held=!!v;var s=role==='A'?active:view;if(!s)return;var d={t:'brInput',id:s.id,seq:++seq,v:held};if(role==='A')input(d,'A');else send(d);}
function end(s,win,message){s.done=true;s.win=win;s.msg=message;s.inputs={A:false,B:false};}
function step(s,dt){
 if(s.done||!s.ready.A||!s.ready.B)return;
 if(s.cd>0){s.cd=Math.max(0,s.cd-dt);return;}
 s.time=Math.max(0,s.time-dt);if(s.time===0){end(s,false,'时间到，下次把货物接稳再出发。');return;}
 if(s.rescue){s.rescue.left-=dt;s.rescue.held=s.inputs.A&&s.inputs.B?s.rescue.held+dt:0;
  if(s.rescue.held>=.5){s.rescue=null;s.pv=0;s.lastDir=0;s.msg='刹住了！货物保住，继续送往出口。';}
  else if(s.rescue.left<=0){s.rescue=null;s.carrying=false;s.spills++;s.pv=0;s.lastDir=0;s.spawn=1;s.msg='没有刹住，货物落地。';if(s.spills>=s.limit)end(s,false,'失误次数已用完。');}return;
 }
 var dir=(s.inputs.B?1:0)-(s.inputs.A?1:0),brake=s.inputs.A&&s.inputs.B;
 if(s.carrying&&dir&&s.pv*dir<0&&Math.abs(s.pv)>35){
  if(!s.rescueUsed){s.rescueUsed=true;s.rescue={left:2.5,held:0};s.msg='急转要甩掉了！双方同时按住 0.5 秒刹车救场。';return;}
  s.carrying=false;s.spills++;s.spawn=1;s.msg='急转甩掉货物，先松手减速再换方向。';if(s.spills>=s.limit){end(s,false,'失误次数已用完。');return;}
 }
 var target=dir*105;s.pv+=(target-s.pv)*Math.min(1,dt*(brake?18:7));s.px=Math.max(55,Math.min(285,s.px+s.pv*dt));
 if(s.carrying){if(s.px+s.pW/2>=296){s.got++;s.carrying=false;s.spawn=.8;s.msg='已送达 '+s.got+' / '+s.goal+'，回去接下一件。';if(s.got>=s.goal)end(s,true,'撤离成功！五件货物全部送达。');}return;}
 if(!s.ball){s.spawn-=dt;if(s.spawn<=0)s.ball={x:65+Math.random()*165,y:55};}
 else {s.ball.y+=65*dt;if(s.ball.y>=320&&s.ball.y<=340&&Math.abs(s.ball.x-s.px)<=s.pW/2){s.ball=null;s.carrying=true;s.msg='接稳了！平缓运到右侧出口，反向前先松手。';}else if(s.ball.y>400){s.ball=null;s.spills++;s.spawn=.7;s.msg='漏接货物，失误 '+s.spills+' / '+s.limit;if(s.spills>=s.limit)end(s,false,'失误次数已用完。');}}
}
function shell(who){
 role=who;seq=0;clearNetZones();window._inL=window._inR=false;window._lastMsg=null;
 $('app').innerHTML='<section class="bridge-mobile"><header class="br-top"><button id="back" aria-label="返回">‹</button><strong>撤离架桥</strong><span id="count">--s</span></header><div class="br-status"><span id="goal">送达 0 / 5</span><span id="br-misses">失误 0 / 5</span></div><div class="br-arena"><canvas id="br-canvas" width="340" height="400"></canvas><div id="br-countdown" aria-live="polite"></div></div><div id="msg" class="br-message" role="status">等待同伴连接…</div><footer class="br-controls"><div class="br-role"><b class="'+(who==='A'?'a':'b')+'">'+who+'</b><span>你负责'+(who==='A'?'左':'右')+'移 · <strong>松手减速，同时按住刹车</strong></span></div><button id="br-ready">我准备好了</button><button id="br-lift" class="'+(who==='A'?'a':'b')+'" disabled>'+(who==='A'?'← 按住向左移动':'按住向右移动 →')+'</button><span id="br-partner">同伴尚未准备</span></footer></section>';
 $('back').onclick=function(){if(window._dungeon)dungeonAbort();else{clearTimers();closePeer();location.search='';}};
 $('br-ready').onclick=function(){var s=who==='A'?active:view;if(!s)return;if(who==='A')input({t:'brReady',id:s.id},'A');else send({t:'brReady',id:s.id});};
 var button=$('br-lift');button.onpointerdown=function(e){if(button.disabled)return;e.preventDefault();button.setPointerCapture(e.pointerId);act(true);};button.onpointerup=button.onpointercancel=button.onlostpointercapture=function(){act(false);};
 function down(e){if(![' ','Enter',who==='A'?'ArrowLeft':'ArrowRight'].includes(e.key)||e.repeat||button.disabled)return;e.preventDefault();act(true);}
 function up(e){if([' ','Enter','ArrowLeft','ArrowRight'].includes(e.key))act(false);}
 function blur(){act(false);}
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',blur);
 var heartbeat=setInterval(function(){if(held)act(true);},180),conn=PEER.conn;
 function disconnected(){clean();window._dead=true;if($('msg'))$('msg').textContent='连接断开，行动已停止。请返回后重新建房。';if($('br-lift'))$('br-lift').disabled=true;if($('br-ready'))$('br-ready').disabled=true;}
 if(conn)conn.on('close',disconnected);
 dispose=function(){clearInterval(heartbeat);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',blur);if(conn&&conn.off)conn.off('close',disconnected);};
}
function draw(s,who){if(!$('br-canvas'))return;view=s;$('count').textContent=Math.ceil(s.time)+'s';$('goal').textContent='送达 '+s.got+' / '+s.goal;$('br-misses').textContent='失误 '+s.spills+' / '+s.limit;
 var started=s.ready.A&&s.ready.B,wait=!started||s.cd>0;
 $('br-ready').hidden=started||s.done;$('br-ready').disabled=!!s.ready[who];$('br-ready').textContent=s.ready[who]?'已准备，等待同伴':'我准备好了';$('br-lift').disabled=wait||s.done;
 $('br-lift').classList.toggle('held',!!s.inputs[who]);$('br-partner').textContent=s.done?'本轮结束':!s.ready[who==='A'?'B':'A']?'同伴尚未准备':s.inputs[who==='A'?'B':'A']?'同伴正在移动':'同伴已松手 · 你可以接着移动';
 $('msg').textContent=s.rescue?s.msg+'（'+s.rescue.left.toFixed(1)+'秒）':s.msg;$('msg').classList.toggle('rescue',!!s.rescue);
 $('br-countdown').textContent=!started?'双方准备后开始':s.cd>0?Math.ceil(s.cd):'';$('br-countdown').hidden=!wait||s.done;
 var cv=$('br-canvas'),c=cv.getContext('2d');c.clearRect(0,0,340,400);c.fillStyle='#ffe8ac';c.fillRect(0,0,340,400);
 c.strokeStyle='#eac98c';c.lineWidth=1;for(var y=30;y<350;y+=45){c.beginPath();c.moveTo(18,y);c.lineTo(322,y);c.stroke();}
 c.fillStyle='#b9d49a';c.fillRect(296,45,44,305);c.strokeStyle='#446342';c.lineWidth=2;c.beginPath();c.moveTo(296,45);c.lineTo(296,350);c.stroke();c.fillStyle='#344c35';c.font='bold 13px sans-serif';c.textAlign='right';c.fillText('出口 →',324,375);
 c.fillStyle='#e9a342';c.strokeStyle='#30253a';c.lineWidth=3;c.fillRect(s.px-s.pW/2,329,s.pW,13);c.strokeRect(s.px-s.pW/2,329,s.pW,13);
 [['A',s.px-s.pW/2,'#7bc7df'],['B',s.px+s.pW/2,'#ffb06e']].forEach(function(a){c.fillStyle=a[2];c.beginPath();c.arc(a[1],336,12,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#30253a';c.font='bold 12px sans-serif';c.textAlign='center';c.fillText(a[0],a[1],340);});
 var cargo=s.carrying?{x:s.px,y:315}:s.ball;if(cargo){c.fillStyle='#78bdd0';c.strokeStyle='#30253a';c.lineWidth=2.5;c.beginPath();c.arc(cargo.x,cargo.y,11,0,Math.PI*2);c.fill();c.stroke();}
 c.font='bold 13px sans-serif';c.fillStyle='#745744';c.textAlign='left';c.fillText(s.rescueUsed?'刹车救场：已使用':'刹车救场：可用一次',16,28);
 if(s.done&&!$('br-result')){var r=document.createElement('div');r.id='br-result';r.className='br-result';r.innerHTML='<strong>'+(s.win?'合作成功':'再试一次')+'</strong>'+(window._dungeon?'':'<button id="br-again">再来一局</button>');document.querySelector('.br-controls').appendChild(r);if($('br-again'))$('br-again').onclick=function(){send({t:'brRestart',id:s.id});if(who==='A'&&active)active.againA=true;else $('br-again').disabled=true;};}
}
function host(){clearTimers();clean();S.mod='bridge';window._dead=false;shell('A');var s=make();active=s;var last=performance.now(),next=0,endAt=0;draw(snapshot(s),'A');
 var iv=setInterval(function(){if(active!==s){clearInterval(iv);return;}var now=performance.now(),dt=Math.min(.06,(now-last)/1000);last=now;['A','B'].forEach(function(w){if(now-s.seen[w]>650)s.inputs[w]=false;});step(s,dt);S.time=Math.ceil(s.time);
 if(now>=next){draw(snapshot(s),'A');send({t:'brState',state:snapshot(s)});next=now+66;}
 if(s.done){if(!endAt)endAt=now+1100;if(window._dungeon&&now>=endAt){var win=s.win;clearTimers();dungeonEnd(win);}else if(!window._dungeon&&s.againA&&s.againB)host();}
 },16);timers.push(iv);
}
function guest(){var inDungeon=window._dungeon;clearTimers();clean();S.mod='bridge';window._dead=false;shell('B');
 if(!inDungeon&&PEER.conn&&!PEER.conn._bridgeMobileListener){PEER.conn._bridgeMobileListener=function(d){dgGuestOnData(d);};PEER.conn.on('data',PEER.conn._bridgeMobileListener);}
}
var oldClear=clearTimers;clearTimers=function(){clean();return oldClear();};
var oldHost=startHostGame;startHostGame=function(){if(S.mod==='bridge')return host();return oldHost();};renderBridgeHost=host;runBridgeHost=host;
var oldGuest=renderGuestTwin;renderGuestTwin=function(code,mode){if(mode==='bridge')return guest();return oldGuest(code,mode);};
var oldHD=dgHostOnData;dgHostOnData=function(d){if(d.t==='brReady'||d.t==='brInput'){input(d,'B');return;}if(d.t==='brRestart'){if(active&&active.id===d.id&&active.done)active.againB=true;return;}return oldHD(d);};
var oldGD=dgGuestOnData;dgGuestOnData=function(d){if(d.t==='brState'){if(S.mod!=='bridge'||!$('br-canvas'))return;if(view&&view.id!==d.state.id){guest();}draw(d.state,'B');return;}return oldGD(d);};
window.BridgeMobile={create:make,step:step,state:function(){return active||view;}};
})();
