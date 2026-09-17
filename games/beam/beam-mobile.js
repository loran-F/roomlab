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
var fishPalette={ink:'#482919',wood:'#cc8951',cream:'#fff1d6',yellow:'#ffd14d',wall:'#bfd5c5',metal:'#879b9d'},fishBackdropImage=null;
function fishBackdrop(c){c.fillStyle=fishPalette.wall;c.fillRect(0,0,340,400);
 if(!fishBackdropImage&&typeof Image!=='undefined'){fishBackdropImage=new Image();fishBackdropImage.src='assets/fish-cargo/warehouse-backdrop.png';}
 if(fishBackdropImage&&fishBackdropImage.complete&&fishBackdropImage.naturalWidth)c.drawImage(fishBackdropImage,0,0,340,400);
}
function fishPanel(c,x,y,w,h,r,fill){c.fillStyle=fill;c.strokeStyle=fishPalette.ink;c.lineWidth=2.5;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();c.stroke();}
function drawFishArena(c,s,who){fishBackdrop(c);
 // Supports follow each physical endpoint; there is no central pivot.
 [['A',40,s.yL],['B',300,s.yR]].forEach(function(p){var down=Math.max(1,347-p[2]);fishPanel(c,p[1]-6,p[2],12,down,4,'#a5aaa0');c.strokeStyle='#667d79';c.lineWidth=2;c.beginPath();c.moveTo(p[1],p[2]+12);c.lineTo(p[1],344);c.stroke();fishPanel(c,p[1]-18,345,36,9,3,fishPalette.wood);});
 fishPanel(c,141,350,58,27,4,'#899da1');c.fillStyle='#344e50';c.fillRect(146,353,48,11);c.strokeStyle='#d9e5d4';c.lineWidth=2;c.beginPath();c.moveTo(147,352);c.lineTo(147,361);c.lineTo(193,361);c.lineTo(193,352);c.stroke();c.fillStyle=fishPalette.ink;c.font='bold 10px sans-serif';c.textAlign='center';c.fillText('冷库入口',170,390);
 c.strokeStyle=fishPalette.ink;c.lineWidth=13;c.lineCap='round';c.beginPath();c.moveTo(40,s.yL);c.lineTo(300,s.yR);c.stroke();c.strokeStyle=fishPalette.wood;c.lineWidth=8;c.stroke();c.strokeStyle='#f2bd75';c.lineWidth=2;c.beginPath();c.moveTo(52,s.yL-1+(s.yR-s.yL)*12/260);c.lineTo(287,s.yR-1-(s.yR-s.yL)*13/260);c.stroke();
 var center=(s.yL+s.yR)/2,charge=s.bricks.reduce(function(n,b){return Math.max(n,b.charge||0);},0);c.save();c.translate(170,center);c.rotate(Math.atan2(s.yR-s.yL,260));c.strokeStyle=charge?'#38856c':'#fff1d6';c.lineWidth=2;c.beginPath();c.moveTo(-23,-5);c.lineTo(-23,6);c.moveTo(23,-5);c.lineTo(23,6);c.stroke();if(charge){c.fillStyle='#78bc7e';c.fillRect(-21,4,42*Math.min(1,charge/.5),3);}c.restore();
 [['A',40,s.yL,'#81bdc4'],['B',300,s.yR,'#efae67']].forEach(function(p){fishPanel(c,p[1]-12,p[2]-13,24,27,6,s.inputs[p[0]]?fishPalette.yellow:p[3]);c.fillStyle=fishPalette.ink;c.font='bold 14px sans-serif';c.fillText(p[0],p[1],p[2]+5);if(s.inputs[p[0]]){c.beginPath();c.moveTo(p[1]-4,p[2]-20);c.lineTo(p[1],p[2]-25);c.lineTo(p[1]+4,p[2]-20);c.strokeStyle=fishPalette.ink;c.lineWidth=2;c.stroke();}});

}
function drawFishCargo(c,b,s,danger){c.strokeStyle=danger?'#b7442c':fishPalette.ink;c.lineWidth=2.3;
 if(b.type===3){c.fillStyle='#ce8b4a';c.beginPath();c.arc(0,0,13,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle='#72523b';c.lineWidth=2;c.beginPath();c.moveTo(-7,-10);c.lineTo(-7,10);c.moveTo(7,-10);c.lineTo(7,10);c.stroke();c.fillStyle='#edb96a';c.beginPath();c.arc(0,0,6,0,Math.PI*2);c.fill();fish(c,0,0,.45);return;}
 c.fillStyle=b.type===2?'#e0f0e1':b.type===1?'#899faa':'#e4aa5e';c.beginPath();c.roundRect(-14,-12,28,24,b.type===1?3:2);c.fill();c.stroke();
 if(b.type===0){c.strokeStyle='#ad703c';c.lineWidth=1.5;c.beginPath();c.moveTo(-12,-5);c.lineTo(12,-5);c.moveTo(-12,6);c.lineTo(12,6);c.moveTo(-9,-10);c.lineTo(-9,10);c.moveTo(9,-10);c.lineTo(9,10);c.stroke();fish(c,0,0,.65);}
 if(b.type===1){c.fillStyle='#f6f5dd';[[-8,-6],[1,-8],[7,-4]].forEach(function(p){c.beginPath();c.moveTo(p[0]-3,p[1]+3);c.lineTo(p[0]-2,p[1]-2);c.lineTo(p[0]+3,p[1]-3);c.lineTo(p[0]+4,p[1]+3);c.fill();});c.strokeStyle=fishPalette.ink;c.lineWidth=3;c.strokeRect(-12,-10,24,20);c.fillStyle='#4e6974';c.fillRect(-10,6,20,4);fish(c,0,2,.55);}
 if(b.type===2){var sway=Math.sin(s.elapsed*5+b.x*.03)*1.2;c.fillStyle='#75c6d1';c.beginPath();c.moveTo(-11,-2+sway);c.quadraticCurveTo(0,1-sway,11,-2-sway);c.lineTo(11,9);c.lineTo(-11,9);c.closePath();c.fill();c.strokeStyle='#faffed';c.lineWidth=1.2;c.beginPath();c.moveTo(-10,-7);c.lineTo(-10,1);c.stroke();fish(c,1,4,.6);c.fillStyle='#697f85';c.fillRect(-13,-12,26,3);}
}
function send(d){netSend(d);}
function clean(){if(dispose){dispose();dispose=null;}active=null;view=null;held=false;directCtx=null;}
// Fixed-step authority: the network/render loops never advance their own cargo.
var beamLevels=[null,
 {maxActive:1,interval:.85,fallSpeed:55,gravity:110,goal:6,time:65},
 {maxActive:3,interval:2.1,fallSpeed:75,gravity:145,goal:8,time:59},
 {maxActive:3,interval:1.65,fallSpeed:95,gravity:180,goal:10,time:52,cargoFeel:true,waveGap:5.8},
 {maxActive:5,interval:1.25,fallSpeed:115,gravity:215,goal:12,time:46},
 {maxActive:4,interval:1.65,fallSpeed:95,gravity:180,goal:12,time:58,cargoFeel:true,waveGap:5.2}];
var cargoPhysics=[{mass:1,drive:1750,drag:8,bounce:.13,tolerance:100},
 {mass:2.5,drive:1100,drag:9,bounce:.05,tolerance:110},
 {mass:.8,drive:1650,drag:8,bounce:.09,tolerance:65},
 {mass:1.2,drive:650,drag:2.8,bounce:.22,tolerance:110}];
// The normal-tier prototype changes handling, not the beam geometry or controls.
var normalPhysics=[cargoPhysics[0],{mass:2.5,drive:1000,drag:5,bounce:.05,tolerance:110},
 {mass:.8,drive:1650,drag:8,bounce:.09,tolerance:50},
 {mass:1.2,drive:650,drag:1.15,bounce:.22,tolerance:110}];
function handling(s,type){return (s.config.cargoFeel?normalPhysics:cargoPhysics)[type];}
function cargoPlan(tier,seed,count){var value=seed>>>0,bag=[],list=[];
 function random(){value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;}
 var firstLeft=random()<.5;
 if(tier===3||tier===5){var at=.8,index=0;
  while(list.length<count){var size=tier===5?(index%2===0?3:4):index%2===0?2:3,types=index===0?[0,1]:index%3===1?[3,0,2]:index%3===2?[1,2]:[0,3,0];
   if(random()<.5)types.reverse();
   for(var j=0;j<size&&list.length<count;j++){var left=(j%2===0)===firstLeft;list.push({type:types[j%types.length],x:left?104+random()*12:224+random()*12,at:at+(tier===5?[0,.55,1.2,1.85]:[0,.55,1.7])[j],offset:(tier===5?[0,.55,1.2,1.85]:[0,.55,1.7])[j],wave:index});}
   at+=beamLevels[tier].waveGap;firstLeft=!firstLeft;index++;
  }return list;
 }
 for(var i=0;i<count;i++){var wave=Math.floor(i/3);if(i%3===0)bag=[0,0,1+wave%3];
  var type=tier===1?[0,0,1,2,0,3,0,1][i]:bag.splice(Math.floor(random()*bag.length),1)[0];
  var left=tier===1?i%2===0:(Math.floor(i/beamLevels[tier].maxActive)%2===0)===firstLeft;
  list.push({type:type,x:left?95+random()*30:215+random()*30});
 }return list;
}
function make(){var variation=RoomVariation.start('beam',beamSession()||directCtx),tier=Math.max(1,Math.min(5,variation.tier||1)),config=Object.assign({},beamLevels[tier]);
 return {tier:tier,config:config,cargo:cargoPlan(tier,tier===1?1:variation.seed,config.goal+2),roomId:roomId(),id:beamSession()?.runId||directCtx?.runId||directCtx?.sessionId||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),time:config.time,elapsed:0,ready:{A:false,B:false},cd:3,inputs:{A:false,B:false},seen:{A:0,B:0},seq:{A:-1,B:-1},yL:285,yR:285,vyL:0,vyR:0,bricks:[],spawn:.8,spawned:0,got:0,goal:config.goal,spills:0,limit:3,rescue:null,rescueUsed:false,done:false,win:false,msg:tier===1?'先练单件：倾斜送到中央，放平半秒入库。':tier===3?'左右成组来货！重箱持续抬，圆桶提前刹，水箱轻倾斜。':'连续来货！中央放平入库，兼顾两边的货物。'};
}
function snapshot(s){return {feedbackSeq:s.feedbackSeq||0,feedbackEvents:(s.feedbackEvents||[]).map(function(e){return Object.assign({},e);}),tier:s.tier,config:s.config,cargo:s.cargo,roomId:s.roomId,id:s.id,time:s.time,elapsed:s.elapsed,reasonCode:s.reasonCode,ready:s.ready,cd:s.cd,inputs:s.inputs,yL:s.yL,yR:s.yR,vyL:s.vyL,vyR:s.vyR,bricks:s.bricks,spawn:s.spawn,spawned:s.spawned,got:s.got,goal:s.goal,spills:s.spills,limit:s.limit,rescue:s.rescue,rescueUsed:s.rescueUsed,done:s.done,win:s.win,msg:s.msg};}
function input(d,who){var s=active;if(!s||d.id!==s.id||s.done||(directCtx&&!directCtx.isActive()))return;if(d.t==='bmReady'){s.ready[who]=true;return;}if(!Number.isInteger(d.seq)||d.seq<=s.seq[who])return;s.seq[who]=d.seq;s.inputs[who]=!!d.v;s.seen[who]=performance.now();}
function act(v){held=!!v;var s=role==='A'?active:view;if(!s)return;var d={t:'bmInput',id:s.id,seq:++seq,v:held};if(role==='A')input(d,'A');else send(d);}
function end(s,win,message,reasonCode){if(s.done)return;s.done=true;s.win=win;s.reasonCode=reasonCode||(win?'objective_complete':'attempts_exhausted');s.msg=message;s.inputs={A:false,B:false};}
function beamLine(s,x){return s.yL+(s.yR-s.yL)*(x-40)/260;}
var cargoFeedbackTrack=new WeakMap();
function cargoEvent(s,b,kind){s.feedbackSeq=(s.feedbackSeq||0)+1;s.feedbackEvents=s.feedbackEvents||[];s.feedbackEvents.push({id:s.id+':cargo:'+s.feedbackSeq,seq:s.feedbackSeq,at:s.elapsed,itemId:b.id,type:b.type,kind:kind});if(s.feedbackEvents.length>32)s.feedbackEvents.shift();}
function cargoTrack(b){var t=cargoFeedbackTrack.get(b);if(!t){t={};cargoFeedbackTrack.set(b,t);}return t;}
function resolveCargo(s,b,collected){if(b.resolved||s.done)return;b.resolved=true;cargoEvent(s,b,collected?'collect':'loss');if(collected){s.got++;s.msg='已入库 '+s.got+' / '+s.goal;if(s.got>=s.goal)end(s,true,'货物全部安全入库！');}else{s.spills++;s.msg='货物损坏 '+s.spills+' / '+s.limit;if(s.spills>=s.limit)end(s,false,'损坏次数用尽，下一次提前刹车。');}if(s.tier===1)s.spawn=s.config.interval;}
function dropCargo(s,b,broken){if(b.resolved||b.phase==='falling')return;cargoEvent(s,b,broken?'fracture':'fall');b.phase='falling';b.on=false;b.vy=Math.max(65,b.vy);b.broken=!!broken;b.charge=0;
 if(broken&&b.type===2&&s.config.cargoFeel){b.fracture={id:b.id+':fracture',at:s.elapsed,x:b.x,y:b.y-13};s.msg='水箱已经碎裂，继续照顾其他货物。';}
}
function contactBeam(s,b){if(b.phase==='falling'||b.phase==='rescue'||b.phase==='recover'||b.x<30||b.x>310)return;
 var line=beamLine(s,b.x),beamV=s.vyL+(s.vyR-s.vyL)*(b.x-40)/260;
 if(b.y>=line-.001){var impact=b.vy-beamV;if(impact< -5){b.y=Math.min(b.y,line);return;}if(!cargoTrack(b).landed){cargoTrack(b).landed=true;cargoEvent(s,b,'land');}b.y=line;b.on=true;b.phase='on';
  if(impact>65){b.impact=Math.min(1,impact/230);b.vy=beamV-impact*cargoPhysics[b.type].bounce;b.on=false;b.phase='air';}
  else b.vy=beamV;
 }
}
function physicsTick(s,dt){
 var loads={L:0,R:0};if(s.config.cargoFeel)s.bricks.forEach(function(b){if(b.resolved||!b.on)return;var right=Math.max(0,Math.min(1,(b.x-40)/260)),mass=handling(s,b.type).mass;loads.L+=mass*(1-right);loads.R+=mass*right;});
 ['L','R'].forEach(function(side){var who=side==='L'?'A':'B',v='vy'+side,y='y'+side,target=s.inputs[who]?-65/(1+.4*loads[side]):32;s[v]+=(target-s[v])*(1-Math.exp(-7*dt));s[y]+=s[v]*dt;if(s[y]<205||s[y]>325){s[y]=Math.max(205,Math.min(325,s[y]));s[v]=0;}});
 if(s.rescue){var r=s.rescue,b=s.bricks.find(function(b){return b.id===r.brick;});r.left-=dt;r.held=s.inputs.A&&s.inputs.B?r.held+dt:0;
  if(!b||b.resolved)s.rescue=null;
  else if(r.held>=.5){cargoEvent(s,b,'rescue');b.phase='recover';b.recovery=0;b.recoverX=b.x;b.recoverY=b.y;b.vx=b.vy=0;s.rescue=null;s.msg='接住了！其他货物仍在继续。';}
  else if(r.left<=0){dropCargo(s,b,false);s.rescue=null;s.msg='没扶住，注意其他货物。';}
 }
 // Teaching waits for resolution; normal groups use their own pacing below.
 if(s.tier!==1||s.bricks.length===0)s.spawn=Math.max(0,s.spawn-dt);
 var nextCargo=s.cargo[s.spawned],due=s.spawn<=0;
 if(s.config.cargoFeel)s.calm=s.bricks.length<=1?(s.calm||0)+dt:0;
 if(s.config.cargoFeel&&nextCargo){var newWave=nextCargo.wave!==s.wave;
  // A new group may overlap the last piece, but never dumps an overdue backlog.
  due=due&&(newWave?s.bricks.length<=1&&(s.waveAt===undefined||s.calm>=1)&&s.elapsed>=(s.waveAt===undefined ? .8 : s.waveAt+s.config.waveGap):s.elapsed>=s.waveAt+nextCargo.offset);
 }
 if(due&&s.spawned<s.cargo.length&&s.bricks.length<s.config.maxActive){var item=s.cargo[s.spawned++];if(s.config.cargoFeel&&item.wave!==s.wave){s.wave=item.wave;s.waveAt=s.elapsed;}s.bricks.push({id:s.id+':'+s.spawned,type:item.type,x:item.x,y:48,on:false,phase:'air',vy:s.config.fallSpeed,vx:0,charge:0,stress:0,impact:0,rotation:0,resolved:false});s.spawn=s.config.cargoFeel ? .55 : s.config.interval;}
 var tilt=s.yR-s.yL;
 s.bricks.forEach(function(b){if(b.resolved)return;b.impact=Math.max(0,(b.impact||0)-dt*5);
  if(b.phase==='rescue')return;
  if(b.phase==='recover'){b.recovery=Math.min(1,b.recovery+dt/0.45);var ease=b.recovery*b.recovery*(3-2*b.recovery),target=b.recoverX<170?62:278;b.x=b.recoverX+(target-b.recoverX)*ease;b.y=b.recoverY+(beamLine(s,target)-35-b.recoverY)*ease;if(b.recovery===1){b.phase='air';b.vy=0;}return;}
  if(b.phase==='falling'){b.vy+=s.config.gravity*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.rotation+=(b.vx<0?-1:1)*dt*3;if(b.y>430)resolveCargo(s,b,false);return;}
  var p=handling(s,b.type),supported=b.on;
  if(b.on){b.vx+=(tilt/260*p.drive-b.vx*p.drag)*dt;b.vy=s.vyL+(s.vyR-s.vyL)*(b.x-40)/260;}
  else b.vy+=s.config.gravity*dt;
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.rotation+=b.type===3?b.vx*dt/14:0;
  b.on=false;b.phase='air';if(supported)b.y=beamLine(s,b.x);contactBeam(s,b);
  if(b.phase==='on'&&(b.x<43||b.x>297)&&Math.abs(b.vx)>2)b.edge=true;else b.edge=false;
  if((b.x<30||b.x>310)&&b.y>beamLine(s,b.x)-5){if(!s.rescueUsed){s.rescueUsed=true;cargoEvent(s,b,'edge');b.phase='rescue';b.on=false;s.rescue={brick:b.id,left:2.5,held:0};s.msg='快掉了！双方按住半秒，接住这一件！';}else dropCargo(s,b,false);}
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
 for(var i=0;i<bodies.length&&!s.done;i++){var b=bodies[i],p=handling(s,b.type);b.stress=b.type===2&&b.on&&Math.abs(tilt)>p.tolerance?b.stress+dt:Math.max(0,b.stress-dt*1.5);
  var feedback=cargoTrack(b);if(b.stress>.15&&!feedback.cracking){feedback.cracking=true;cargoEvent(s,b,'crack');}else if(b.stress<=.01&&feedback.cracking){feedback.cracking=false;cargoEvent(s,b,'steady');}
  if(b.type===3&&b.on&&Math.abs(b.vx)>18&&!feedback.rolling){feedback.rolling=true;cargoEvent(s,b,'roll');}
  if(b.stress>=(s.config.cargoFeel?1.2:.9)){dropCargo(s,b,true);continue;}
  b.charge=b.on&&Math.abs(b.x-170)<=23&&Math.abs(tilt)<=22&&Math.abs(b.vx)<(s.config.cargoFeel&&b.type===3?12:24)?b.charge+dt:0;
  if(b.charge>=.5)resolveCargo(s,b,true);
 }
 s.bricks=s.bricks.filter(function(b){return !b.resolved;});
}
function step(s,dt){if(s.done||!s.ready.A||!s.ready.B||!Number.isFinite(dt)||dt<=0)return;if(s.cd>0){s.cd=Math.max(0,s.cd-dt);return;}
 var remaining=Math.min(dt,s.time);while(remaining>1e-8&&!s.done){var h=Math.min(1/120,remaining);s.elapsed+=h;s.time=Math.max(0,s.time-h);physicsTick(s,h);remaining-=h;if(s.time<1e-8&&!s.done){s.time=0;end(s,false,'时间到，和同伴再配合一次。','time_expired');}}
}

function shell(who){
 role=who;seq=0;clearNetZones();window._inL=window._inR=false;window._lastMsg=null;
 $('app').innerHTML='<section class="beam-mobile"><header class="bm-top"><button id="back" aria-label="返回">‹</button><strong>破障搬运</strong><span class="bm-role-tag">'+who+'</span><span id="count">--s</span></header><div class="bm-status"><span id="goal">入库 0 / 6</span><span id="bm-active">在场 0</span><span id="bm-misses">失误 0 / 3</span></div><div class="bm-arena"><canvas id="bm-canvas" width="340" height="400"></canvas><div id="bm-countdown" aria-live="polite"></div></div><div id="msg" class="bm-message" role="status">等待同伴连接…</div><footer class="bm-controls"><div class="bm-role"><b class="'+(who==='A'?'bm-role-a':'bm-role-b')+'">'+who+'</b><span>你负责'+(who==='A'?'左':'右')+'端 · <strong>按住抬高，松手下降</strong></span></div><button id="bm-ready">我准备好了</button><button id="bm-lift" class="'+(who==='A'?'bm-role-a':'bm-role-b')+'" disabled>↑ 按住抬高'+(who==='A'?'左':'右')+'端</button><span class="bm-release-hint">松手下降 · 配合放平后入库</span><span id="bm-partner">同伴尚未准备</span></footer></section>';
 $('back').onclick=function(){if(directCtx){directCtx.abort();return;}if(window._dungeon)dungeonAbort();else{clearTimers();closePeer();location.search='';}};
 $('back').textContent='☰';$('back').setAttribute('aria-label','本局菜单');$('back').addEventListener('click',function(e){if(!window.RoomShell)return;e.preventDefault();e.stopImmediatePropagation();RoomShell.menu({help:'你负责'+(who==='A'?'左':'右')+'端：按住抬高，松手下降。配合放平，让货物停稳在中央入库；留意易碎鱼箱。',release:function(){var b=$('bm-lift');if(b&&b.onpointerup)b.onpointerup();}});},true);
 $('bm-ready').onclick=function(){var s=who==='A'?active:view;if(!s)return;if(who==='A')input({t:'bmReady',id:s.id},'A');else send({t:'bmReady',id:s.id});};
 var button=$('bm-lift');button.onpointerdown=function(e){if(button.disabled)return;e.preventDefault();try{button.setPointerCapture(e.pointerId);}catch(_){}act(true);};button.onpointerup=button.onpointercancel=button.onlostpointercapture=function(){act(false);};
 function down(e){if(window.RoomShell?.isOpen())return;if(![' ','Enter',who==='A'?'ArrowLeft':'ArrowRight'].includes(e.key)||e.repeat||button.disabled)return;e.preventDefault();act(true);}
 function up(e){if([' ','Enter','ArrowLeft','ArrowRight'].includes(e.key))act(false);}
 function blur(){act(false);}
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',blur);
 var heartbeat=setInterval(function(){if(held)act(true);},180),conn=PEER.conn;
 function disconnected(){clean();window._dead=true;if($('msg'))$('msg').textContent='连接断开，行动已停止。请返回后重新建房。';if($('bm-lift')){$('bm-lift').disabled=true;$('bm-lift').classList.remove('held');$('bm-lift').setAttribute('aria-pressed','false');}if($('bm-ready'))$('bm-ready').disabled=true;}
 if(conn)conn.on('close',disconnected);
 dispose=function(){clearInterval(heartbeat);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',blur);if(conn&&conn.off)conn.off('close',disconnected);};
}
function drawGlassFracture(c,e,t){if(t<0||t>.65)return;const a=t<=.15?1:1-(t-.15)/.5;
 const shapes=[ [[-8,-8],[7,-6],[3,0],[6,8],[-7,5],[-4,-1]], [[-7,-7],[8,-9],[6,2],[-1,8],[-6,4],[-2,-1]], [[-4,-3],[4,-5],[2,4],[-2,3]], [[-3,-5],[4,-1],[1,4],[-4,1]], [[-4,-2],[2,-4],[4,3],[-1,4]] ];
 const starts=[[-9,-3],[10,-3],[-5,-10],[4,9],[0,-1]],velocities=[[-30,-25],[29,-21],[-13,-36],[13,-8],[3,-39]];
 c.save();c.translate(e.x,e.y);c.globalAlpha=a;c.lineWidth=1.3;
 for(let i=0;i<5;i++){const x=starts[i][0]+velocities[i][0]*t,y=starts[i][1]+velocities[i][1]*t+27*t*t;c.save();c.translate(x,y);c.rotate((i-2)*.2+t*(i%2?1.2:-1.1));c.fillStyle=i<2?'#d8f6ee':'#b1e4db';c.strokeStyle='#386c69';c.beginPath();shapes[i].forEach((p,n)=>n?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fill();c.stroke();if(i<2){c.strokeStyle='#ffffff';c.lineWidth=1.5;c.beginPath();c.moveTo(-4,-4);c.lineTo(2,-3);c.stroke();}c.restore();}
 // Water travels down and out, separately from the upward glass fan.
 for(let i=0;i<6;i++){const d=(i-2.5)/2.5,x=d*(6+24*t),y=5+(i%3)*4+(12+i%2*6)*t+35*t*t;c.save();c.translate(x,y);c.rotate(-d*.35);c.fillStyle='#238bda';c.strokeStyle='#176799';c.lineWidth=.7;c.beginPath();c.moveTo(0,-5);c.bezierCurveTo(1,-2,3,0,2.6,2.6);c.bezierCurveTo(1.8,5,-2.2,4.5,-2.6,2);c.bezierCurveTo(-3,0,-.8,-2,0,-5);c.fill();c.stroke();c.fillStyle='#b9edff';c.beginPath();c.ellipse(-.6,1,.65,1.4,0,0,Math.PI*2);c.fill();c.restore();}c.restore();}

var beamFeedbackRun=null,beamFeedbackSeq=0,beamFeedbackLast=0,beamFeedbackUntil=0,beamFeedbackText='',beamSoundTimes={};
function consumeCargoFeedback(s){var now=performance.now(),gap=beamFeedbackLast&&now-beamFeedbackLast>1500;beamFeedbackLast=now;if(beamFeedbackRun!==s.id){beamFeedbackRun=s.id;beamFeedbackSeq=0;beamFeedbackUntil=0;beamFeedbackText='';beamSoundTimes={};}
 var priorities={land:1,roll:2,steady:3,collect:4,rescue:5,edge:6,crack:7,fall:8,loss:9,fracture:10},chosen=null;
 (s.feedbackEvents||[]).forEach(function(e){if(e.seq<=beamFeedbackSeq)return;beamFeedbackSeq=e.seq;if(document.hidden||gap||s.done||s.elapsed-e.at>1||s.elapsed<e.at)return;if(!chosen||priorities[e.kind]>=priorities[chosen.kind])chosen=e;});
 if(chosen){var name=cargoName(cargoTypes[chosen.type],s),texts={land:name+'落板了，倾斜送向中央。',roll:'圆桶开始滚动，提前反向刹车！',steady:'水箱已稳住，可以继续轻轻搬运。',collect:name+'已入库！',rescue:'接回来了！放平，再送到中央。',edge:'快掉了！双方同时按住半秒！',crack:'水箱正在开裂！马上放平！',fall:name+'滑落了，照顾好剩余货物。',loss:name+'损坏，剩余容错 '+Math.max(0,s.limit-s.spills)+' 次。',fracture:'水箱碎裂了，继续照顾其他货物。'};beamFeedbackText=texts[chosen.kind]||'';beamFeedbackUntil=now+1500;
 var sounds={land:'tap',roll:'tick',steady:'reveal',collect:'correct',rescue:'reveal',edge:'warning',crack:'warning',fall:'error',loss:'error',fracture:'error'};var profiles={land:['cargo-wood','cargo-ice','cargo-glass','cargo-barrel'][chosen.type],roll:'cargo-barrel-roll',crack:'cargo-glass-crack',fracture:'cargo-glass-break'},soundKey=chosen.kind==='land'||chosen.kind==='roll'?'contact':chosen.kind,cooldown={contact:140,crack:350,fracture:180}[soundKey]||0,allow=beamSoundTimes[soundKey]===undefined||now-beamSoundTimes[soundKey]>=cooldown;if(window.GameFeedback&&allow){beamSoundTimes[soundKey]=now;GameFeedback.emit(sounds[chosen.kind],{profile:profiles[chosen.kind],source:'beam:'+chosen.kind,haptic:chosen.kind!=='land'&&chosen.kind!=='roll'});}}
 return now<beamFeedbackUntil?beamFeedbackText:'';
}
function draw(s,who){if(!$('bm-canvas'))return;view=s;var eventText=consumeCargoFeedback(s);var themed=fishRoom(s),shell=document.querySelector('.beam-mobile');shell.classList.toggle('bm-fish',themed);shell.dataset.roomTheme=themed?'room-15':'';shell.dataset.role=who;shell.querySelector('.bm-top strong').textContent=themed?'鱼箱入库':'破障搬运';$('count').textContent=Math.ceil(s.time)+'s';$('goal').textContent='入库 '+s.got+' / '+s.goal;$('bm-misses').textContent='损坏 '+s.spills+' / '+s.limit;$('bm-active').textContent='在场 '+s.bricks.length+' / '+s.config.maxActive;
 var started=s.ready.A&&s.ready.B,wait=!started||s.cd>0;
 $('bm-ready').hidden=started||s.done;$('bm-ready').disabled=!!s.ready[who];$('bm-ready').textContent=s.ready[who]?'已准备，等待同伴':'我准备好了';$('bm-lift').disabled=wait||s.done;
 $('bm-lift').classList.toggle('held',!!s.inputs[who]);$('bm-lift').setAttribute('aria-pressed',String(!!s.inputs[who]));if(themed)$('bm-lift').textContent=(s.inputs[who]?'↑ 正在抬高':'↑ 按住抬高')+(who==='A'?'左':'右')+'端';$('bm-partner').textContent=s.done?'本轮结束':!s.ready[who==='A'?'B':'A']?'同伴尚未准备':s.inputs[who==='A'?'B':'A']?'同伴正在抬高另一端':'同伴已松手，另一端缓慢下降';
 var current=s.bricks.find(function(b){return !b.broken&&b.stress>.15;})||s.bricks.find(function(b){return b.on&&Math.abs(b.x-170)<=23;});$('msg').textContent=s.rescue?s.msg+'（'+s.rescue.left.toFixed(1)+'秒）':current&&current.stress>.15?'倾斜太大！马上放平，玻璃正在开裂！':current&&current.on&&Math.abs(current.x-170)<=23?'货物到中央：放平梁，保持 0.5 秒入库。':(!s.done&&eventText?eventText:s.msg);$('msg').textContent=themeText($('msg').textContent,s);$('msg').classList.toggle('rescue',!!s.rescue);$('msg').classList.toggle('warning',!!(current&&current.stress>.15));
 $('bm-countdown').textContent=!started?'双方准备后开始':s.cd>0?Math.ceil(s.cd):'';$('bm-countdown').hidden=!wait||s.done;
 var cv=$('bm-canvas'),c=cv.getContext('2d');c.clearRect(0,0,340,400);c.fillStyle='#ffe8ac';c.fillRect(0,0,340,400);
 c.strokeStyle='#eac98c';c.lineWidth=1;for(var y=30;y<350;y+=45){c.beginPath();c.moveTo(18,y);c.lineTo(322,y);c.stroke();}
 if(themed)drawFishArena(c,s,who);else{

 c.strokeStyle='#a9844e';c.setLineDash([4,5]);c.beginPath();c.moveTo(170,(s.yL+s.yR)/2+10);c.lineTo(170,360);c.stroke();c.setLineDash([]);
 c.fillStyle='#e9a342';c.strokeStyle='#30253a';c.lineWidth=3;c.fillRect(144,352,52,20);c.strokeRect(144,352,52,20);c.fillStyle='#54383b';c.font='bold 13px sans-serif';c.textAlign='center';c.fillText(themed?'冷库入口':'收集口',170,392);
 c.strokeStyle='#30253a';c.lineWidth=12;c.lineCap='round';c.beginPath();c.moveTo(40,s.yL);c.lineTo(300,s.yR);c.stroke();c.strokeStyle='#e9a342';c.lineWidth=7;c.stroke();
 [['A',40,s.yL,'#63b5d2'],['B',300,s.yR,'#f49c59']].forEach(function(a){c.fillStyle=a[3];c.strokeStyle='#30253a';c.lineWidth=2;c.beginPath();c.arc(a[1],a[2],14,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#30253a';c.font='bold 15px sans-serif';c.fillText(a[0],a[1],a[2]+5);});
 c.fillStyle=themed?'#fff5d7':'#30253a';c.textAlign='center';c.font='bold 14px sans-serif';c.fillText(s.tier===1?'单件练习 · 每件入库后再来一件':s.config.cargoFeel?'左右成组 · 组间调整':'连续来货 · 同时照顾两边',170,29);c.font='12px sans-serif';c.fillText('倾斜搬运 / 提前刹车 / 中央放平入库',170,48);
 }
 s.bricks.forEach(function(b){if(s.config.cargoFeel&&b.fracture)return;var spec=cargoTypes[b.type],danger=b.stress>.15||b.edge||b.phase==='rescue';
  if(b.phase==='air'||b.phase==='falling'){c.strokeStyle=b.broken?'#c45246':'rgba(82,64,64,.24)';c.lineWidth=2;c.beginPath();c.moveTo(b.x-6,b.y-32);c.lineTo(b.x-6,b.y-32-Math.min(22,b.vy*.07));c.moveTo(b.x+7,b.y-35);c.lineTo(b.x+7,b.y-35-Math.min(18,b.vy*.05));c.stroke();}
  c.save();c.translate(b.x,b.y-13);c.rotate(b.type===3||b.phase==='falling'?b.rotation||0:b.on?Math.atan2(s.yR-s.yL,260):0);var squash=(b.impact||0)*.18;c.scale(1+squash,1-squash);
  if(themed)drawFishCargo(c,b,s,danger);else{
  c.fillStyle=themed?(b.type===2?'#b9e6dc':b.type===1?'#b2c5ce':'#f1cc87'):spec.color;c.strokeStyle=danger?'#c44138':'#30253a';c.lineWidth=danger?3:2;
  c.beginPath();if(b.type===3)c.arc(0,0,13,0,Math.PI*2);else c.roundRect(-14,-12,28,24,5);c.fill();c.stroke();
  if(themed)fish(c,1,0,.8);else{c.fillStyle='#30253a';c.font='bold 11px sans-serif';c.textAlign='center';c.fillText(b.type===1?'重':b.type===2?'◇':b.type===3?'○':'箱',0,4);}
  if(b.type===1){c.fillStyle='#52606e';c.fillRect(-11,6,22,3);}if(b.type===3){c.beginPath();c.moveTo(-10,0);c.lineTo(10,0);c.stroke();}
  }
  if(b.stress>.15||b.broken){c.strokeStyle='#ac3835';c.lineWidth=2;c.beginPath();c.moveTo(-6,-11);c.lineTo(0,-3);c.lineTo(-4,1);c.lineTo(6,11);c.stroke();}
  c.restore();
  if(danger){c.strokeStyle='#d34435';c.lineWidth=2;c.beginPath();c.arc(b.x,b.y-13,19+(Math.sin(s.elapsed*12)+1)*2,0,Math.PI*2);c.stroke();}
  if(b.charge>0){c.fillStyle='#fff8d7';c.fillRect(b.x-14,b.y+5,28,4);c.fillStyle='#408967';c.fillRect(b.x-14,b.y+5,28*Math.min(1,b.charge/.5),4);}
  if(b.phase==='rescue'){c.fillStyle='#a63c32';c.font='bold 11px sans-serif';c.fillText('接住！',Math.max(25,Math.min(315,b.x)),b.y-40);}
 });
 // Same authority timestamp on both roles; no local timer or duplicate effect queue.
 if(s.config.cargoFeel)s.bricks.forEach(function(b){if(b.fracture)drawGlassFracture(c,b.fracture,s.elapsed-b.fracture.at);});
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
