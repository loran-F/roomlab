/* Mobile beam game: one authoritative simulation for standalone and dungeon. */
(function(){
'use strict';
var cargoTypes=[{name:'标准箱',speed:150,tip:'倾斜送到中央，再放平入库',color:'#d9a45b'},{name:'重箱',speed:90,tip:'需要更大倾角，接近中央提前放平',color:'#8b99aa'},{name:'玻璃箱',speed:145,tip:'轻轻倾斜！倾角过大会震碎',color:'#9edbc9'},{name:'圆筒',speed:230,tip:'滚得快且有惯性，提前反向刹车',color:'#eaa56f'},{name:'重箱',speed:90,tip:'大倾角起步，中央放平',color:'#8b99aa'},{name:'玻璃箱',speed:145,tip:'最后一件，轻放入库',color:'#9edbc9'}];
var directCtx=null;
function beamSession(){var m=window.RoomSession&&RoomSession.current();return m&&m.mode==='beam'?m:null;}
var active=null,view=null,dispose=null,seq=0,held=false,role='A',resultConnection=null;var retiredRuns=new Set();
function fishRoom(s){return !!s&&s.roomId==='room-15';}
function roomId(){var m=beamSession();if(m)return m.roomId;return window._dungeon&&typeof DUNGEON!=='undefined'&&DUNGEON?DUNGEON.roomId:null;}
function cargoName(spec,s){return fishRoom(s)?({'标准箱':'鲜鱼箱','重箱':'加冰鱼箱','玻璃箱':'活鱼水箱','圆筒':'圆鱼桶'}[spec.name]||spec.name):spec.name;}
function themeText(txt,s){if(!fishRoom(s))return txt;return String(txt).replace(/标准箱/g,'鲜鱼箱').replace(/重箱/g,'加冰鱼箱').replace(/玻璃箱/g,'活鱼水箱').replace(/圆筒/g,'圆鱼桶').replace(/砖块/g,'鱼货').replace(/货物/g,'鱼货').replace(/六件不同货物/g,'六箱鱼货');}
function fish(c,x,y,size){c.save();c.translate(x,y);c.scale(size,size);c.fillStyle='#78b1b9';c.strokeStyle='#28494d';c.lineWidth=1.5;c.beginPath();c.ellipse(0,0,9,4,0,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.moveTo(-8,0);c.lineTo(-14,-5);c.lineTo(-14,5);c.closePath();c.fill();c.stroke();c.fillStyle='#28494d';c.beginPath();c.arc(5,-1,1,0,Math.PI*2);c.fill();c.restore();}
function fishBackdrop(c){c.fillStyle='#d8eeeb';c.fillRect(0,0,340,400);c.strokeStyle='#bad8d4';c.lineWidth=1;for(var y=75;y<350;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(340,y);c.stroke();}for(var x=0;x<340;x+=34){c.beginPath();c.moveTo(x,75);c.lineTo(x,350);c.stroke();}c.fillStyle='#518b8c';c.fillRect(0,0,340,59);c.fillStyle='#f0c889';for(var x=0;x<340;x+=48)c.fillRect(x,0,24,10);c.fillStyle='#b7d4d0';c.fillRect(0,350,340,50);}
function send(d){netSend(d);}
function clean(){if(dispose){dispose();dispose=null;}active=null;view=null;held=false;directCtx=null;}
// Fixed-step authority: the network/render loops never advance their own cargo.
var beamLevels=[null,
 {maxActive:1,interval:.85,fallSpeed:55,gravity:110,goal:6,time:65},
 {maxActive:3,interval:2.1,fallSpeed:75,gravity:145,goal:8,time:59},
 {maxActive:4,interval:1.65,fallSpeed:95,gravity:180,goal:10,time:52},
 {maxActive:5,interval:1.25,fallSpeed:115,gravity:215,goal:12,time:46},
 {maxActive:6,interval:1.08,fallSpeed:130,gravity:240,goal:14,time:52}];
var cargoPhysics=[{mass:1,drive:1750,drag:8,bounce:.13,tolerance:100},
 {mass:2.5,drive:1100,drag:9,bounce:.05,tolerance:110},
 {mass:.8,drive:1650,drag:8,bounce:.09,tolerance:65},
 {mass:1.2,drive:650,drag:2.8,bounce:.22,tolerance:110}];
function cargoPlan(tier,seed,count){var value=seed>>>0,bag=[],list=[];
 function random(){value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;}
 var firstLeft=random()<.5;
 for(var i=0;i<count;i++){var wave=Math.floor(i/3);if(i%3===0)bag=[0,0,1+wave%3];
  var type=tier===1?[0,0,1,2,0,3,0,1][i]:bag.splice(Math.floor(random()*bag.length),1)[0];
  var left=tier===1?i%2===0:(Math.floor(i/beamLevels[tier].maxActive)%2===0)===firstLeft;
  list.push({type:type,x:left?95+random()*30:215+random()*30});
 }return list;
}
function make(){var variation=RoomVariation.start('beam',beamSession()||directCtx),tier=Math.max(1,Math.min(5,variation.tier||1)),config=Object.assign({},beamLevels[tier]);
 return {tier:tier,config:config,cargo:cargoPlan(tier,tier===1?1:variation.seed,config.goal+2),roomId:roomId(),id:beamSession()?.runId||directCtx?.runId||directCtx?.sessionId||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),time:config.time,elapsed:0,ready:{A:false,B:false},cd:3,inputs:{A:false,B:false},seen:{A:0,B:0},seq:{A:-1,B:-1},yL:285,yR:285,vyL:0,vyR:0,bricks:[],spawn:.8,spawned:0,got:0,goal:config.goal,spills:0,limit:3,rescue:null,rescueUsed:false,done:false,win:false,msg:tier===1?'先练单件：倾斜送到中央，放平半秒入库。':'连续来货！中央放平入库，兼顾两边的货物。'};
}
function snapshot(s){return {tier:s.tier,config:s.config,cargo:s.cargo,roomId:s.roomId,id:s.id,time:s.time,elapsed:s.elapsed,reasonCode:s.reasonCode,ready:s.ready,cd:s.cd,inputs:s.inputs,yL:s.yL,yR:s.yR,vyL:s.vyL,vyR:s.vyR,bricks:s.bricks,spawn:s.spawn,spawned:s.spawned,got:s.got,goal:s.goal,spills:s.spills,limit:s.limit,rescue:s.rescue,rescueUsed:s.rescueUsed,done:s.done,win:s.win,msg:s.msg};}
function input(d,who){var s=active;if(!s||d.id!==s.id||s.done||(directCtx&&!directCtx.isActive()))return;if(d.t==='bmReady'){s.ready[who]=true;return;}if(!Number.isInteger(d.seq)||d.seq<=s.seq[who])return;s.seq[who]=d.seq;s.inputs[who]=!!d.v;s.seen[who]=performance.now();}
function act(v){held=!!v;var s=role==='A'?active:view;if(!s)return;var d={t:'bmInput',id:s.id,seq:++seq,v:held};if(role==='A')input(d,'A');else send(d);}
function end(s,win,message,reasonCode){if(s.done)return;s.done=true;s.win=win;s.reasonCode=reasonCode||(win?'objective_complete':'attempts_exhausted');s.msg=message;s.inputs={A:false,B:false};}
function beamLine(s,x){return s.yL+(s.yR-s.yL)*(x-40)/260;}
function resolveCargo(s,b,collected){if(b.resolved||s.done)return;b.resolved=true;if(collected){s.got++;s.msg='已入库 '+s.got+' / '+s.goal;if(s.got>=s.goal)end(s,true,'货物全部安全入库！');}else{s.spills++;s.msg='货物损坏 '+s.spills+' / '+s.limit;if(s.spills>=s.limit)end(s,false,'损坏次数用尽，下一次提前刹车。');}if(s.tier===1)s.spawn=s.config.interval;}
function dropCargo(s,b,broken){b.phase='falling';b.on=false;b.vy=Math.max(65,b.vy);b.broken=!!broken;b.charge=0;}
function contactBeam(s,b){if(b.phase==='falling'||b.phase==='rescue'||b.phase==='recover'||b.x<30||b.x>310)return;
 var line=beamLine(s,b.x),beamV=s.vyL+(s.vyR-s.vyL)*(b.x-40)/260;
 if(b.y>=line-.001){var impact=b.vy-beamV;if(impact< -5){b.y=Math.min(b.y,line);return;}b.y=line;b.on=true;b.phase='on';
  if(impact>65){b.impact=Math.min(1,impact/230);b.vy=beamV-impact*cargoPhysics[b.type].bounce;b.on=false;b.phase='air';}
  else b.vy=beamV;
 }
}
function physicsTick(s,dt){
 ['L','R'].forEach(function(side){var who=side==='L'?'A':'B',v='vy'+side,y='y'+side,target=s.inputs[who]?-65:32;s[v]+=(target-s[v])*(1-Math.exp(-7*dt));s[y]+=s[v]*dt;if(s[y]<205||s[y]>325){s[y]=Math.max(205,Math.min(325,s[y]));s[v]=0;}});
 if(s.rescue){var r=s.rescue,b=s.bricks.find(function(b){return b.id===r.brick;});r.left-=dt;r.held=s.inputs.A&&s.inputs.B?r.held+dt:0;
  if(!b||b.resolved)s.rescue=null;
  else if(r.held>=.5){b.phase='recover';b.recovery=0;b.recoverX=b.x;b.recoverY=b.y;b.vx=b.vy=0;s.rescue=null;s.msg='接住了！其他货物仍在继续。';}
  else if(r.left<=0){dropCargo(s,b,false);s.rescue=null;s.msg='没扶住，注意其他货物。';}
 }
 // Tier 1 starts its delay on resolution; later tiers never consult score/empty state.
 if(s.tier!==1||s.bricks.length===0)s.spawn=Math.max(0,s.spawn-dt);
 if(s.spawn<=0&&s.spawned<s.cargo.length&&s.bricks.length<s.config.maxActive){var item=s.cargo[s.spawned++];s.bricks.push({id:s.id+':'+s.spawned,type:item.type,x:item.x,y:48,on:false,phase:'air',vy:s.config.fallSpeed,vx:0,charge:0,stress:0,impact:0,rotation:0,resolved:false});s.spawn=s.config.interval;}
 var tilt=s.yR-s.yL;
 s.bricks.forEach(function(b){if(b.resolved)return;b.impact=Math.max(0,(b.impact||0)-dt*5);
  if(b.phase==='rescue')return;
  if(b.phase==='recover'){b.recovery=Math.min(1,b.recovery+dt/0.45);var ease=b.recovery*b.recovery*(3-2*b.recovery),target=b.recoverX<170?62:278;b.x=b.recoverX+(target-b.recoverX)*ease;b.y=b.recoverY+(beamLine(s,target)-35-b.recoverY)*ease;if(b.recovery===1){b.phase='air';b.vy=0;}return;}
  if(b.phase==='falling'){b.vy+=s.config.gravity*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.rotation+=(b.vx<0?-1:1)*dt*3;if(b.y>430)resolveCargo(s,b,false);return;}
  var p=cargoPhysics[b.type],supported=b.on;
  if(b.on){b.vx+=(tilt/260*p.drive-b.vx*p.drag)*dt;b.vy=s.vyL+(s.vyR-s.vyL)*(b.x-40)/260;}
  else b.vy+=s.config.gravity*dt;
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.rotation+=b.type===3?b.vx*dt/14:0;
  b.on=false;b.phase='air';if(supported)b.y=beamLine(s,b.x);contactBeam(s,b);
  if(b.phase==='on'&&(b.x<43||b.x>297)&&Math.abs(b.vx)>2)b.edge=true;else b.edge=false;
  if((b.x<30||b.x>310)&&b.y>beamLine(s,b.x)-5){if(!s.rescueUsed){s.rescueUsed=true;b.phase='rescue';b.on=false;s.rescue={brick:b.id,left:2.5,held:0};s.msg='快掉了！双方按住半秒，接住这一件！';}else dropCargo(s,b,false);}
 });
 // Circular contacts allow a falling piece to land on another, with mass-weighted impulses.
 var bodies=s.bricks.filter(function(b){return !b.resolved&&['air','on'].includes(b.phase);});
 for(var pass=0;pass<8;pass++){for(var i=0;i<bodies.length;i++)for(var j=i+1;j<bodies.length;j++){
  var a=bodies[i],b=bodies[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=28)continue;
  var nx=d>1e-6?dx/d:1,ny=d>1e-6?dy/d:0,ia=1/cargoPhysics[a.type].mass,ib=1/cargoPhysics[b.type].mass,sum=ia+ib,depth=28-d;
  a.x-=nx*depth*ia/sum;a.y-=ny*depth*ia/sum;b.x+=nx*depth*ib/sum;b.y+=ny*depth*ib/sum;
  var rel=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rel<0){var impulse=-(1.08)*rel/sum;a.vx-=impulse*nx*ia;a.vy-=impulse*ny*ia;b.vx+=impulse*nx*ib;b.vy+=impulse*ny*ib;a.impact=b.impact=Math.min(1,Math.abs(rel)/180);}
 }
 bodies.forEach(function(b){contactBeam(s,b);});}
 for(var i=0;i<bodies.length&&!s.done;i++){var b=bodies[i],p=cargoPhysics[b.type];b.stress=b.type===2&&b.on&&Math.abs(tilt)>p.tolerance?b.stress+dt:Math.max(0,b.stress-dt*1.5);
  if(b.stress>=.9){dropCargo(s,b,true);continue;}
  b.charge=b.on&&Math.abs(b.x-170)<=23&&Math.abs(tilt)<=22&&Math.abs(b.vx)<24?b.charge+dt:0;
  if(b.charge>=.5)resolveCargo(s,b,true);
 }
 s.bricks=s.bricks.filter(function(b){return !b.resolved;});
}
function step(s,dt){if(s.done||!s.ready.A||!s.ready.B||!Number.isFinite(dt)||dt<=0)return;if(s.cd>0){s.cd=Math.max(0,s.cd-dt);return;}
 var remaining=Math.min(dt,s.time);while(remaining>1e-8&&!s.done){var h=Math.min(1/120,remaining);s.elapsed+=h;s.time=Math.max(0,s.time-h);physicsTick(s,h);remaining-=h;if(s.time<1e-8&&!s.done){s.time=0;end(s,false,'时间到，和同伴再配合一次。','time_expired');}}
}

function shell(who){
 role=who;seq=0;clearNetZones();window._inL=window._inR=false;window._lastMsg=null;
 $('app').innerHTML='<section class="beam-mobile"><header class="bm-top"><button id="back" aria-label="返回">‹</button><strong>破障搬运</strong><span id="count">--s</span></header><div class="bm-status"><span id="goal">入库 0 / 6</span><span id="bm-active">在场 0</span><span id="bm-misses">失误 0 / 3</span></div><div class="bm-arena"><canvas id="bm-canvas" width="340" height="400"></canvas><div id="bm-countdown" aria-live="polite"></div></div><div id="msg" class="bm-message" role="status">等待同伴连接…</div><footer class="bm-controls"><div class="bm-role"><b class="'+(who==='A'?'bm-role-a':'bm-role-b')+'">'+who+'</b><span>你负责'+(who==='A'?'左':'右')+'端 · <strong>按住抬高，松手下降</strong></span></div><button id="bm-ready">我准备好了</button><button id="bm-lift" class="'+(who==='A'?'bm-role-a':'bm-role-b')+'" disabled>↑ 按住抬高'+(who==='A'?'左':'右')+'端</button><span id="bm-partner">同伴尚未准备</span></footer></section>';
 $('back').onclick=function(){if(directCtx){directCtx.abort();return;}if(window._dungeon)dungeonAbort();else{clearTimers();closePeer();location.search='';}};
 $('bm-ready').onclick=function(){var s=who==='A'?active:view;if(!s)return;if(who==='A')input({t:'bmReady',id:s.id},'A');else send({t:'bmReady',id:s.id});};
 var button=$('bm-lift');button.onpointerdown=function(e){if(button.disabled)return;e.preventDefault();try{button.setPointerCapture(e.pointerId);}catch(_){}act(true);};button.onpointerup=button.onpointercancel=button.onlostpointercapture=function(){act(false);};
 function down(e){if(![' ','Enter',who==='A'?'ArrowLeft':'ArrowRight'].includes(e.key)||e.repeat||button.disabled)return;e.preventDefault();act(true);}
 function up(e){if([' ','Enter','ArrowLeft','ArrowRight'].includes(e.key))act(false);}
 function blur(){act(false);}
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',blur);
 var heartbeat=setInterval(function(){if(held)act(true);},180),conn=PEER.conn;
 function disconnected(){clean();window._dead=true;if($('msg'))$('msg').textContent='连接断开，行动已停止。请返回后重新建房。';if($('bm-lift')){$('bm-lift').disabled=true;$('bm-lift').classList.remove('held');$('bm-lift').setAttribute('aria-pressed','false');}if($('bm-ready'))$('bm-ready').disabled=true;}
 if(conn)conn.on('close',disconnected);
 dispose=function(){clearInterval(heartbeat);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',blur);if(conn&&conn.off)conn.off('close',disconnected);};
}
function draw(s,who){if(!$('bm-canvas'))return;view=s;var themed=fishRoom(s),shell=document.querySelector('.beam-mobile');shell.classList.toggle('bm-fish',themed);shell.dataset.roomTheme=themed?'room-15':'';shell.querySelector('.bm-top strong').textContent=themed?'鱼箱入库':'破障搬运';$('count').textContent=Math.ceil(s.time)+'s';$('goal').textContent='入库 '+s.got+' / '+s.goal;$('bm-misses').textContent='损坏 '+s.spills+' / '+s.limit;$('bm-active').textContent='在场 '+s.bricks.length+' / '+s.config.maxActive;
 var started=s.ready.A&&s.ready.B,wait=!started||s.cd>0;
 $('bm-ready').hidden=started||s.done;$('bm-ready').disabled=!!s.ready[who];$('bm-ready').textContent=s.ready[who]?'已准备，等待同伴':'我准备好了';$('bm-lift').disabled=wait||s.done;
 $('bm-lift').classList.toggle('held',!!s.inputs[who]);$('bm-lift').setAttribute('aria-pressed',String(!!s.inputs[who]));$('bm-partner').textContent=s.done?'本轮结束':!s.ready[who==='A'?'B':'A']?'同伴尚未准备':s.inputs[who==='A'?'B':'A']?'同伴正在抬高另一端':'同伴已松手，另一端缓慢下降';
 var current=s.bricks.find(function(b){return b.stress>.15;})||s.bricks.find(function(b){return b.on&&Math.abs(b.x-170)<=23;});$('msg').textContent=s.rescue?s.msg+'（'+s.rescue.left.toFixed(1)+'秒）':current&&current.stress>.15?'倾斜太大！马上放平，玻璃正在开裂！':current&&current.on&&Math.abs(current.x-170)<=23?'货物到中央：放平梁，保持 0.5 秒入库。':s.msg;$('msg').textContent=themeText($('msg').textContent,s);$('msg').classList.toggle('rescue',!!s.rescue);
 $('bm-countdown').textContent=!started?'双方准备后开始':s.cd>0?Math.ceil(s.cd):'';$('bm-countdown').hidden=!wait||s.done;
 var cv=$('bm-canvas'),c=cv.getContext('2d');c.clearRect(0,0,340,400);c.fillStyle='#ffe8ac';c.fillRect(0,0,340,400);
 c.strokeStyle='#eac98c';c.lineWidth=1;for(var y=30;y<350;y+=45){c.beginPath();c.moveTo(18,y);c.lineTo(322,y);c.stroke();}
 if(themed)fishBackdrop(c);
 c.strokeStyle='#a9844e';c.setLineDash([4,5]);c.beginPath();c.moveTo(170,(s.yL+s.yR)/2+10);c.lineTo(170,360);c.stroke();c.setLineDash([]);
 c.fillStyle='#e9a342';c.strokeStyle='#30253a';c.lineWidth=3;c.fillRect(144,352,52,20);c.strokeRect(144,352,52,20);c.fillStyle='#54383b';c.font='bold 13px sans-serif';c.textAlign='center';c.fillText(themed?'冷库入口':'收集口',170,392);
 c.strokeStyle='#30253a';c.lineWidth=12;c.lineCap='round';c.beginPath();c.moveTo(40,s.yL);c.lineTo(300,s.yR);c.stroke();c.strokeStyle='#e9a342';c.lineWidth=7;c.stroke();
 [['A',40,s.yL,'#63b5d2'],['B',300,s.yR,'#f49c59']].forEach(function(a){c.fillStyle=a[3];c.strokeStyle='#30253a';c.lineWidth=2;c.beginPath();c.arc(a[1],a[2],14,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#30253a';c.font='bold 15px sans-serif';c.fillText(a[0],a[1],a[2]+5);});
 c.fillStyle=themed?'#fff5d7':'#30253a';c.textAlign='center';c.font='bold 14px sans-serif';c.fillText(s.tier===1?'单件练习 · 每件入库后再来一件':'连续来货 · 同时照顾两边',170,29);c.font='12px sans-serif';c.fillText('倾斜搬运 / 提前刹车 / 中央放平入库',170,48);
 s.bricks.forEach(function(b){var spec=cargoTypes[b.type],danger=b.stress>.15||b.edge||b.phase==='rescue';
  if(b.phase==='air'||b.phase==='falling'){c.strokeStyle=b.broken?'#c45246':'rgba(82,64,64,.24)';c.lineWidth=2;c.beginPath();c.moveTo(b.x-6,b.y-32);c.lineTo(b.x-6,b.y-32-Math.min(22,b.vy*.07));c.moveTo(b.x+7,b.y-35);c.lineTo(b.x+7,b.y-35-Math.min(18,b.vy*.05));c.stroke();}
  c.save();c.translate(b.x,b.y-13);c.rotate(b.type===3||b.phase==='falling'?b.rotation||0:b.on?Math.atan2(s.yR-s.yL,260):0);var squash=(b.impact||0)*.18;c.scale(1+squash,1-squash);
  c.fillStyle=themed?(b.type===2?'#b9e6dc':b.type===1?'#b2c5ce':'#f1cc87'):spec.color;c.strokeStyle=danger?'#c44138':'#30253a';c.lineWidth=danger?3:2;
  c.beginPath();if(b.type===3)c.arc(0,0,13,0,Math.PI*2);else c.roundRect(-14,-12,28,24,5);c.fill();c.stroke();
  if(themed)fish(c,1,0,.8);else{c.fillStyle='#30253a';c.font='bold 11px sans-serif';c.textAlign='center';c.fillText(b.type===1?'重':b.type===2?'◇':b.type===3?'○':'箱',0,4);}
  if(b.type===1){c.fillStyle='#52606e';c.fillRect(-11,6,22,3);}if(b.type===3){c.beginPath();c.moveTo(-10,0);c.lineTo(10,0);c.stroke();}
  if(b.stress>.15||b.broken){c.strokeStyle='#ac3835';c.lineWidth=2;c.beginPath();c.moveTo(-6,-11);c.lineTo(0,-3);c.lineTo(-4,1);c.lineTo(6,11);c.stroke();}
  c.restore();
  if(danger){c.strokeStyle='#d34435';c.lineWidth=2;c.beginPath();c.arc(b.x,b.y-13,19+(Math.sin(s.elapsed*12)+1)*2,0,Math.PI*2);c.stroke();}
  if(b.charge>0){c.fillStyle='#fff8d7';c.fillRect(b.x-14,b.y+5,28,4);c.fillStyle='#408967';c.fillRect(b.x-14,b.y+5,28*Math.min(1,b.charge/.5),4);}
  if(b.phase==='rescue'){c.fillStyle='#a63c32';c.font='bold 11px sans-serif';c.fillText('接住！',Math.max(25,Math.min(315,b.x)),b.y-40);}
 });
 if(s.done&&!window.RoomResults&&!$('bm-result')){var r=document.createElement('div');r.id='bm-result';r.className='bm-result';r.innerHTML='<strong>'+(s.win?'合作成功':'再试一次')+'</strong>'+(window._dungeon?'':'<button id="bm-again">再来一局</button>');document.querySelector('.bm-controls').appendChild(r);if($('bm-again'))$('bm-again').onclick=function(){send({t:'bmRestart',id:s.id});if(who==='A'&&active)active.againA=true;else $('bm-again').disabled=true;};}
}
function beginResult(s,who){if(directCtx){s.resultContext=directCtx;s.resultRunId=s.id;return;}if(!window.RoomResults)return;if(!window._dungeon)RoomResults.begin({runId:s.id,role:who,connection:PEER.conn,gameId:'beam',title:'破障搬运',dungeon:null,onContinue:function(){if(who==='A')host();},onExit:function(){send({t:'bye'});clearTimers();closePeer();renderHall();}});s.resultRunId=RoomResults.status()?.runId;s.resultContext=window._dungeon?window._roomGameContext:null;}
function reportResult(s){if(!window.RoomResults||s.resultReported||!s.resultRunId||RoomResults.status()?.runId!==s.resultRunId)return;s.resultReported=(s.resultContext?s.resultContext.finish:RoomResults.report)({win:s.win,reasonCode:s.win?'completed':s.reasonCode==='time_expired'?'timeout':'cargo_lost',reason:s.win?'货物已安全入库。':s.reasonCode==='time_expired'?'搬运时间用尽。':'货物损坏次数已用尽。',metrics:{durationMs:Math.round(s.elapsed*1000),timeLeftMs:Math.max(0,Math.round(s.time*1000)),completed:s.got,goal:s.goal,mistakesRemaining:Math.max(0,s.limit-s.spills),maxMistakes:s.limit}});}
function host(ctx){clearTimers();clean();directCtx=ctx||null;S.mod='beam';window._dead=false;shell('A');var s=make();active=s;beginResult(s,'A');var last=performance.now(),next=0,endAt=0;draw(snapshot(s),'A');
 var iv=setInterval(function(){if(active!==s||(directCtx&&!directCtx.isActive())){clearInterval(iv);return;}var now=performance.now(),dt=Math.min(.06,(now-last)/1000);last=now;['A','B'].forEach(function(w){if(now-s.seen[w]>650)s.inputs[w]=false;});step(s,dt);S.time=Math.ceil(s.time);
 if(now>=next){draw(snapshot(s),'A');send({t:'bmState',state:snapshot(s)});next=now+66;}
 if(s.done&&window.RoomResults){draw(snapshot(s),'A');send({t:'bmState',state:snapshot(s)});window._dead=true;reportResult(s);if(s.resultReported)clearInterval(iv);return;}
 if(s.done){if(!endAt)endAt=now+1100;if(window._dungeon&&now>=endAt){var win=s.win;clearTimers();dungeonEnd(win);}else if(!window._dungeon&&s.againA&&s.againB)host();}
 },16);timers.push(iv);
}
function guest(ctx){var inDungeon=window._dungeon;clearTimers();clean();directCtx=ctx||null;S.mod='beam';window._dead=false;shell('B');
 if(!directCtx&&!inDungeon&&PEER.conn&&!PEER.conn._beamListener){var conn=PEER.conn;PEER.conn._beamListener=function(d){if(window.RoomResults&&RoomResults.consume(d,conn))return;if(PEER.conn===conn)dgGuestOnData(d);};PEER.conn.on('data',PEER.conn._beamListener);}
}
var oldClear=clearTimers;clearTimers=function(){clean();return oldClear();};
var oldHost=startHostGame;startHostGame=function(){if(S.mod==='beam')return host();return oldHost();};renderBeamHost=host;runBeamHost=host;
var oldGuest=renderGuestTwin;renderGuestTwin=function(code,mode){if(mode==='beam')return guest();return oldGuest(code,mode);};
var oldHD=dgHostOnData;dgHostOnData=function(d){if(window.RoomResults&&RoomResults.consume(d,PEER.conn))return;if(d.t==='bmReady'||d.t==='bmInput'){input(d,'B');return;}if(d.t==='bmRestart'){if(window.RoomResults)return;if(active&&active.id===d.id&&active.done)active.againB=true;return;}return oldHD(d);};
var oldGD=dgGuestOnData;dgGuestOnData=function(d){if(window.RoomResults&&RoomResults.consume(d,PEER.conn))return;if(d.t==='bmState'){if(directCtx&&(!directCtx.isActive()||d.state?.id!==(directCtx.runId||directCtx.sessionId)))return;if(S.mod!=='beam'||!$('bm-canvas'))return;if(resultConnection!==PEER.conn){resultConnection=PEER.conn;retiredRuns.clear();}if(retiredRuns.has(d.state.id))return;if(view&&view.id!==d.state.id){retiredRuns.add(view.id);guest();}beginResult(d.state,'B');draw(d.state,'B');return;}return oldGD(d);};
window.RoomGameAdapters=window.RoomGameAdapters||{};window.RoomGameAdapters.beam={host:host,guest:guest};
window.BeamMobile={create:make,step:step,state:function(){return active||view;}};
})();
