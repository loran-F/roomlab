/* Mobile beam game: one authoritative simulation for standalone and dungeon. */
(function(){
'use strict';
var cargoTypes=[{name:'标准箱',speed:150,tip:'倾斜送到中央，再放平入库',color:'#d9a45b'},{name:'重箱',speed:90,tip:'需要更大倾角，接近中央提前放平',color:'#8b99aa'},{name:'玻璃箱',speed:145,tip:'轻轻倾斜！倾角过大会震碎',color:'#9edbc9'},{name:'圆筒',speed:230,tip:'滚得快且有惯性，提前反向刹车',color:'#eaa56f'},{name:'重箱',speed:90,tip:'大倾角起步，中央放平',color:'#8b99aa'},{name:'玻璃箱',speed:145,tip:'最后一件，轻放入库',color:'#9edbc9'}];
var active=null,view=null,dispose=null,seq=0,held=false,role='A';
function fishRoom(s){return !!s&&s.roomId==='room-15';}
function roomId(){return window._dungeon&&typeof DUNGEON!=='undefined'&&DUNGEON?DUNGEON.roomId:null;}
function cargoName(spec,s){return fishRoom(s)?({'标准箱':'鲜鱼箱','重箱':'加冰鱼箱','玻璃箱':'活鱼水箱','圆筒':'圆鱼桶'}[spec.name]||spec.name):spec.name;}
function themeText(txt,s){if(!fishRoom(s))return txt;return String(txt).replace(/标准箱/g,'鲜鱼箱').replace(/重箱/g,'加冰鱼箱').replace(/玻璃箱/g,'活鱼水箱').replace(/圆筒/g,'圆鱼桶').replace(/砖块/g,'鱼货').replace(/货物/g,'鱼货').replace(/六件不同货物/g,'六箱鱼货');}
function fish(c,x,y,size){c.save();c.translate(x,y);c.scale(size,size);c.fillStyle='#78b1b9';c.strokeStyle='#28494d';c.lineWidth=1.5;c.beginPath();c.ellipse(0,0,9,4,0,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.moveTo(-8,0);c.lineTo(-14,-5);c.lineTo(-14,5);c.closePath();c.fill();c.stroke();c.fillStyle='#28494d';c.beginPath();c.arc(5,-1,1,0,Math.PI*2);c.fill();c.restore();}
function fishBackdrop(c){c.fillStyle='#d8eeeb';c.fillRect(0,0,340,400);c.strokeStyle='#bad8d4';c.lineWidth=1;for(var y=75;y<350;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(340,y);c.stroke();}for(var x=0;x<340;x+=34){c.beginPath();c.moveTo(x,75);c.lineTo(x,350);c.stroke();}c.fillStyle='#518b8c';c.fillRect(0,0,340,59);c.fillStyle='#f0c889';for(var x=0;x<340;x+=48)c.fillRect(x,0,24,10);c.fillStyle='#b7d4d0';c.fillRect(0,350,340,50);}
function send(d){netSend(d);}
function clean(){if(dispose){dispose();dispose=null;}active=null;view=null;held=false;}
function make(){var variation=RoomVariation.start('beam');return {tier:variation.tier,cargo:variation.cargo,roomId:roomId(),id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),time:window._dungeon?coopTime(65):65,ready:{A:false,B:false},cd:3,inputs:{A:false,B:false},seen:{A:0,B:0},seq:{A:-1,B:-1},yL:285,yR:285,bricks:[],spawn:1.2,got:0,goal:6,spills:0,limit:3,rescue:null,rescueUsed:false,done:false,win:false,msg:'六件不同货物：倾斜运到中央，放平保持半秒入库。'};}
function snapshot(s){return {tier:s.tier,cargo:s.cargo,roomId:s.roomId,id:s.id,time:s.time,ready:s.ready,cd:s.cd,inputs:s.inputs,yL:s.yL,yR:s.yR,bricks:s.bricks,got:s.got,goal:s.goal,spills:s.spills,limit:s.limit,rescue:s.rescue,rescueUsed:s.rescueUsed,done:s.done,win:s.win,msg:s.msg};}
function input(d,who){var s=active;if(!s||d.id!==s.id||s.done)return;if(d.t==='bmReady'){s.ready[who]=true;return;}if(!Number.isInteger(d.seq)||d.seq<=s.seq[who])return;s.seq[who]=d.seq;s.inputs[who]=!!d.v;s.seen[who]=performance.now();}
function act(v){held=!!v;var s=role==='A'?active:view;if(!s)return;var d={t:'bmInput',id:s.id,seq:++seq,v:held};if(role==='A')input(d,'A');else send(d);}
function end(s,win,message){s.done=true;s.win=win;s.msg=message;s.inputs={A:false,B:false};}
function step(s,dt){
 if(s.done||!s.ready.A||!s.ready.B)return;
 if(s.cd>0){s.cd=Math.max(0,s.cd-dt);return;}
 s.time=Math.max(0,s.time-dt);if(s.time===0){end(s,false,'时间到，和同伴再配合一次。');return;}
 if(s.rescue){s.rescue.left-=dt;s.rescue.held=s.inputs.A&&s.inputs.B?s.rescue.held+dt:0;if(s.rescue.held>=.5){var b=s.bricks.find(function(b){return b.id===s.rescue.brick;});if(b)b.x=b.x<170?65:275;s.yL=s.yR=285;s.rescue=null;s.msg='扶稳了！继续把砖块送到中央。';}else if(s.rescue.left<=0){s.bricks=s.bricks.filter(function(b){return b.id!==s.rescue.brick;});s.rescue=null;s.spills++;s.msg='没有扶住，失误 '+s.spills+' / '+s.limit;}return;}
 s.yL=Math.max(205,Math.min(325,s.yL+(s.inputs.A?-65:32)*dt));s.yR=Math.max(205,Math.min(325,s.yR+(s.inputs.B?-65:32)*dt));
 s.spawn-=dt;if(s.spawn<=0&&s.bricks.length===0){var item=s.cargo[s.got],spec=cargoTypes[item.type];s.bricks.push({id:Math.random().toString(36),type:item.type,x:item.x,y:65,on:false,vy:100,vx:0,charge:0,stress:0});s.spawn=.7;s.msg=spec.name+'：'+spec.tip;}
 for(var i=s.bricks.length-1;i>=0;i--){var b=s.bricks[i],line=s.yL+(s.yR-s.yL)*(b.x-40)/260;
  if(!b.on){b.y+=b.vy*dt;if(b.y>=line){b.on=true;b.y=line;}}
  else{var spec=cargoTypes[b.type],tilt=s.yR-s.yL;
   b.stress=spec.name==='玻璃箱'&&Math.abs(tilt)>65?b.stress+dt:Math.max(0,b.stress-dt*2);
   if(b.stress>=.9){s.bricks.splice(i,1);s.spills++;s.msg='玻璃箱震碎了！下一件小幅抬梁，避免长时间大倾角。';if(s.spills>=s.limit)end(s,false,'货物损坏次数用完了。');return;}
   var speed=tilt/260*spec.speed;b.vx+=(speed-b.vx)*Math.min(1,dt*(spec.name==='圆筒'?2.5:12));b.x+=b.vx*dt;b.y=s.yL+(s.yR-s.yL)*(b.x-40)/260;
   b.charge=Math.abs(b.x-170)<=23&&Math.abs(tilt)<=22?b.charge+dt:0;
   if(b.charge>=.5){s.bricks.splice(i,1);s.got++;s.spawn=.7;s.msg='已入库 '+s.got+' / '+s.goal;if(s.got>=s.goal){end(s,true,'六件货物安全入库！');return;}}
   else if(b.x<30||b.x>310){if(!s.rescueUsed){s.rescueUsed=true;s.rescue={brick:b.id,left:2.5,held:0};s.msg='快掉了！双方按住抬梁 0.5 秒，扶住货物。';return;}s.bricks.splice(i,1);s.spills++;s.msg='砖块滑落，失误 '+s.spills+' / '+s.limit;}
  }
 }
 if(s.spills>=s.limit)end(s,false,'滑落次数用完了，试着小幅抬梁。');
}
function shell(who){
 role=who;seq=0;clearNetZones();window._inL=window._inR=false;window._lastMsg=null;
 $('app').innerHTML='<section class="beam-mobile"><header class="bm-top"><button id="back" aria-label="返回">‹</button><strong>破障搬运</strong><span id="count">--s</span></header><div class="bm-status"><span id="goal">入库 0 / 6</span><span id="bm-misses">失误 0 / 3</span></div><div class="bm-arena"><canvas id="bm-canvas" width="340" height="400"></canvas><div id="bm-countdown" aria-live="polite"></div></div><div id="msg" class="bm-message" role="status">等待同伴连接…</div><footer class="bm-controls"><div class="bm-role"><b class="'+(who==='A'?'bm-role-a':'bm-role-b')+'">'+who+'</b><span>你负责'+(who==='A'?'左':'右')+'端 · <strong>按住抬高，松手下降</strong></span></div><button id="bm-ready">我准备好了</button><button id="bm-lift" class="'+(who==='A'?'bm-role-a':'bm-role-b')+'" disabled>↑ 按住抬高'+(who==='A'?'左':'右')+'端</button><span id="bm-partner">同伴尚未准备</span></footer></section>';
 $('back').onclick=function(){if(window._dungeon)dungeonAbort();else{clearTimers();closePeer();location.search='';}};
 $('bm-ready').onclick=function(){var s=who==='A'?active:view;if(!s)return;if(who==='A')input({t:'bmReady',id:s.id},'A');else send({t:'bmReady',id:s.id});};
 var button=$('bm-lift');button.onpointerdown=function(e){if(button.disabled)return;e.preventDefault();button.setPointerCapture(e.pointerId);act(true);};button.onpointerup=button.onpointercancel=button.onlostpointercapture=function(){act(false);};
 function down(e){if(![' ','Enter',who==='A'?'ArrowLeft':'ArrowRight'].includes(e.key)||e.repeat||button.disabled)return;e.preventDefault();act(true);}
 function up(e){if([' ','Enter','ArrowLeft','ArrowRight'].includes(e.key))act(false);}
 function blur(){act(false);}
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',blur);
 var heartbeat=setInterval(function(){if(held)act(true);},180),conn=PEER.conn;
 function disconnected(){clean();window._dead=true;if($('msg'))$('msg').textContent='连接断开，行动已停止。请返回后重新建房。';if($('bm-lift')){$('bm-lift').disabled=true;$('bm-lift').classList.remove('held');$('bm-lift').setAttribute('aria-pressed','false');}if($('bm-ready'))$('bm-ready').disabled=true;}
 if(conn)conn.on('close',disconnected);
 dispose=function(){clearInterval(heartbeat);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',blur);if(conn&&conn.off)conn.off('close',disconnected);};
}
function draw(s,who){if(!$('bm-canvas'))return;view=s;var themed=fishRoom(s),shell=document.querySelector('.beam-mobile');shell.classList.toggle('bm-fish',themed);shell.dataset.roomTheme=themed?'room-15':'';shell.querySelector('.bm-top strong').textContent=themed?'鱼箱入库':'破障搬运';$('count').textContent=Math.ceil(s.time)+'s';$('goal').textContent='入库 '+s.got+' / '+s.goal;$('bm-misses').textContent='失误 '+s.spills+' / '+s.limit;
 var started=s.ready.A&&s.ready.B,wait=!started||s.cd>0;
 $('bm-ready').hidden=started||s.done;$('bm-ready').disabled=!!s.ready[who];$('bm-ready').textContent=s.ready[who]?'已准备，等待同伴':'我准备好了';$('bm-lift').disabled=wait||s.done;
 $('bm-lift').classList.toggle('held',!!s.inputs[who]);$('bm-lift').setAttribute('aria-pressed',String(!!s.inputs[who]));$('bm-partner').textContent=s.done?'本轮结束':!s.ready[who==='A'?'B':'A']?'同伴尚未准备':s.inputs[who==='A'?'B':'A']?'同伴正在抬高另一端':'同伴已松手，另一端缓慢下降';
 var current=s.bricks[0];$('msg').textContent=s.rescue?s.msg+'（'+s.rescue.left.toFixed(1)+'秒）':current&&current.stress>.15?'倾斜太大！马上放平，玻璃正在开裂！':current&&current.on&&Math.abs(current.x-170)<=23?'货物到中央：放平梁，保持 0.5 秒入库。':s.msg;$('msg').textContent=themeText($('msg').textContent,s);$('msg').classList.toggle('rescue',!!s.rescue);
 $('bm-countdown').textContent=!started?'双方准备后开始':s.cd>0?Math.ceil(s.cd):'';$('bm-countdown').hidden=!wait||s.done;
 var cv=$('bm-canvas'),c=cv.getContext('2d');c.clearRect(0,0,340,400);c.fillStyle='#ffe8ac';c.fillRect(0,0,340,400);
 c.strokeStyle='#eac98c';c.lineWidth=1;for(var y=30;y<350;y+=45){c.beginPath();c.moveTo(18,y);c.lineTo(322,y);c.stroke();}
 if(themed)fishBackdrop(c);
 c.strokeStyle='#a9844e';c.setLineDash([4,5]);c.beginPath();c.moveTo(170,(s.yL+s.yR)/2+10);c.lineTo(170,360);c.stroke();c.setLineDash([]);
 c.fillStyle='#e9a342';c.strokeStyle='#30253a';c.lineWidth=3;c.fillRect(144,352,52,20);c.strokeRect(144,352,52,20);c.fillStyle='#54383b';c.font='bold 13px sans-serif';c.textAlign='center';c.fillText(themed?'冷库入口':'收集口',170,392);
 c.strokeStyle='#30253a';c.lineWidth=12;c.lineCap='round';c.beginPath();c.moveTo(40,s.yL);c.lineTo(300,s.yR);c.stroke();c.strokeStyle='#e9a342';c.lineWidth=7;c.stroke();
 [['A',40,s.yL,'#63b5d2'],['B',300,s.yR,'#f49c59']].forEach(function(a){c.fillStyle=a[3];c.strokeStyle='#30253a';c.lineWidth=2;c.beginPath();c.arc(a[1],a[2],14,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#30253a';c.font='bold 15px sans-serif';c.fillText(a[0],a[1],a[2]+5);});
 s.bricks.forEach(function(b){var spec=cargoTypes[b.type];c.fillStyle=themed?(spec.name==='玻璃箱'?'#b9e6dc':spec.name==='重箱'?'#b2c5ce':'#f1cc87'):spec.color;c.strokeStyle='#30253a';c.lineWidth=2;if(spec.name==='圆筒'){c.beginPath();c.arc(b.x,b.y-12,13,0,Math.PI*2);c.fill();c.stroke();}else{c.fillRect(b.x-15,b.y-24,30,24);c.strokeRect(b.x-15,b.y-24,30,24);}if(themed){fish(c,b.x+2,b.y-12,.8);if(spec.name==='重箱'){c.fillStyle='#fff';c.fillRect(b.x-11,b.y-21,5,4);c.fillRect(b.x+5,b.y-8,5,4);}if(spec.name==='玻璃箱'){c.strokeStyle='#fff';c.beginPath();c.moveTo(b.x-10,b.y-20);c.lineTo(b.x-10,b.y-5);c.stroke();}}else{c.fillStyle='#30253a';c.font='bold 11px sans-serif';c.textAlign='center';c.fillText(spec.name==='重箱'?'重':spec.name==='玻璃箱'?'◇':'↓',b.x,b.y-7);}c.fillStyle=themed?'#fff5d7':'#30253a';c.textAlign='center';c.font='bold 14px sans-serif';c.fillText('第 '+(s.got+1)+' 件 · '+cargoName(spec,s),170,29);c.font='12px sans-serif';c.fillText(spec.tip,170,48);if(b.charge>0){c.fillStyle='#408967';c.fillRect(145,375,50*b.charge/.5,5);}});
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
