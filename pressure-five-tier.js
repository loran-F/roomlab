/* Five-tier pressure model and direct-session adapter. Shared HTML stays unchanged. */
(function(){
'use strict';
var context=null,role='A',loop=null,dispose=null,connection=null,lastRevision=-1;
function meta(ctx){return window.RoomSession&&RoomSession.current()||ctx||{};}
function config(tier){tier=Math.max(1,Math.min(5,Math.floor(Number(tier)||1)));var i=tier-1;return {tier:tier,tutorial:tier===1,goal:[1,2,3,4,5][i],maxHp:[5,4,3,3,2][i],safeHalf:[8,6,5,4,3][i],accel:[8,9,10,11,12][i],maxSpeed:[4,5,6,6.5,7][i],brake:28,damping:[8,7,6,5.5,5][i],jitter:[0,.12,.2,.3,.4][i],stable:[24,24,24,25,26][i],warning:3,moving:1.5,grace:[.8,.6,.5,.4,.35][i],hold:[2,2.5,3,3.5,4][i],timeLimit:[120,180,240,300,360][i]};}
function nextCenter(s){if(s.cfg.tutorial)return 50;var next=30+Math.floor(Math.random()*41);if(Math.abs(next-s.center)<10)next=s.center>=50?s.center-14:s.center+14;return rtClamp(next,28,72);}
function create(tier){var c=config(tier),center=c.tutorial?50:38+Math.floor(Math.random()*25),s={cfg:c,safeHalf:c.safeHalf,jitter:c.jitter,phase:'stable',phaseLeft:c.stable,round:0,hp:c.maxHp,seals:0,charge:0,val:c.tutorial?40:40+Math.floor(Math.random()*21),velocity:0,center:center,shift:c.stable,heatB:0,cooldown:0,unsafe:0,requireRelease:false,feedback:'waiting',adjust:{up:false,down:false},transition:0};s.nextCenter=nextCenter(s);return s;}
function step(s,dt){
 if(s.done)return;dt=Math.max(0,Math.min(.1,dt));var c=s.cfg;if(s.time<=0){s.done=true;s.win=false;rtMessage(s,'时间用尽，本次稳压结束。','err');return;}
 if(!s.inputs.B)s.requireRelease=false;s.phaseLeft-=dt;s.cooldown=Math.max(0,s.cooldown-dt);
 if(s.phase==='settle'){s.velocity*=Math.exp(-9*dt);s.motion='settling';if(s.phaseLeft<=0&&!s.requireRelease){s.phase='warning';s.phaseLeft=c.warning;rtMessage(s,'下一轮区间即将迁移，B 报预告，暂不开阀。');}}
 else{
  pressureMotion(s,dt);
  if(s.phase==='stable'&&s.phaseLeft<=0){s.phase='warning';s.phaseLeft=c.warning;s.requireRelease=true;rtMessage(s,'B 预告下一区间；松阀等待迁移。');}
  else if(s.phase==='warning'&&s.phaseLeft<=0){s.phase='moving';s.phaseLeft=c.moving;s.moveFrom=s.center;s.requireRelease=true;s.charge=0;s.unsafe=0;}
  else if(s.phase==='moving'){var x=rtClamp(1-s.phaseLeft/c.moving,0,1);s.center=s.moveFrom+(s.nextCenter-s.moveFrom)*(x*x*(3-2*x));if(s.phaseLeft<=0){s.center=s.nextCenter;s.nextCenter=nextCenter(s);s.phase='stable';s.phaseLeft=c.stable;rtMessage(s,'新区间已稳定，先调压力，再开阀。');}}
 }
 s.shift=Math.max(0,s.phaseLeft);var open=s.inputs.B&&!s.requireRelease&&s.phase==='stable'&&s.cooldown===0,inside=Math.abs(s.val-s.center)<=s.safeHalf;
 s.heatB=rtClamp(s.heatB+(open?18:-32)*dt,0,100);
 if(open&&inside){s.charge+=dt;s.unsafe=0;s.feedback='valid';}
 else if(open){s.unsafe+=dt;if(s.unsafe>c.grace)s.charge=Math.max(0,s.charge-dt*.65);s.feedback=s.unsafe<=c.grace?'grace':'outside';}
 else{s.unsafe=0;s.feedback=s.phase==='settle'?'round-complete':s.requireRelease?'release':s.phase==='moving'?'moving':s.phase==='warning'?'warning':s.cooldown>0?'cooling':'waiting';if(s.phase==='stable')s.charge=Math.max(0,s.charge-dt*.25);}
 if(s.unsafe>=c.grace+1||s.heatB>=100){s.hp--;s.cooldown=1.5;s.requireRelease=true;s.unsafe=0;s.charge=Math.max(0,s.charge-1);s.feedback='damage';rtMessage(s,'持续偏离或阀门过热：耐久 −1。松阀后重新调整。','err');}
 if(s.val<=0||s.val>=100||s.hp<=0){s.val=rtClamp(s.val,0,100);s.done=true;s.win=false;rtMessage(s,s.hp<=0?'设备耐久耗尽。':'压力触及极限，稳压失败。','err');return;}
 if(s.charge>=c.hold){s.seals++;s.round=s.seals;s.charge=0;s.unsafe=0;s.velocity=0;s.adjust={up:false,down:false};s.requireRelease=true;s.phase='settle';s.phaseLeft=1;s.feedback='round-complete';if(s.seals>=c.goal){s.done=true;s.win=true;rtMessage(s,c.goal+' 轮稳压完成！','ok');}else rtMessage(s,'第 '+s.seals+' / '+c.goal+' 轮完成。请 B 先松阀。','ok');}
}
var baseSnapshot=pressureSnapshot,baseUI=pressureUI,baseDraw=pressureDraw;
pressureConfig=config;pressureCreate=function(){var m=meta(context);return create(m.tier||(typeof coopDifficulty==='function'?coopDifficulty().tier:1));};pressureStep=step;
pressureSnapshot=function(s,who){var v=baseSnapshot(s,who);v.tier=s.cfg.tier;v.goal=s.cfg.goal;v.maxHp=s.cfg.maxHp;v.grace=s.cfg.grace;v.revision=s.revision||0;return v;};
pressureUI=function(who){baseUI(who);};
pressureDraw=function(s,who){baseDraw(s,who);$('rt-health').textContent='设备耐久 '+s.hp+' / '+s.maxHp;$('rt-progress').textContent='校准 '+s.seals+' / '+s.goal;$('rt-help').textContent=who==='A'?'按住加 / 减调节压力；松手停稳，反向先刹车。向 B 报压力和趋势，再听指挥。':'向 A 报稳定区间。区间内按住阀门 '+s.holdGoal+' 秒；擦边有 '+s.grace+' 秒缓冲。每轮完成先松阀，预告和迁移期间不开阀。';};
function live(){return context&&context.isActive()&&connection===PEER.conn;}
function send(d){if(live())context.send(d);}
function cleanup(){if(loop)clearInterval(loop);loop=null;if(dispose)dispose();dispose=null;if(window._rtCleanup===cleanup)window._rtCleanup=null;context=null;connection=null;RT=null;RT_VIEW=null;}
function packet(d){if(!live()||!d||d.id!==(context.runId||context.sessionId))return false;if(role==='A'){if(d.t==='p5Ready'){if(!RT.ready){RT.ready=true;rtMessage(RT,'双方已连接，倒计时后开始。');}return true;}if(d.t==='rtInput'){realtimeInput(d,'B');return true;}}else if(d.t==='p5State'){if(!d.state||d.state.id!==d.id||d.state.tier!==context.tier)return true;if(!Number.isSafeInteger(d.state.revision)||d.state.revision<=lastRevision)return true;lastRevision=d.state.revision;rtDraw(d.state,'B');send({t:'p5Ready',id:d.id});return true;}return false;}
function start(who,ctx){clearTimers();cleanup();context=ctx;connection=PEER.conn;role=who;lastRevision=-1;var m=meta(ctx),id=m.runId||ctx.runId||ctx.sessionId;S.mod='pressure';S.role=who;window._dead=false;realtimeUI('pressure',who);var kicker=document.querySelector('.rt-kicker');if(kicker)kicker.textContent=['教学','入门','标准','困难','极限'][(m.tier||ctx.tier)-1]+' · '+config(m.tier||ctx.tier).goal+' 轮合作校准';$('back').onclick=function(){var c=context;cleanup();if(c&&c.isActive())c.abort();};dispose=rtControls(who,'pressure');window._rtCleanup=cleanup;
 if(who==='A'){RT=Object.assign(create(m.tier||ctx.tier),{id:id,mode:'pressure',ready:false,cd:3,time:config(m.tier||ctx.tier).timeLimit,elapsed:0,revision:0,done:false,win:false,inputs:{A:false,B:false},seq:{A:-1,B:-1},seen:{A:performance.now(),B:performance.now()}});var last=performance.now();loop=setInterval(function(){if(!live()){cleanup();return;}var now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;var s=RT;if(s.done)return;for(var r of['A','B'])if(now-s.seen[r]>650){s.inputs[r]=false;if(r==='A')s.adjust={up:false,down:false};}if(s.ready){if(s.cd>0){s.cd=Math.max(0,s.cd-dt);if(s.cd===0)rtMessage(s,'先报区间与读数，停稳后开阀校准。');}else{s.time=Math.max(0,s.time-dt);s.elapsed+=dt;step(s,dt);}}s.revision++;rtDraw(pressureSnapshot(s,'A'),'A');send({t:'p5State',id:id,state:pressureSnapshot(s,'B')});if(s.done){clearInterval(loop);loop=null;window._dead=true;ctx.finish({win:s.win,reasonCode:s.win?'completed':s.time<=0?'timeout':s.hp<=0?'health_exhausted':'pressure_overflow',reason:s.msg&&s.msg.txt,metrics:{durationMs:s.elapsed*1000,timeLeftMs:s.time*1000,completed:s.seals,goal:s.cfg.goal,hp:s.hp}});}},50);timers.push(loop);}
 else send({t:'p5Ready',id:id});
}
var hd=dgHostOnData;dgHostOnData=function(d){if(packet(d))return;return hd.apply(this,arguments);};var gd=dgGuestOnData;dgGuestOnData=function(d){if(packet(d))return;return gd.apply(this,arguments);};
window.RoomGameAdapters=window.RoomGameAdapters||{};RoomGameAdapters.pressure={host:function(ctx){start('A',ctx);},guest:function(ctx){start('B',ctx);}};
window.PressureFiveTier={config:config,create:create,step:step,snapshot:pressureSnapshot,state:function(){return RT_VIEW;}};
})();
