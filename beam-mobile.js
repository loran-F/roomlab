/* Mobile beam game: one authoritative simulation for standalone and dungeon. */
(function(){
'use strict';
var active=null,view=null,dispose=null,seq=0,held=false,role='A';
function send(d){netSend(d);}
function clean(){if(dispose){dispose();dispose=null;}active=null;view=null;held=false;}
function make(){return {id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),time:window._dungeon?coopTime(90):90,ready:{A:false,B:false},cd:3,inputs:{A:false,B:false},seen:{A:0,B:0},seq:{A:-1,B:-1},yL:285,yR:285,bricks:[],spawn:1.2,got:0,goal:12,spills:0,limit:5,rescue:null,rescueUsed:false,done:false,win:false,msg:'按住抬高，松手下降。让砖块沿斜梁滚向中央。'};}
function snapshot(s){return {id:s.id,time:s.time,ready:s.ready,cd:s.cd,inputs:s.inputs,yL:s.yL,yR:s.yR,bricks:s.bricks,got:s.got,goal:s.goal,spills:s.spills,limit:s.limit,rescue:s.rescue,rescueUsed:s.rescueUsed,done:s.done,win:s.win,msg:s.msg};}
function input(d,who){var s=active;if(!s||d.id!==s.id||s.done)return;if(d.t==='bmReady'){s.ready[who]=true;return;}if(!Number.isInteger(d.seq)||d.seq<=s.seq[who])return;s.seq[who]=d.seq;s.inputs[who]=!!d.v;s.seen[who]=performance.now();}
function act(v){held=!!v;var s=role==='A'?active:view;if(!s)return;var d={t:'bmInput',id:s.id,seq:++seq,v:held};if(role==='A')input(d,'A');else send(d);}
function end(s,win,message){s.done=true;s.win=win;s.msg=message;s.inputs={A:false,B:false};}
function step(s,dt){
 if(s.done||!s.ready.A||!s.ready.B)return;
 if(s.cd>0){s.cd=Math.max(0,s.cd-dt);return;}
 s.time=Math.max(0,s.time-dt);if(s.time===0){end(s,false,'时间到，和同伴再配合一次。');return;}
 if(s.rescue){s.rescue.left-=dt;s.rescue.held=s.inputs.A&&s.inputs.B?s.rescue.held+dt:0;if(s.rescue.held>=.5){var b=s.bricks.find(function(b){return b.id===s.rescue.brick;});if(b)b.x=b.x<170?65:275;s.yL=s.yR=285;s.rescue=null;s.msg='扶稳了！继续把砖块送到中央。';}else if(s.rescue.left<=0){s.bricks=s.bricks.filter(function(b){return b.id!==s.rescue.brick;});s.rescue=null;s.spills++;s.msg='没有扶住，失误 '+s.spills+' / '+s.limit;}return;}
 s.yL=Math.max(205,Math.min(325,s.yL+(s.inputs.A?-65:32)*dt));s.yR=Math.max(205,Math.min(325,s.yR+(s.inputs.B?-65:32)*dt));
 s.spawn-=dt;if(s.spawn<=0&&s.bricks.length<3){s.bricks.push({id:Math.random().toString(36),x:65+Math.random()*210,y:12,on:false,vy:62+Math.min(s.got,12)});s.spawn=1.65;}
 for(var i=s.bricks.length-1;i>=0;i--){var b=s.bricks[i],line=s.yL+(s.yR-s.yL)*(b.x-40)/260;
  if(!b.on){b.y+=b.vy*dt;if(b.y>=line){b.on=true;b.y=line;}}
  else{b.x+=(s.yR-s.yL)/260*155*dt;b.y=s.yL+(s.yR-s.yL)*(b.x-40)/260;if(Math.abs(b.x-170)<=23){s.bricks.splice(i,1);s.got++;s.msg='已收集 '+s.got+' / '+s.goal;if(s.got>=s.goal){end(s,true,'配合成功！砖块已全部收集。');return;}}
   else if(b.x<30||b.x>310){if(!s.rescueUsed){s.rescueUsed=true;s.rescue={brick:b.id,left:2.5,held:0};s.msg='快掉了！双方按住抬梁 0.5 秒，扶住货物。';return;}s.bricks.splice(i,1);s.spills++;s.msg='砖块滑落，失误 '+s.spills+' / '+s.limit;}
  }
 }
 if(s.spills>=s.limit)end(s,false,'滑落次数用完了，试着小幅抬梁。');
}
function shell(who){
 role=who;seq=0;clearNetZones();window._inL=window._inR=false;window._lastMsg=null;
 $('app').innerHTML='<section class="beam-mobile"><header class="bm-top"><button id="back" aria-label="返回">‹</button><strong>破障搬运</strong><span id="count">--s</span></header><div class="bm-status"><span id="goal">收集 0 / 12</span><span id="bm-misses">失误 0 / 5</span></div><div class="bm-arena"><canvas id="bm-canvas" width="340" height="400"></canvas><div id="bm-countdown" aria-live="polite"></div></div><div id="msg" class="bm-message" role="status">等待同伴连接…</div><footer class="bm-controls"><div class="bm-role"><b class="'+(who==='A'?'a':'b')+'">'+who+'</b><span>你负责'+(who==='A'?'左':'右')+'端 · <strong>按住抬高，松手下降</strong></span></div><button id="bm-ready">我准备好了</button><button id="bm-lift" class="'+(who==='A'?'a':'b')+'" disabled>↑ 按住抬高'+(who==='A'?'左':'右')+'端</button><span id="bm-partner">同伴尚未准备</span></footer></section>';
 $('back').onclick=function(){if(window._dungeon)dungeonAbort();else{clearTimers();closePeer();location.search='';}};
 $('bm-ready').onclick=function(){var s=who==='A'?active:view;if(!s)return;if(who==='A')input({t:'bmReady',id:s.id},'A');else send({t:'bmReady',id:s.id});};
 var button=$('bm-lift');button.onpointerdown=function(e){if(button.disabled)return;e.preventDefault();button.setPointerCapture(e.pointerId);act(true);};button.onpointerup=button.onpointercancel=button.onlostpointercapture=function(){act(false);};
 function down(e){if(![' ','Enter',who==='A'?'ArrowLeft':'ArrowRight'].includes(e.key)||e.repeat||button.disabled)return;e.preventDefault();act(true);}
 function up(e){if([' ','Enter','ArrowLeft','ArrowRight'].includes(e.key))act(false);}
 function blur(){act(false);}
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',blur);
 var heartbeat=setInterval(function(){if(held)act(true);},180),conn=PEER.conn;
 function disconnected(){clean();window._dead=true;if($('msg'))$('msg').textContent='连接断开，行动已停止。请返回后重新建房。';if($('bm-lift'))$('bm-lift').disabled=true;if($('bm-ready'))$('bm-ready').disabled=true;}
 if(conn)conn.on('close',disconnected);
 dispose=function(){clearInterval(heartbeat);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',blur);if(conn&&conn.off)conn.off('close',disconnected);};
}
function draw(s,who){if(!$('bm-canvas'))return;view=s;$('count').textContent=Math.ceil(s.time)+'s';$('goal').textContent='收集 '+s.got+' / '+s.goal;$('bm-misses').textContent='失误 '+s.spills+' / '+s.limit;
 var started=s.ready.A&&s.ready.B,wait=!started||s.cd>0;
 $('bm-ready').hidden=started||s.done;$('bm-ready').disabled=!!s.ready[who];$('bm-ready').textContent=s.ready[who]?'已准备，等待同伴':'我准备好了';$('bm-lift').disabled=wait||s.done;
 $('bm-lift').classList.toggle('held',!!s.inputs[who]);$('bm-partner').textContent=s.done?'本轮结束':!s.ready[who==='A'?'B':'A']?'同伴尚未准备':s.inputs[who==='A'?'B':'A']?'同伴正在抬高另一端':'同伴已松手，另一端缓慢下降';
 $('msg').textContent=s.rescue?s.msg+'（'+s.rescue.left.toFixed(1)+'秒）':s.msg;$('msg').classList.toggle('rescue',!!s.rescue);
 $('bm-countdown').textContent=!started?'双方准备后开始':s.cd>0?Math.ceil(s.cd):'';$('bm-countdown').hidden=!wait||s.done;
 var cv=$('bm-canvas'),c=cv.getContext('2d');c.clearRect(0,0,340,400);c.fillStyle='#ffe8ac';c.fillRect(0,0,340,400);
 c.strokeStyle='#eac98c';c.lineWidth=1;for(var y=30;y<350;y+=45){c.beginPath();c.moveTo(18,y);c.lineTo(322,y);c.stroke();}
 c.strokeStyle='#a9844e';c.setLineDash([4,5]);c.beginPath();c.moveTo(170,(s.yL+s.yR)/2+10);c.lineTo(170,360);c.stroke();c.setLineDash([]);
 c.fillStyle='#e9a342';c.strokeStyle='#30253a';c.lineWidth=3;c.fillRect(144,352,52,20);c.strokeRect(144,352,52,20);c.fillStyle='#54383b';c.font='bold 13px sans-serif';c.textAlign='center';c.fillText('收集口',170,392);
 c.strokeStyle='#30253a';c.lineWidth=12;c.lineCap='round';c.beginPath();c.moveTo(40,s.yL);c.lineTo(300,s.yR);c.stroke();c.strokeStyle='#e9a342';c.lineWidth=7;c.stroke();
 [['A',40,s.yL,'#63b5d2'],['B',300,s.yR,'#f49c59']].forEach(function(a){c.fillStyle=a[3];c.strokeStyle='#30253a';c.lineWidth=2;c.beginPath();c.arc(a[1],a[2],14,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#30253a';c.font='bold 15px sans-serif';c.fillText(a[0],a[1],a[2]+5);});
 s.bricks.forEach(function(b){c.fillStyle=b.on?'#ed9650':'#bf7962';c.strokeStyle='#30253a';c.lineWidth=2;c.fillRect(b.x-11,b.y-12,22,12);c.strokeRect(b.x-11,b.y-12,22,12);});
 if(s.done&&!$('bm-result')){var r=document.createElement('div');r.id='bm-result';r.className='bm-result';r.innerHTML='<strong>'+(s.win?'合作成功':'再试一次')+'</strong>'+(window._dungeon?'':'<button id="bm-again">再来一局</button>');document.querySelector('.bm-controls').appendChild(r);if($('bm-again'))$('bm-again').onclick=function(){send({t:'bmRestart',id:s.id});if(who==='A'&&active)active.againA=true;else $('bm-again').disabled=true;};}
}
function host(){clearTimers();clean();S.mod='beam';window._dead=false;shell('A');var s=make();active=s;var last=performance.now(),next=0,endAt=0;draw(snapshot(s),'A');
 var iv=setInterval(function(){if(active!==s){clearInterval(iv);return;}var now=performance.now(),dt=Math.min(.06,(now-last)/1000);last=now;['A','B'].forEach(function(w){if(now-s.seen[w]>650)s.inputs[w]=false;});step(s,dt);S.time=Math.ceil(s.time);
 if(now>=next){draw(snapshot(s),'A');send({t:'bmState',state:snapshot(s)});next=now+66;}
 if(s.done){if(!endAt)endAt=now+1100;if(window._dungeon&&now>=endAt){var win=s.win;clearTimers();dungeonEnd(win);}else if(!window._dungeon&&s.againA&&s.againB)host();}
 },16);timers.push(iv);
}
function guest(){var inDungeon=window._dungeon;clearTimers();clean();S.mod='beam';window._dead=false;shell('B');
 if(!inDungeon&&PEER.conn&&!PEER.conn._beamListener){PEER.conn._beamListener=function(d){dgGuestOnData(d);};PEER.conn.on('data',PEER.conn._beamListener);}
}
var oldClear=clearTimers;clearTimers=function(){clean();return oldClear();};
var oldHost=startHostGame;startHostGame=function(){if(S.mod==='beam')return host();return oldHost();};renderBeamHost=host;runBeamHost=host;
var oldGuest=renderGuestTwin;renderGuestTwin=function(code,mode){if(mode==='beam')return guest();return oldGuest(code,mode);};
var oldHD=dgHostOnData;dgHostOnData=function(d){if(d.t==='bmReady'||d.t==='bmInput'){input(d,'B');return;}if(d.t==='bmRestart'){if(active&&active.id===d.id&&active.done)active.againB=true;return;}return oldHD(d);};
var oldGD=dgGuestOnData;dgGuestOnData=function(d){if(d.t==='bmState'){if(S.mod!=='beam'||!$('bm-canvas'))return;if(view&&view.id!==d.state.id){guest();}draw(d.state,'B');return;}return oldGD(d);};
window.BeamMobile={create:make,step:step,state:function(){return active||view;}};
})();
