(function(){
'use strict';
var observer=null;
var scenario=null, serial=0, acceptedEntries=new WeakMap();
function generate(){
 var best=null;
 for(var attempt=0;attempt<8;attempt++){
  var rows=15,cols=11,w=Array.from({length:rows},function(){return Array(cols).fill('1');}),stack=[[1,1]],parents={'1,1':null},farthest=[1,1],depth={'1,1':0};w[1][1]='0';
  while(stack.length){var p=stack[stack.length-1],next=[[2,0],[-2,0],[0,2],[0,-2]].map(function(d){return[p[0]+d[0],p[1]+d[1]];}).filter(function(q){return q[0]>0&&q[0]<rows-1&&q[1]>0&&q[1]<cols-1&&w[q[0]][q[1]]==='1';});if(!next.length){stack.pop();continue;}var q=next[Math.floor(Math.random()*next.length)];w[(p[0]+q[0])/2][(p[1]+q[1])/2]='0';w[q[0]][q[1]]='0';parents[q]=p;depth[q]=depth[p]+1;if(depth[q]>depth[farthest])farthest=q;stack.push(q);}
  var chain=[],at=farthest;while(at){chain.unshift(at);at=parents[at];}var path=[];chain.forEach(function(p,i){if(i){var prev=chain[i-1];path.push([(prev[0]+p[0])/2,(prev[1]+p[1])/2].join(','));}path.push(p.join(','));});
  var safe=new Set(path),branches=[];w.forEach(function(row,r){row.forEach(function(v,c){if(v==='0'&&!safe.has(r+','+c))branches.push([r,c]);});});branches.sort(function(){return Math.random()-.5;});
  var map={walls:w.map(function(row){return row.join('');}),start:[1,1],end:farthest,traps:branches.slice(0,2),path:[path]};if(!best||path.length>best.path[0].length)best=map;if(path.length>=39)break;
 }
 return best;
}
function valid(s){if(!s||s.schema!==1||typeof s.mapId!=='string'||typeof s.sessionId!=='string'||!s.map)return false;var m=s.map;if(!Array.isArray(m.walls)||m.walls.length!==15||m.walls.some(function(r){return typeof r!=='string'||!/^[01]{11}$/.test(r);}))return false;var walk=function(p){return Array.isArray(p)&&p.length===2&&Number.isInteger(p[0])&&Number.isInteger(p[1])&&m.walls[p[0]]&&m.walls[p[0]][p[1]]==='0';};if(!walk(m.start)||!walk(m.end)||!Array.isArray(m.traps)||!m.traps.every(walk)||!m.path||!Array.isArray(m.path[0])||m.path[0].length<12)return false;var path=m.path[0].map(function(p){return typeof p==='string'?p.split(',').map(Number):[];});return path.every(function(p,i){return walk(p)&&(!i||Math.abs(p[0]-path[i-1][0])+Math.abs(p[1]-path[i-1][1])===1);})&&String(path[0])===String(m.start)&&String(path[path.length-1])===String(m.end);}
window.mazeApplyScenario=function(s){if(!valid(s))return false;scenario=JSON.parse(JSON.stringify(s));MAZE=scenario.map;MAZE.rows=15;MAZE.cols=11;MAZES=[MAZE];window._mazeSeed=0;return true;};
window.mazePrepareHost=function(){window._mazeGates=null;window._mazeMove=null;var m=generate(),key='roomlab.maze.last.v1',previous='';try{previous=localStorage.getItem(key)||'';}catch(e){}if(m.walls.join('')===previous){m.walls=m.walls.map(function(r){return r.split('').reverse().join('');});m.start[1]=10-m.start[1];m.end[1]=10-m.end[1];m.traps=m.traps.map(function(p){return[p[0],10-p[1]];});m.path=[m.path[0].map(function(p){var q=p.split(',').map(Number);return q[0]+','+(10-q[1]);})];}try{localStorage.setItem(key,m.walls.join(''));}catch(e){}var id=Date.now().toString(36)+'-'+(++serial)+'-'+Math.random().toString(36).slice(2,9);var s={schema:1,mapId:id,sessionId:id,generation:serial,initialTime:typeof coopTime==='function'?coopTime(PG().time):PG().time,loadingAttempt:window.RoomLoading?RoomLoading.status().attemptId:null,map:m};window.mazeApplyScenario(s);return s;};
window.mazeAcceptEnter=function(d,conn){
 if(!d||d.t!=='enter'||d.mode!=='maze')return true;
 if(!conn||!valid(d.mazeScenario))return false;
 var s=d.mazeScenario,status=window.RoomLoading&&RoomLoading.status();
 if(!status||!s.loadingAttempt||status.attemptId!==s.loadingAttempt)return false;
 var seen=acceptedEntries.get(conn);if(!seen){seen=new Set();acceptedEntries.set(conn,seen);}if(seen.has(s.sessionId))return false;
 seen.add(s.sessionId);return true;
};
window.MazeMobile={generate:generate,validate:valid,scenario:function(){return scenario;}};
function mountain(){return !!(window._dungeon&&typeof DUNGEON!=='undefined'&&DUNGEON&&DUNGEON.roomId==='room-16');}
var symbols=['○','△','□','⊕','◇','☆'];
function marker(ctx,x,y,cell,text,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x+cell/2,y+cell/2,cell*.4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffffff';ctx.font='700 '+Math.floor(cell*.6)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x+cell/2,y+cell/2+1);}
function terrain(ctx,cell,pos){ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);for(var r=0;r<MAZE.rows;r++)for(var c=0;c<MAZE.cols;c++){var visible=!pos||Math.abs(r-pos[0])+Math.abs(c-pos[1])<=1;ctx.fillStyle=!visible?'#14233c':MAZE.walls[r][c]==='1'?'#415773':'#e4eef7';ctx.fillRect(c*cell,r*cell,cell,cell);if(mountain()&&visible&&MAZE.walls[r][c]==='1'){ctx.fillStyle='#6c8794';ctx.beginPath();ctx.moveTo((c+.12)*cell,(r+.84)*cell);ctx.lineTo((c+.5)*cell,(r+.18)*cell);ctx.lineTo((c+.88)*cell,(r+.84)*cell);ctx.closePath();ctx.fill();}ctx.strokeStyle=visible?'#71869f':'#1c2e49';ctx.lineWidth=.6;ctx.strokeRect(c*cell+.5,r*cell+.5,cell-1,cell-1);}}
window.mazeDrawLocal=function(ctx,cell,pos,gates){
 var size=500; if(ctx.canvas.width!==size||ctx.canvas.height!==size){ctx.canvas.width=size;ctx.canvas.height=size;}cell=100;ctx.clearRect(0,0,size,size);
 for(var y=0;y<5;y++)for(var x=0;x<5;x++){var r=pos[0]+y-2,c=pos[1]+x-2,visible=Math.abs(y-2)+Math.abs(x-2)<=1,wall=!MAZE.walls[r]||MAZE.walls[r][c]!=='0';ctx.fillStyle=!visible?'#1b3147':wall?'#4c667e':'#e7f1f8';ctx.fillRect(x*cell,y*cell,cell,cell);ctx.strokeStyle=visible?'#91aabd':'#263e54';ctx.strokeRect(x*cell+.5,y*cell+.5,cell-1,cell-1);}
 gates.forEach(function(g){if(Math.abs(g.r-pos[0])+Math.abs(g.c-pos[1])<=1){ctx.fillStyle=g.open?'#087b70':'#315ce7';ctx.font='42px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(g.open?'✓':symbols[g.symbol],(g.c-pos[1]+2.5)*cell,(g.r-pos[0]+2.5)*cell);}});marker(ctx,200,200,cell,'A','#315ce7');var progress=document.getElementById('mz-progress');if(progress)progress.textContent='阀门 '+gates.filter(function(g){return g.open;}).length+' / 3';
};
drawMazeFull=function(ctx,cell){terrain(ctx,cell,null);[.25,.5,.75].forEach(function(f,i){var p=MAZE.path[0][Math.floor((MAZE.path[0].length-1)*f)].split(',').map(Number);marker(ctx,p[1]*cell,p[0]*cell,cell,String(i+1),'#5067ba');});var a=MAZE.start,e=MAZE.end;marker(ctx,a[1]*cell,a[0]*cell,cell,'S','#2461dc');marker(ctx,e[1]*cell,e[0]*cell,cell,'E','#12786e');MAZE.traps.forEach(function(t){var x=(t[1]+.5)*cell,y=(t[0]+.5)*cell;ctx.fillStyle='#c33e59';ctx.beginPath();ctx.moveTo(x,y-cell*.3);ctx.lineTo(x+cell*.3,y);ctx.lineTo(x,y+cell*.3);ctx.lineTo(x-cell*.3,y);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.font='bold '+Math.floor(cell*.45)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',x,y);});};
function polish(manual){
 if(observer)observer.disconnect();
 var app=$('app'),top=app.querySelector('.topbar'),back=$('back'),count=$('count'),again=$('again'),card=app.querySelector(manual?'.manual-card':'#playarea');
 app.classList.add('maze-mobile');app.dataset.mazeRole=manual?'B':'A';app.dataset.mazeTheme=mountain()?'mountain':'';
 if(!card||!top)return;
 top.replaceChildren();if(back){back.textContent='‹';back.setAttribute('aria-label',window._dungeon?'返回地图':'返回玩法');top.append(back);}var title=document.createElement('strong');title.textContent=mountain()?'山径岔路':'通风潜行';top.append(title);var role=document.createElement('span');role.className='mz-role';role.textContent=manual?'B · 指挥':'A · 潜行';top.append(role);if(count){top.append(count);if(manual&&scenario&&Number.isFinite(scenario.initialTime))count.textContent=scenario.initialTime+'s';}
 card.classList.add('mz-main');card.querySelectorAll('h3,.mc,.taskline,.maze-tabs').forEach(function(el){el.remove();});
 var notice=document.createElement('div');notice.className='mz-notice';notice.textContent=manual?'听 A 报位置与符号，再告诉他怎么走。':'听 B 指路；点一次方向，移动一格。';card.prepend(notice);
 var stage=card.querySelector('.stage');stage.setAttribute('aria-label',manual?'本局完整地图':'周围五格局部视野');var caption=document.createElement('div');caption.className='mz-map-caption';caption.innerHTML=manual?'<span>S 起点　E 出口　◆ 陷阱</span><span>1 / 2 / 3 阀门</span>':'<span>A 是你 · 只看得到周围五格</span><span id="mz-progress">阀门 0 / 3</span>';stage.after(caption);
 var controls=document.createElement('section');controls.className='mz-controls';app.append(controls);
 if(manual){controls.innerHTML='<h3>符号对照</h3><div class="mz-valve-grid"><div><strong>○　◇</strong><span>蓝阀</span></div><div><strong>△　☆</strong><span>橙阀</span></div><div><strong>□　⊕</strong><span>绿阀</span></div></div><p>让 A 报符号，你查表告诉他阀门名称。</p>';}
 else{var dp=$('dpad'),gate=$('maze-valve');if(dp){var names={up:'↑ 上',l:'← 左',d:'↓ 下',r:'右 →'};dp.querySelectorAll('button').forEach(function(b){b.textContent=names[b.dataset.d];b.setAttribute('aria-label',names[b.dataset.d]);});controls.append(dp);}if(gate)controls.append(gate);var hint=document.createElement('p');hint.className='mz-touch-note';hint.textContent='遇到阀门时，下方会显示三个选项。';controls.append(hint);
  observer=new MutationObserver(function(){var open=gate&&!gate.hidden;app.dataset.mazeValve=open?'open':'';notice.textContent=open?'遇到阀门：先向 B 报出现场符号。':'听 B 指路；点一次方向，移动一格。';});if(gate)observer.observe(gate,{attributes:true,attributeFilter:['hidden']});
 }
 var messages=app.querySelectorAll('#msg');messages.forEach(function(m,i){if(i)m.remove();else{m.setAttribute('aria-live','polite');caption.after(m);}});
 if(again){again.classList.add('mz-again');app.append(again);}var help=document.createElement('details');help.className='mz-help';help.innerHTML='<summary>玩法说明</summary><p>'+(manual?'你看完整地图，A 只能看周围五格。引导 A 打开三个阀门后走到 E；◆ 是陷阱。':'先听 B 指路。遇到阀门报符号，按 B 说的选。碰墙 −5 秒，陷阱 −8 秒，选错 −4 秒。')+'</p>';app.append(help);
}
var run=runMaze;runMaze=function(set){run(set);polish(false);if(window._dungeon&&window._netMode==='host')netSend({t:'dgT',time:S.time});};
var manual=renderManual;renderManual=function(){var result=manual.apply(this,arguments);if(S.mod==='maze')polish(true);return result;};

// Independent play uses the same host-owned map, with both players ready first.
var solo=null, soloConn=null, basePlay=renderPlay, baseHost=startHostGame, baseGuest=renderGuestUI, baseManual=renderManual;
function soloValid(){return solo&&S.mod==='maze'&&!window._dungeon&&PEER.conn===soloConn;}
function soloPrep(role){
 var app=$('app');app.className='maze-mobile';app.dataset.mazeRole=role;app.innerHTML='<div class="topbar"><button id="back" aria-label="返回玩法">‹</button><strong>通风潜行</strong><span class="mz-role">'+role+' · 准备</span></div><div class="mz-notice">双方准备好后开始，限时 120 秒。</div><section class="mz-controls"><h3>'+(role==='A'?'听指路，操作方向':'看地图，口头指挥')+'</h3><p>'+(role==='A'?'你只看周围五格。遇阀门报符号，听 B 选择颜色。':'引导 A 打开三个阀门并到出口；听现场符号，查表报颜色。')+'</p><button id="mz-ready">准备好了</button><p id="mz-wait">先读规则，再准备。</p></section>';$('back').onclick=gobackMenu;$('mz-ready').onclick=function(){if(!soloValid())return;this.disabled=true;$('mz-wait').textContent='已准备，等待同伴。';if(role==='A'){solo.a=true;soloLaunch();}else netSend({t:'mzReady',id:solo.id});};
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
var soloHD=dgHostOnData;dgHostOnData=function(d){if(d.t==='mzReady'){if(soloValid()&&d.id===solo.id){solo.b=true;soloLaunch();}return;}return soloHD(d);};
var soloGD=dgGuestOnData;dgGuestOnData=function(d){
 if(d.t==='mzOffer'){if(S.mod!=='maze'||window._dungeon||!valid(d.scenario))return;if(solo&&(solo.id===d.scenario.sessionId||d.scenario.generation<=solo.generation))return;if(solo&&solo.running)return;window.mazeApplyScenario(d.scenario);solo={id:d.scenario.sessionId,generation:d.scenario.generation,running:false};soloPrep('B');return;}
 if(/^mz(Go|Clock|Done)$/.test(d.t)){if(!soloValid()||d.id!==solo.id)return;if(d.t==='mzGo'){if(!solo.running){solo.running=true;soloBMap();}}else if(d.t==='mzClock'){var c=$('count');if(c)c.textContent=d.time+'s';}else{solo.running=false;window._dead=true;var endClock=$('count');if(endClock)endClock.textContent=d.time+'s';var m=$('msg');if(m)m.textContent=d.win?'已到出口，行动完成。':'时间耗尽，行动失败。';}return;}return soloGD(d);
};
var mazeFinish=finish;finish=function(ok){if(S.mod==='maze'&&soloValid()&&window._netMode==='host'&&solo.running){solo.running=false;netSend({t:'mzDone',id:solo.id,win:!!ok,time:S.time});}return mazeFinish.apply(this,arguments);};
var shellObserver=new MutationObserver(function(){var app=$('app');if(app&&app.classList.contains('maze-mobile')&&!app.querySelector('.mz-main,.mz-controls')){app.classList.remove('maze-mobile');delete app.dataset.mazeRole;delete app.dataset.mazeValve;delete app.dataset.mazeTheme;}});shellObserver.observe($('app'),{childList:true});
})();
