(function(){
'use strict';
var observer=null, mazeTerminal=null, mazeStartedAt=null, mazeContext=null;
var scenario=null, serial=0, acceptedEntries=new WeakMap(),directContext=null,directRunning=false,directSeen=null;
function sessionMeta(){return window.RoomSession&&RoomSession.current()||directContext||{};}
function config(tier,theme){
 tier=Math.max(1,Math.min(5,Math.floor(Number(tier)||1)));theme=theme==='mountain'?'mountain':'vent';
 var n=[1,2,3,4,5][tier-1],pen={wall:[0,1,3,4,5][tier-1],trap:[0,3,5,7,8][tier-1],wrongGate:[1,2,3,4,5][tier-1]},mount=theme==='mountain';
 return {tier:tier,theme:theme,timeLimit:[180,180,210,240,300][tier-1],rows:[9,11,13,15,17][tier-1],cols:[9,11,11,13,13][tier-1],gateCount:n,trapCount:[0,1,2,3,4][tier-1],visionRadius:tier<=2?2:1,penalties:pen,gateFractions:Array.from({length:n},function(_,i){return(i+1)/(n+1);}),routeSteps:{min:[18,26,36,46,62][tier-1],max:[18,34,44,60,80][tier-1]},text:{
 gate:mount?'登山保护点':'阀门',options:mount?['岩钉','安全绳','冰镐']:['蓝阀','橙阀','绿阀'],
 encounter:mount?'报出岩壁标记，听 B 指挥选择登山工具。':'报符号给 B，听指挥选择阀门。',
 wrongGate:(mount?'工具不匹配':'阀门不对')+'，−'+pen.wrongGate+'秒。重新向 B 核对'+(mount?'岩壁标记。':'符号。'),
 opened:mount?'保护点架设完成！继续前进。':'阀门打开！继续前进。',
 lockedExit:mount?'先完成 '+n+' 个登山保护点，再前往观景台。':'出口未供电：先打开地图上的 '+n+' 个阀门。',
 success:mount?'保护点全部架设完成，到达观景台！一起欣赏山顶风景。':'阀门全部打开，成功到达出口。',
 wall:mount?(pen.wall?'岩壁挡路，−'+pen.wall+'秒。请 B 重新确认方向。':'岩壁挡路，本次不扣时间。请 B 重新确认方向。'):(pen.wall?'碰墙，−'+pen.wall+'秒。请 B 重新确认方向。':'碰墙，本次不扣时间。请 B 重新确认方向。'),
 trap:(mount?'踩到松动碎石':'踩到陷阱')+'，−'+pen.trap+'秒。请 B 指出安全路线。',end:mount?'观景台':'出口',hazard:mount?'危险坡':'陷阱',clue:mount?'岩壁标记':'现场符号'
 }};
}
function runtimeRules(){return JSON.parse(JSON.stringify(scenario&&scenario.rules||config(3,'vent')));}
window.mazeRuntimeRules=runtimeRules;
function shuffle(a,random){random=random||Math.random;for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),v=a[i];a[i]=a[j];a[j]=v;}return a;}
// Exit remains locked until all gates are complete. Exclude cells cut off by it.
function spawnCandidates(map){
 var anchor=map.gatePoints[0],seen=new Set([String(anchor)]),queue=[anchor];
 for(var i=0;i<queue.length;i++){var p=queue[i];[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var q=[p[0]+d[0],p[1]+d[1]],key=String(q);if(String(q)!==String(map.end)&&map.walls[q[0]]&&map.walls[q[0]][q[1]]==='0'&&!seen.has(key)){seen.add(key);queue.push(q);}});}
 return queue;
}
function publicScenario(s){return {schema:2,visibility:'observer',mapId:s.mapId,sessionId:s.sessionId,generation:s.generation,initialTime:s.initialTime,loadingAttempt:s.loadingAttempt||null,rules:JSON.parse(JSON.stringify(s.rules)),map:{walls:s.map.walls.slice(),end:s.map.end.slice(),traps:s.map.traps.map(function(p){return p.slice();}),gatePoints:s.map.gatePoints.map(function(p){return p.slice();})}};}
function generate(input){
 var rules=typeof input==='object'?config(input.tier,input.theme):config(input||1),best=null,seed=271828;var random=rules.tier===1?function(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}:Math.random;
 var target=rules.routeSteps.min+2*Math.floor(random()*((rules.routeSteps.max-rules.routeSteps.min)/2+1));
 for(var attempt=0;attempt<24;attempt++){
  var rows=rules.rows,cols=rules.cols,w=Array.from({length:rows},function(){return Array(cols).fill('1');}),stack=[[1,1]],parents={'1,1':null},farthest=[1,1],depth={'1,1':0};w[1][1]='0';
  while(stack.length){var p=stack[stack.length-1],next=[[2,0],[-2,0],[0,2],[0,-2]].map(function(d){return[p[0]+d[0],p[1]+d[1]];}).filter(function(q){return q[0]>0&&q[0]<rows-1&&q[1]>0&&q[1]<cols-1&&w[q[0]][q[1]]==='1';});if(!next.length){stack.pop();continue;}var q=next[Math.floor(random()*next.length)];w[(p[0]+q[0])/2][(p[1]+q[1])/2]='0';w[q[0]][q[1]]='0';parents[q]=p;depth[q]=depth[p]+1;if(depth[q]>depth[farthest])farthest=q;stack.push(q);}
  var chain=[],at=farthest;while(at){chain.unshift(at);at=parents[at];}var path=[];chain.forEach(function(p,i){if(i){var prev=chain[i-1];path.push([(prev[0]+p[0])/2,(prev[1]+p[1])/2].join(','));}path.push(p.join(','));});
  if(!best||path.length>best.path.length)best={w:w,path:path};if(path.length>target)break;
 }
 var path=best.path.slice(0,target+1),safe=new Set(path),branches=[];
 best.w.forEach(function(row,r){row.forEach(function(v,c){if(v==='0'&&!safe.has(r+','+c))branches.push([r,c]);});});shuffle(branches,random);
 var map={walls:best.w.map(function(row){return row.join('');}),end:path[path.length-1].split(',').map(Number),traps:branches.slice(0,rules.trapCount),path:[path],gatePoints:rules.gateFractions.map(function(f){return path[Math.floor((path.length-1)*f)].split(',').map(Number);})};var candidates=spawnCandidates(map);map.start=candidates[Math.floor(Math.random()*candidates.length)].slice();return map;
}
function valid(s){
 if(!s||s.schema!==2||!['host','observer'].includes(s.visibility)||typeof s.mapId!=='string'||typeof s.sessionId!=='string'||!s.map||!s.rules)return false;
 var rules=s.rules,m=s.map,expected=config(rules.tier,rules.theme);
 if(!Number.isInteger(rules.tier)||rules.tier<1||rules.tier>5||!['vent','mountain'].includes(rules.theme))return false;
 if(Object.keys(rules).some(function(k){return !Object.prototype.hasOwnProperty.call(expected,k);}))return false;
 for(var key of Object.keys(expected))if(JSON.stringify(rules[key])!==JSON.stringify(expected[key]))return false;
 if(s.visibility==='observer'){
  if(Object.keys(s).some(function(k){return !['schema','visibility','mapId','sessionId','generation','initialTime','loadingAttempt','rules','map'].includes(k);}))return false;
  if(Object.keys(m).some(function(k){return !['walls','end','traps','gatePoints'].includes(k);}))return false;
 }
 if(!Array.isArray(m.walls)||m.walls.length!==rules.rows||m.walls.some(function(r){return typeof r!=='string'||r.length!==rules.cols||!/^[01]+$/.test(r);}))return false;
 var walk=function(p){return Array.isArray(p)&&p.length===2&&Number.isInteger(p[0])&&Number.isInteger(p[1])&&m.walls[p[0]]&&m.walls[p[0]][p[1]]==='0';};
 if(!walk(m.end)||!Array.isArray(m.traps)||m.traps.length!==rules.trapCount||!m.traps.every(walk)||!Array.isArray(m.gatePoints)||m.gatePoints.length!==rules.gateCount||!m.gatePoints.every(walk))return false;
 var gates=new Set(m.gatePoints.map(String)),traps=new Set(m.traps.map(String));if(gates.size!==rules.gateCount||traps.size!==rules.trapCount||gates.has(String(m.end))||traps.has(String(m.end))||m.traps.some(function(p){return gates.has(String(p));}))return false;
 var reachable=new Set(spawnCandidates(m).map(String));if(!m.gatePoints.every(function(p){return reachable.has(String(p));}))return false;
 if(s.visibility==='observer')return true;
 if(!walk(m.start)||String(m.start)===String(m.end)||!reachable.has(String(m.start))||!m.path||!Array.isArray(m.path[0])||m.path[0].length<12)return false;
 var path=m.path[0].map(function(p){return typeof p==='string'?p.split(',').map(Number):[];}),safe=new Set(m.path[0]);
 return safe.size===path.length&&m.traps.every(function(p){return !safe.has(String(p));})&&path.every(function(p,i){return walk(p)&&(!i||Math.abs(p[0]-path[i-1][0])+Math.abs(p[1]-path[i-1][1])===1);})&&String(path[path.length-1])===String(m.end)&&m.gatePoints.every(function(p,i){return String(p)===m.path[0][Math.floor((path.length-1)*rules.gateFractions[i])];});
}
window.mazeApplyScenario=function(s){if(!valid(s)||((directContext&&directContext.role||S.role)==='B'&&s.visibility!=='observer'))return false;scenario=JSON.parse(JSON.stringify(s));MAZE=Object.assign({},scenario.map);MAZE.rows=MAZE.walls.length;MAZE.cols=MAZE.walls[0].length;MAZES=[MAZE];window._mazeSeed=0;return true;};
window.mazePrepareHost=function(){
 mazeTerminal=null;mazeStartedAt=null;window._mazeGates=null;window._mazeMove=null;
 var meta=sessionMeta(),theme=meta.roomId?(meta.roomId==='room-16'?'mountain':'vent'):window._dungeon&&typeof DUNGEON!=='undefined'&&DUNGEON&&DUNGEON.roomId==='room-16'?'mountain':'vent';
 var rules=config(meta.tier||(typeof coopDifficulty==='function'?coopDifficulty().tier:1),theme),m=generate(rules),key='roomlab.maze.last.v2',previous='';try{previous=localStorage.getItem(key)||'';}catch(e){}
 if(rules.tier>1&&m.walls.join('')===previous){var max=rules.cols-1;m.walls=m.walls.map(function(r){return r.split('').reverse().join('');});m.start[1]=max-m.start[1];m.end[1]=max-m.end[1];m.traps=m.traps.map(function(p){return[p[0],max-p[1]];});m.gatePoints=m.gatePoints.map(function(p){return[p[0],max-p[1]];});m.path=[m.path[0].map(function(p){var q=p.split(',').map(Number);return q[0]+','+(max-q[1]);})];}
 try{localStorage.setItem(key,m.walls.join(''));}catch(e){}
 var id=meta.runId||meta.sessionId||Date.now().toString(36)+'-'+(++serial)+'-'+Math.random().toString(36).slice(2,9),s={schema:2,visibility:'host',mapId:id,sessionId:id,generation:serial,initialTime:meta.runId||meta.sessionId?rules.timeLimit:typeof coopTime==='function'?coopTime(PG().time):PG().time,loadingAttempt:window.RoomLoading?(RoomLoading.status().attemptId||null):null,rules:rules,map:m};window.mazeApplyScenario(s);return publicScenario(s);
};
window.mazeAcceptEnter=function(d,conn){
 if(!d||d.t!=='enter'||d.mode!=='maze')return true;
 if(!conn||!valid(d.mazeScenario)||d.mazeScenario.visibility!=='observer')return false;
 var s=d.mazeScenario,status=window.RoomLoading&&RoomLoading.status();
 if(!status||!s.loadingAttempt||status.attemptId!==s.loadingAttempt)return false;
 var seen=acceptedEntries.get(conn);if(!seen){seen=new Set();acceptedEntries.set(conn,seen);}if(seen.has(s.sessionId))return false;
 seen.add(s.sessionId);return true;
};
window.MazeMobile={config:config,rules:runtimeRules,generate:generate,validate:valid,publicScenario:publicScenario,spawnCandidates:spawnCandidates,scenario:function(){return scenario;},state:function(){if(S.mod!=='maze')return null;var status=window.RoomResults&&RoomResults.status();return mazeTerminal||(S.mod==='maze'&&status&&status.outcome?{done:true,win:status.outcome==='success',runId:status.runId}:directLive()&&document.querySelector('.mz-main')?{mode:'maze',id:scenario.sessionId,runId:scenario.sessionId,tier:scenario.rules.tier,role:S.role,done:false}:null);}};
function mountain(){return runtimeRules().theme==='mountain';}
var symbols=['○','△','□','⊕','◇','☆'];
function marker(ctx,x,y,cell,text,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x+cell/2,y+cell/2,cell*.4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffffff';ctx.font='700 '+Math.floor(cell*.6)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x+cell/2,y+cell/2+1);}
function terrain(ctx,cell,pos){ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);for(var r=0;r<MAZE.rows;r++)for(var c=0;c<MAZE.cols;c++){var visible=!pos||Math.abs(r-pos[0])+Math.abs(c-pos[1])<=1;ctx.fillStyle=!visible?'#14233c':MAZE.walls[r][c]==='1'?'#415773':'#e4eef7';ctx.fillRect(c*cell,r*cell,cell,cell);if(mountain()&&visible&&MAZE.walls[r][c]==='1'){ctx.fillStyle='#6c8794';ctx.beginPath();ctx.moveTo((c+.12)*cell,(r+.84)*cell);ctx.lineTo((c+.5)*cell,(r+.18)*cell);ctx.lineTo((c+.88)*cell,(r+.84)*cell);ctx.closePath();ctx.fill();}ctx.strokeStyle=visible?'#71869f':'#1c2e49';ctx.lineWidth=.6;ctx.strokeRect(c*cell+.5,r*cell+.5,cell-1,cell-1);}}
window.mazeDrawLocal=function(ctx,cell,pos,gates){
 var size=500; if(ctx.canvas.width!==size||ctx.canvas.height!==size){ctx.canvas.width=size;ctx.canvas.height=size;}cell=100;ctx.clearRect(0,0,size,size);
 for(var y=0;y<5;y++)for(var x=0;x<5;x++){var r=pos[0]+y-2,c=pos[1]+x-2,visible=Math.abs(y-2)+Math.abs(x-2)<=runtimeRules().visionRadius,wall=!MAZE.walls[r]||MAZE.walls[r][c]!=='0';ctx.fillStyle=!visible?'#1b3147':wall?'#4c667e':'#e7f1f8';ctx.fillRect(x*cell,y*cell,cell,cell);ctx.strokeStyle=visible?'#91aabd':'#263e54';ctx.strokeRect(x*cell+.5,y*cell+.5,cell-1,cell-1);}
 gates.forEach(function(g){if(Math.abs(g.r-pos[0])+Math.abs(g.c-pos[1])<=runtimeRules().visionRadius){ctx.fillStyle=g.open?'#087b70':'#315ce7';ctx.font='42px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(g.open?'✓':symbols[g.symbol],(g.c-pos[1]+2.5)*cell,(g.r-pos[0]+2.5)*cell);}});marker(ctx,200,200,cell,'A','#315ce7');var progress=document.getElementById('mz-progress');if(progress)progress.textContent=(mountain()?'保护点':'阀门')+' '+gates.filter(function(g){return g.open;}).length+' / '+runtimeRules().gateCount;
};
drawMazeFull=function(ctx,cell){terrain(ctx,cell,null);MAZE.gatePoints.forEach(function(p,i){marker(ctx,p[1]*cell,p[0]*cell,cell,String(i+1),'#5067ba');});var e=MAZE.end;marker(ctx,e[1]*cell,e[0]*cell,cell,'E','#12786e');MAZE.traps.forEach(function(t){var x=(t[1]+.5)*cell,y=(t[0]+.5)*cell;ctx.fillStyle='#c33e59';ctx.beginPath();ctx.moveTo(x,y-cell*.3);ctx.lineTo(x+cell*.3,y);ctx.lineTo(x,y+cell*.3);ctx.lineTo(x-cell*.3,y);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.font='bold '+Math.floor(cell*.45)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',x,y);});};
function polish(manual){
 if(observer)observer.disconnect();
 var rules=runtimeRules(),tx=rules.text,view=rules.visionRadius===2?'周围两步范围':'周围五格';
 var app=$('app'),top=app.querySelector('.topbar'),back=$('back'),count=$('count'),again=$('again'),card=app.querySelector(manual?'.manual-card':'#playarea');
 app.classList.add('maze-mobile');app.dataset.mazeRole=manual?'B':'A';app.dataset.mazeTheme=mountain()?'mountain':'';
 if(!card||!top)return;
 top.replaceChildren();if(back){back.textContent='‹';back.setAttribute('aria-label',window._dungeon?'返回地图':'返回玩法');top.append(back);}var title=document.createElement('strong');title.textContent=mountain()?'山径岔路':'通风潜行';top.append(title);var role=document.createElement('span');role.className='mz-role';role.textContent=manual?'B · 指挥':mountain()?'A · 登山':'A · 潜行';top.append(role);if(count){top.append(count);if(manual&&scenario&&Number.isFinite(scenario.initialTime))count.textContent=scenario.initialTime+'s';}
 card.classList.add('mz-main');card.querySelectorAll('h3,.mc,.taskline,.maze-tabs').forEach(function(el){el.remove();});
 var notice=document.createElement('div');notice.className='mz-notice';notice.textContent=manual?'先听 A 描述周围通道，确认位置后再指路。':'听 B 指路；点一次方向，移动一格。';card.prepend(notice);
 var stage=card.querySelector('.stage');stage.setAttribute('aria-label',manual?'本局完整地图':view+'局部视野');var caption=document.createElement('div');caption.className='mz-map-caption';caption.innerHTML=manual?'<span>E '+tx.end+(rules.trapCount?'　◆ '+tx.hazard:'　无危险区')+'</span><span>'+Array.from({length:rules.gateCount},function(_,i){return i+1;}).join(' / ')+' '+(mountain()?'保护点':'阀门')+'</span>':'<span>A 是你 · '+view+'</span><span id="mz-progress">'+(mountain()?'保护点':'阀门')+' 0 / '+rules.gateCount+'</span>';stage.after(caption);
 var controls=document.createElement('section');controls.className='mz-controls';app.append(controls);
 if(manual){controls.innerHTML='<h3>'+(mountain()?'登山手册 · 岩壁标记':'符号对照')+'</h3><div class="mz-valve-grid">'+['○　◇','△　☆','□　⊕'].map(function(symbol,i){return '<div><strong>'+symbol+'</strong><span>'+tx.options[i]+'</span></div>';}).join('')+'</div><p>'+(mountain()?'让 A 报岩壁标记，查表告诉他登山工具。':'让 A 报符号，你查表告诉他阀门名称。')+'</p>';}
 else{var dp=$('dpad'),gate=$('maze-valve');if(dp){var names={up:'↑ 上',l:'← 左',d:'↓ 下',r:'右 →'};dp.querySelectorAll('button').forEach(function(b){b.textContent=names[b.dataset.d];b.setAttribute('aria-label',names[b.dataset.d]);});controls.append(dp);}if(gate)controls.append(gate);var hint=document.createElement('p');hint.className='mz-touch-note';hint.textContent='遇到'+tx.gate+'时，下方会显示三个选项。';controls.append(hint);
  observer=new MutationObserver(function(){var open=gate&&!gate.hidden;app.dataset.mazeValve=open?'open':'';notice.textContent=open?'遇到'+tx.gate+'：先向 B 报出'+tx.clue+'。':'听 B 指路；点一次方向，移动一格。';});if(gate)observer.observe(gate,{attributes:true,attributeFilter:['hidden']});
 }
 var messages=app.querySelectorAll('#msg');messages.forEach(function(m,i){if(i)m.remove();else{m.setAttribute('aria-live','polite');caption.after(m);}});
 if(again){again.classList.add('mz-again');app.append(again);}var help=document.createElement('details');help.className='mz-help';help.innerHTML='<summary>玩法说明</summary><p>'+(manual?'你看完整地图，A 只能看'+view+'。引导 A 完成 '+rules.gateCount+' 个'+tx.gate+'后走到 E（'+tx.end+'）。':'先听 B 指路。遇到'+tx.gate+'报'+tx.clue+'，按 B 说的选。碰墙 '+(rules.penalties.wall?'−'+rules.penalties.wall+' 秒':'不扣时')+'，'+(rules.trapCount?tx.hazard+' −'+rules.penalties.trap+' 秒，':'本局无危险区，')+'选错 −'+rules.penalties.wrongGate+' 秒。')+'</p>';app.append(help);
}
var run=runMaze;runMaze=function(set){mazeTerminal=null;mazeStartedAt=performance.now();mazeContext=directContext||(window._dungeon?window._roomGameContext:null);run(set);if(runtimeRules().tier===1)(window._mazeGates||[]).forEach(function(g,i){g.symbol=i%6;});if(directContext){var scope=directContext,move=window._mazeMove;window._mazeMove=function(dr,dc){if(scope.isActive())return move(dr,dc);};document.querySelectorAll('#dpad button,[data-valve]').forEach(function(b){var click=b.onclick;b.onclick=function(e){if(scope.isActive()&&click)return click.call(this,e);};});}polish(false);if(window._dungeon&&window._netMode==='host')netSend({t:'dgT',time:S.time});};
var manual=renderManual;renderManual=function(){var result=manual.apply(this,arguments);if(S.mod==='maze')polish(true);return result;};

// Independent play uses the same host-owned map, with both players ready first.
var solo=null, soloConn=null, basePlay=renderPlay, baseHost=startHostGame, baseGuest=renderGuestUI, baseManual=renderManual;
function soloValid(){return solo&&S.mod==='maze'&&!window._dungeon&&PEER.conn===soloConn;}
function soloResult(role){if(!window.RoomResults)return;RoomResults.begin({runId:solo.id,role:role,connection:soloConn,gameId:'maze',title:'通风潜行',dungeon:null,onResult:function(r){mazeTerminal={done:true,win:r.win,runId:solo.id};solo.running=false;window._dead=true;},onContinue:function(){mazeTerminal=null;if(solo)solo.running=false;if(role==='A')soloSetup();},onExit:gobackMenu});}
function soloPrep(role){soloResult(role);var rules=runtimeRules();
 var app=$('app');app.className='maze-mobile';app.dataset.mazeRole=role;app.innerHTML='<div class="topbar"><button id="back" aria-label="返回玩法">‹</button><strong>通风潜行</strong><span class="mz-role">'+role+' · 准备</span></div><div class="mz-notice">双方准备好后开始，限时 120 秒。</div><section class="mz-controls"><h3>'+(role==='A'?'听指路，操作方向':'看地图，口头指挥')+'</h3><p>'+(role==='A'?'你只看'+(rules.visionRadius===2?'周围两步范围':'周围五格')+'。遇阀门报符号，听 B 选择颜色。':'引导 A 打开 '+rules.gateCount+' 个阀门并到出口；听现场符号，查表报颜色。')+'</p><button id="mz-ready">准备好了</button><p id="mz-wait">先读规则，再准备。</p></section>';$('back').onclick=gobackMenu;$('mz-ready').onclick=function(){if(!soloValid())return;this.disabled=true;$('mz-wait').textContent='已准备，等待同伴。';if(role==='A'){solo.a=true;soloLaunch();}else netSend({t:'mzReady',id:solo.id});};
}
function soloBMap(){
 var app=$('app');app.innerHTML='<div class="topbar"><button id="back">‹</button><span id="count" class="count">120s</span></div><div class="manual-card"><div class="stage"><canvas id="maze-map"></canvas></div><div id="msg"></div></div>';$('back').onclick=gobackMenu;var cv=$('maze-map');cv.width=MAZE.cols*32;cv.height=MAZE.rows*32;drawMazeFull(cv.getContext('2d'),32);polish(true);
}
function soloLaunch(){if(!soloValid()||solo.running||!solo.a||!solo.b)return;solo.running=true;basePlay();if($('again'))$('again').remove();netSend({t:'mzGo',id:solo.id});timers.push(setInterval(function(){if(!soloValid()||!solo.running)return;netSend({t:'mzClock',id:solo.id,time:S.time});},150));}
function soloSetup(){clearTimers();soloConn=PEER.conn;var map=window.mazePrepareHost();solo={id:map.sessionId,generation:map.generation,map:map,a:false,b:false,running:false};soloPrep('A');function offer(){if(soloValid()&&!solo.running)netSend({t:'mzOffer',scenario:solo.map});}offer();timers.push(setInterval(offer,300));soloWatch();}
function soloWatch(){if(!soloConn||soloConn._mazeWatch)return;soloConn._mazeWatch=true;soloConn.on('close',function(){if(!soloValid())return;clearTimers();window._dead=true;document.querySelectorAll('#dpad button,[data-valve],#mz-ready').forEach(function(b){b.disabled=true;});var m=$('msg')||$('mz-wait');if(m)m.textContent='同伴已断开，请返回重新连接。';});}
renderPlay=function(){if(S.mod==='maze'&&!window._dungeon)return renderHost();return basePlay.apply(this,arguments);};
renderManual=function(){if(S.mod==='maze'&&!window._dungeon)return renderJoin();return baseManual.apply(this,arguments);};
startHostGame=function(){if(S.mod==='maze'&&!window._dungeon)return soloSetup();return baseHost.apply(this,arguments);};
renderGuestUI=function(){if(S.mod!=='maze'||window._dungeon)return baseGuest.apply(this,arguments);clearTimers();soloConn=PEER.conn;solo=null;if(!soloConn._mazeListener){var bound=soloConn;soloConn._mazeListener=function(d){if(PEER.conn===bound)dgGuestOnData(d);};soloConn.on('data',soloConn._mazeListener);}soloWatch();$('app').innerHTML='<div class="msg">正在接收本局地图…</div>';};
var soloHD=dgHostOnData;dgHostOnData=function(d){if(window.RoomResults&&RoomResults.consume(d,PEER.conn))return;if(d.t==='mzReady'){if(soloValid()&&d.id===solo.id){solo.b=true;soloLaunch();}return;}return soloHD(d);};
var soloGD=dgGuestOnData;dgGuestOnData=function(d){if(window.RoomResults&&RoomResults.consume(d,PEER.conn)){var rs=RoomResults.status();if(rs&&rs.outcome&&S.mod==='maze'){mazeTerminal={done:true,win:rs.outcome==='success',runId:rs.runId};if(solo)solo.running=false;window._dead=true;}return;}
 if(d.t==='mzOffer'){if(S.mod!=='maze'||window._dungeon||!valid(d.scenario)||d.scenario.visibility!=='observer')return;if(solo&&(solo.id===d.scenario.sessionId||d.scenario.generation<=solo.generation))return;if(solo&&solo.running)return;if(!window.mazeApplyScenario(d.scenario))return;solo={id:d.scenario.sessionId,generation:d.scenario.generation,running:false};soloPrep('B');return;}
 if(/^mz(Go|Clock|Done)$/.test(d.t)){if(!soloValid()||d.id!==solo.id)return;if(d.t==='mzGo'){if(!solo.running){solo.running=true;soloBMap();}}else if(d.t==='mzClock'){var c=$('count');if(c)c.textContent=d.time+'s';}else{solo.running=false;window._dead=true;var endClock=$('count');if(endClock)endClock.textContent=d.time+'s';var m=$('msg');if(m)m.textContent=d.win?'已到出口，行动完成。':'时间耗尽，行动失败。';}return;}return soloGD(d);
};
var mazeFinish=finish;finish=function(ok){
 if(S.mod!=='maze'||!window.RoomResults)return mazeFinish.apply(this,arguments);
 if(window._netMode==='guest'||mazeTerminal)return;
 mazeTerminal={done:true,win:!!ok,runId:RoomResults.status()&&RoomResults.status().runId};window._dead=true;if(solo)solo.running=false;
 timers.forEach(function(t){clearInterval(t);clearTimeout(t);});timers=[];
 var metrics={timeLeftMs:Math.max(0,S.time)*1000,completed:(window._mazeGates||[]).filter(function(g){return g.open;}).length,goal:runtimeRules().gateCount};if(mazeStartedAt!==null)metrics.durationMs=Math.max(0,performance.now()-mazeStartedAt);
 var data={win:!!ok,reasonCode:ok?'completed':'timeout',reason:ok?runtimeRules().text.success:'时间耗尽，未能及时到达'+runtimeRules().text.end+'。',metrics:metrics};
 if(mazeContext)mazeContext.finish(data);else RoomResults.report(data);
};
function directLive(){return directContext&&directContext.isActive();}
function directShell(manual){
 var app=$('app');app.className='';app.innerHTML='<div class="topbar"><button id="back">‹</button><span id="count" class="count">'+scenario.initialTime+'s</span></div>'+(manual?'<div class="manual-card"><div class="stage"><canvas id="maze-map"></canvas></div><div id="msg"></div></div>':'<div id="playarea" class="panel"><div id="stage" class="stage"></div><div id="msg"></div><div class="dpad" id="dpad"><button data-d="up">上</button><button data-d="l">左</button><button data-d="d">下</button><button data-d="r">右</button></div></div>');
 if(manual){var cv=$('maze-map');cv.width=MAZE.cols*32;cv.height=MAZE.rows*32;drawMazeFull(cv.getContext('2d'),32);polish(true);}else{S.time=scenario.initialTime;runMaze();}
 $('back').onclick=function(){if(directLive())directContext.abort();};
}
function directPacket(d){
 if(!directLive()||!d||d.id!==(directContext.runId||directContext.sessionId))return false;
 if(d.t==='m5Offer'&&directContext.role==='B'){
  if(directSeen!==d.id){if(!d.scenario||d.scenario.sessionId!==d.id||d.scenario.mapId!==d.id||!d.scenario.rules||d.scenario.rules.tier!==directContext.tier||d.scenario.rules.theme!==(directContext.roomId==='room-16'?'mountain':'vent')||!window.mazeApplyScenario(d.scenario))return true;directSeen=d.id;directShell(true);}
  directContext.send({t:'m5Ready',id:d.id});return true;
 }
 if(d.t==='m5Ready'&&directContext.role==='A'){if(!directRunning){directRunning=true;directShell(false);}return true;}
 if(d.t==='m5Clock'&&directContext.role==='B'){if($('count'))$('count').textContent=d.time+'s';return true;}return false;
}
function directStart(role,ctx){
 clearTimers();directContext=ctx;directRunning=false;directSeen=null;mazeTerminal=null;S.mod='maze';S.role=role;window._dead=false;
 if(role==='A'){var sc=mazePrepareHost(),last=performance.now();$('app').innerHTML='<div class="msg">等待同伴接收地图…</div>';var tick=setInterval(function(){if(!directLive()){clearInterval(tick);return;}if(!directRunning){last=performance.now();ctx.send({t:'m5Offer',id:sc.sessionId,scenario:sc});return;}if(mazeTerminal){clearInterval(tick);return;}var now=performance.now(),seconds=Math.floor((now-last)/1000);if(seconds){last+=seconds*1000;S.time=Math.max(0,S.time-seconds);if($('count'))$('count').textContent=S.time+'s';}ctx.send({t:'m5Clock',id:sc.sessionId,time:S.time});if(S.time<=0)finish(false);},150);timers.push(tick);}
 else $('app').innerHTML='<div class="msg">正在接收本局地图…</div>';
}
var directHD=dgHostOnData;dgHostOnData=function(d){if(directPacket(d))return;return directHD.apply(this,arguments);};
var directGD=dgGuestOnData;dgGuestOnData=function(d){if(directPacket(d))return;return directGD.apply(this,arguments);};
var directClear=clearTimers;clearTimers=function(){if(directContext){window._dead=true;window._mazeMove=null;directContext=null;directRunning=false;directSeen=null;mazeTerminal=null;mazeContext=null;if(observer)observer.disconnect();}return directClear.apply(this,arguments);};
window.RoomGameAdapters=window.RoomGameAdapters||{};RoomGameAdapters.maze={host:function(ctx){directStart('A',ctx);},guest:function(ctx){directStart('B',ctx);}};
var mazeSend=netSend;netSend=function(d){if(d&&d.mazeScenario){d=Object.assign({},d,{mazeScenario:publicScenario(d.mazeScenario)});}if(d&&['mzOffer','m5Offer'].includes(d.t)&&d.scenario){d=Object.assign({},d,{scenario:publicScenario(d.scenario)});}return mazeSend(d);};
var shellObserver=new MutationObserver(function(){var app=$('app');if(app&&app.classList.contains('maze-mobile')&&!app.querySelector('.mz-main,.mz-controls')){app.classList.remove('maze-mobile');delete app.dataset.mazeRole;delete app.dataset.mazeValve;delete app.dataset.mazeTheme;}});shellObserver.observe($('app'),{childList:true});
})();


