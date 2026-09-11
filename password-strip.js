/* Password strips: shared horizontal picture slices, untimed cooperative puzzle. */
(function(){
'use strict';
var MODE='pwslide',PROTO='password-slices/2',session=null,view=null,selected=0,drawKey='',swipe=null;
function other(w){return w==='A'?'B':'A';}
function copy(x){return JSON.parse(JSON.stringify(x));}
function uid(){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
var LIMIT=64,STEP=4;
var previousPuzzle={};try{previousPuzzle=JSON.parse(sessionStorage.getItem('roomlab-password-recent-v2'))||{};}catch(_){}
var initBalanceMaxShare=.68;
function balancedRows(rows,cap){if(rows.length!==6||cap===1)return rows;var best=null,bestChanges=7;
 // Keep the first A slice fixed: repartition the same offsets before drawing new ones.
 for(var j=1;j<5;j++)for(var k=j+1;k<6;k++){var own=[0,j,k],other=[1,2,3,4,5].filter(function(i){return own.indexOf(i)<0;}),a=own.map(function(i){return rows[i].offset;}),b=other.map(function(i){return rows[i].offset;});if(new Set(a).size<2||new Set(b).size<2)continue;var ok=true;
  // Absolute-distance ratios attain extrema at endpoints or existing offsets; all lie on this grid.
  for(var target=-44;target<=44;target+=STEP){var ca=a.reduce(function(n,x){return n+Math.abs(x-target);},0),cb=b.reduce(function(n,x){return n+Math.abs(x-target);},0);if(!ca||!cb||Math.max(ca,cb)/(ca+cb)>cap){ok=false;break;}}
  if(ok){var changes=own.filter(function(i){return i%2;}).length;if(changes<bestChanges){bestChanges=changes;var ai=0,bi=0;best=rows.map(function(r,i){return {owner:r.owner,offset:i%2?b[bi++]:a[ai++]};});}}
 }return best;}
function setup(s){var signature,tries=0,rows;do{tries++;var digits=s.round===0?'1234':Array.from({length:10},function(_,i){return String(i);}).sort(function(){return Math.random()-.5;}).slice(0,4).join('');rows=Array.from({length:s.round===0?6:8},function(_,i){return {owner:i%2?'B':'A',offset:(Math.random()<.5?-1:1)*(4+Math.floor(Math.random()*8))*STEP};});rows=balancedRows(rows,s.initBalanceMaxShare);
 // Bounded fallback with equal per-role distance to every target; still at least two offsets each.
 if(tries>=64){var base=[-32,16,40];if(previousPuzzle[s.round]==='1234:-32,16,16,40,40,-32')base=base.map(function(x){return -x;});rows=[base[0],base[1],base[1],base[2],base[2],base[0]].map(function(x,i){return {owner:i%2?'B':'A',offset:x};});}
 if(!rows)continue;s.picture=digits;s.rows=rows;signature=digits+':'+rows.map(function(r){return r.offset;}).join(',');
 }while(!rows||signature===previousPuzzle[s.round]||['A','B'].some(function(w){return new Set(rows.filter(function(r){return r.owner===w;}).map(function(r){return r.offset;})).size<2;}));previousPuzzle[s.round]=signature;try{sessionStorage.setItem('roomlab-password-recent-v2',JSON.stringify(previousPuzzle));}catch(_){}s.confirmed={A:false,B:false};s.ready={A:false,B:false};}
function create(ctx){var start=ctx&&!ctx.tutorial?1:0,s={initBalanceMaxShare:ctx&&ctx.playtest&&Number.isFinite(ctx.playtest.initBalanceMaxShare)&&ctx.playtest.initBalanceMaxShare>=.5&&ctx.playtest.initBalanceMaxShare<=1?ctx.playtest.initBalanceMaxShare:initBalanceMaxShare,startRound:start,endRound:ctx?start:1,id:uid(),round:start,phase:'ready',win:false,remaining:start?4:5,maxMistakes:start?4:5,seq:{A:0,B:0},again:{A:false,B:false},notice:''};setup(s);return s;}
function aligned(rows){return Math.abs(rows[0].offset)<=44&&rows.every(function(r){return r.offset===rows[0].offset;});}
function input(s,d,w){
 if(!s||!['A','B'].includes(w)||!d||d.id!==s.id||d.round!==s.round||!Number.isSafeInteger(d.seq)||d.seq<=s.seq[w])return false;
 if(!['ready','move','confirm','again'].includes(d.kind))return false;
 if(d.kind==='move'&&(!Number.isInteger(d.index)||!s.rows[d.index]||s.rows[d.index].owner!==w||!Number.isInteger(d.offset)||Math.abs(d.offset)>LIMIT))return false;
 if(d.kind==='ready'&&(s.phase==='ready'||s.phase==='between')){s.seq[w]=d.seq;s.ready[w]=true;if(s.ready.A&&s.ready.B){if(s.phase==='between'){s.round++;setup(s);}s.phase='play';s.notice='';}return true;}
 if(d.kind==='again'&&s.phase==='done'){s.seq[w]=d.seq;s.again[w]=true;return true;}
 if(s.phase!=='play')return false;s.seq[w]=d.seq;
 if(d.kind==='move'){if(s.rows[d.index].offset!==d.offset){s.rows[d.index].offset=d.offset;s.lastWrongAt=0;s.confirmed={A:false,B:false};s.notice='';}return true;}
 if(d.kind==='confirm'){if(!aligned(s.rows)){var signature=s.rows.map(function(r){return r.offset;}).join(',');if(s.lastWrong===signature&&Date.now()-s.lastWrongAt<500)return false;s.lastWrong=signature;s.lastWrongAt=Date.now();s.remaining=Math.max(0,s.remaining-1);s.notice='切口还没接齐，剩余 '+s.remaining+' 次机会。';if(!s.remaining){s.phase='done';s.win=false;s.notice='本局机会用尽。重新开局再试一次。';}return false;}s.confirmed[w]=true;s.notice='已确认，等待同伴确认。';if(s.confirmed.A&&s.confirmed.B){s.phase=s.round<s.endRound?'between':'done';s.win=s.phase==='done';s.ready={A:false,B:false};}return true;}return false;
}
function snapshot(s,w){return {win:s.win,remaining:s.remaining,maxMistakes:s.maxMistakes,startRound:s.startRound,endRound:s.endRound,id:s.id,round:s.round,phase:s.phase,ready:copy(s.ready),again:copy(s.again),confirmed:copy(s.confirmed),notice:s.notice,picture:s.picture,rows:copy(s.rows),ack:copy(s.seq)};}
function stop(){var q=session;if(q&&!q.ctx&&window.RoomResults&&RoomResults.status()&&RoomResults.status().runId===q.resultRun)RoomResults.close();session=null;view=null;drawKey='';swipe=null;if(q){q.stopped=true;clearInterval(q.timer);clearTimeout(q.timeout);clearTimeout(q.finishTimer);q.clean.forEach(function(fn){fn();});}}
function packet(d){var q=session;if(q&&q.conn&&q.conn.open)q.conn.send(d);}
function fail(text){var q=session;if(!q||q.failed)return;q.failed=true;clearInterval(q.timer);clearTimeout(q.timeout);swipe=null;var el=document.getElementById('ps-status');if(el)el.textContent=text;document.querySelectorAll('.ps-shell button:not(#ps-back)').forEach(function(b){b.disabled=true;});}
function emit(kind,extra){var q=session;if(!q||q.failed||!view||(q.ctx&&!q.ctx.isActive()))return;var d=Object.assign({t:q.ctx?'psRoomInput':'psInput',proto:PROTO,roomSession:q.ctx?q.ctx.sessionId:null,id:view.id,round:view.round,seq:++q.seq,kind:kind},extra||{});if(q.role==='A'){input(q.state,d,'A');publish();}else packet(d);}
function resultData(s){return {win:s.win,reasonCode:s.win?'completed':'attempts_exhausted',reason:s.win?'':'本局确认机会已用尽。',metrics:{completed:s.round-s.startRound+(s.win?1:0),goal:s.endRound-s.startRound+1,mistakesRemaining:s.remaining,maxMistakes:s.maxMistakes}};}
function resultBegin(q,s){if(q.ctx||!window.RoomResults||q.resultRun===s.id)return;q.resultRun=s.id;RoomResults.begin({runId:s.id,role:q.role,connection:q.conn,gameId:MODE,title:'密码推条',dungeon:null,onContinue:function(){if(session!==q)return;if(q.role==='A'){q.state=create();q.seq=0;selected=0;q.settled=false;publish();}},onExit:function(){clearTimers();closePeer();S.role=null;choose();}});}
function publish(){var q=session;if(!q||q.failed||!q.state||(q.ctx&&!q.ctx.isActive()))return;if(!q.ctx&&q.state.phase==='done'&&q.state.again.A&&q.state.again.B){q.state=create();q.seq=0;selected=0;}view=snapshot(q.state,'A');resultBegin(q,view);draw();packet({t:q.ctx?'psRoomState':'psState',proto:PROTO,roomSession:q.ctx?q.ctx.sessionId:null,match:q.match,frame:++q.frame,state:snapshot(q.state,'B')});if(q.state.phase==='done'&&!q.settled){q.settled=true;if(q.ctx)q.ctx.finish(resultData(q.state));else if(window.RoomResults)RoomResults.report(resultData(q.state));}}
function btn(id,label,disabled){return '<button id="'+id+'"'+(disabled?' disabled':'')+'>'+label+'</button>';}
function exitTheme(){return !!(session&&session.ctx&&session.ctx.roomId==='room-13');}
function roundLabel(s){return (s.round-s.startRound+1)+' / '+(s.endRound-s.startRound+1);}
function icon(){if(exitTheme())return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 58V6h40v52" fill="#e7d9bd" stroke="currentColor" stroke-width="3"/><rect x="21" y="18" width="23" height="15" rx="3" fill="#fff7df" stroke="currentColor" stroke-width="2"/><path d="M28 19v13m8-13v13M41 44h6" stroke="currentColor" stroke-width="2"/></svg>';return '<svg viewBox="0 0 64 48" aria-hidden="true"><rect x="12" y="8" width="40" height="32" rx="6" fill="#fff4d6" stroke="currentColor" stroke-width="2"/><path d="M20 18h24v12H20zM3 24h12m-8-5-5 5 5 5m54-5H49m8-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M28 18v12m8-12v12" stroke="currentColor" stroke-width="2"/></svg>';}
function scaffold(role){var app=document.getElementById('app');app.innerHTML='<main class="ps-shell"><header class="ps-header">'+btn('ps-back','‹')+'<h1>密码推条</h1><span class="ps-role">'+(role?'角色 '+role:'双人解谜')+'</span></header><div id="ps-body"></div><p id="ps-status" class="ps-status" role="status" aria-live="polite"></p></main>';document.getElementById('ps-back').setAttribute('aria-label','退出密码推条');document.getElementById('ps-back').onclick=function(){clearTimers();closePeer();location.search='';};}
function mine(s,w){return s.rows.map(function(r,i){return r.owner===w?i:-1;}).filter(function(i){return i>=0;});}
function board(s){var count=s.rows.length;
 // Each row displays a non-overlapping vertical interval of the SAME glyph image.
 var defs='<svg class="ps-source" aria-hidden="true" width="0" height="0"><defs><g id="ps-glyphs"><text x="180" y="130" text-anchor="middle" textLength="270" lengthAdjust="spacingAndGlyphs" font-family="Arial, sans-serif" font-weight="700" font-size="128" fill="#929292">'+s.picture+'</text></g></defs></svg>';
 return defs+'<div class="ps-board" aria-label="同一幅密码横切成 '+count+' 条，左右拖动自己的条片">'+s.rows.map(function(r,i){return '<div class="ps-slice" style="aspect-ratio:360/'+(96/count)+'" data-ps-row="'+i+'" data-owner="'+r.owner+'"><span class="ps-row-label" aria-hidden="true">'+(i+1)+'</span><svg viewBox="0 '+(36+i*96/count)+' 360 '+(96/count)+'" preserveAspectRatio="none" aria-hidden="true"><g class="ps-band" data-ps-band="'+i+'" transform="translate('+r.offset+' 0)"><use href="#ps-glyphs"/></g></svg></div>';}).join('')+'</div>';
}
function renderOffset(i,value){var g=document.querySelector('[data-ps-band="'+i+'"]');if(g)g.setAttribute('transform','translate('+value+' 0)');}
function draw(){var q=session;if(!q||q.failed||!view)return;var s=view,w=q.role,body=document.getElementById('ps-body');if(!body)return;if(s.phase==='done'&&window.RoomResults){swipe=null;document.querySelectorAll('.ps-shell button:not(#ps-back)').forEach(function(b){b.disabled=true;});return;}var structure=s.id+':'+s.round+':'+s.phase;
 if(!s.rows[selected]||s.rows[selected].owner!==w)selected=mine(s,w)[0];
 if(drawKey!==structure){drawKey=structure;swipe=null;q.preview=null;
  if(s.phase!=='play'){
   var title=s.phase==='ready'?'把切开的密码拼回来':s.phase==='between'?'接下来，八条一起拼':!s.win?'本局机会用尽':q.ctx?'出口锁已解除':'密码拼好了';
   body.innerHTML='<section class="ps-paper ps-intro">'+icon()+'<p class="ps-eyebrow">'+(s.phase==='done'?(s.win?'合作完成':'本局结束'):'第 '+roundLabel(s)+' 轮 · '+s.remaining+' 次机会')+'</p><h2>'+title+'</h2><p>'+(s.phase==='done'?(s.win?'每一道切口都接上了。':'先观察数字切口，再正式确认。'):s.phase==='between'?'新的四位数字，切成八条。仍然只动自己的条片。':'两个人看同一幅图。你推奇偶条中的一半，同伴推另一半。')+'</p>'+(s.phase==='done'?'':'<ol><li>A 负责奇数条，B 负责偶数条。</li><li>左右拖动条片，让数字的切口接起来。</li><li>拼成完整数字后，各点一次确认。</li></ol>')+btn(s.phase==='done'?'ps-again':'ps-ready',s.phase==='done'?'再来一局':'读懂了 · 准备')+'<small>双方准备后开始 · 错误确认扣 1 次机会</small></section>';
   if(q.ctx&&s.phase==='done'){document.getElementById('ps-again').remove();body.querySelector('small').textContent=(s.win?'机关已解除':'本局机会用尽')+'，正在返回地图…';}
   var b=document.getElementById(s.phase==='done'?'ps-again':'ps-ready');if(b)b.onclick=function(){emit(s.phase==='done'?'again':'ready');};
  }else{
   body.innerHTML='<div class="ps-meta"><span>第 '+roundLabel(s)+' 轮 · '+s.rows.length+' 条</span><span id="ps-budget"></span></div><section class="ps-paper ps-puzzle"><h2>拼回完整的四位数字</h2><p class="ps-hint">你是 '+w+' · 负责'+(w==='A'?'奇数':'偶数')+'条，同伴负责另一半</p>'+board(s)+'<p class="ps-legend">A 奇数条 · B 偶数条 · 两端画面同步</p></section><section class="ps-controls" aria-label="条片操作"><div class="ps-select">'+mine(s,w).map(function(i){return '<button data-ps-select="'+i+'" aria-pressed="false">第 '+(i+1)+' 条</button>';}).join('')+'</div><div class="ps-touch" aria-label="拖动此处左右移动选中条片"><span id="ps-selected"></span><small>也可在这里左右拖动</small></div><div class="ps-directions">'+btn('ps-minus','← 向左微调')+btn('ps-plus','向右微调 →')+'</div>'+btn('ps-confirm','拼好了 · 确认')+'</section>';
   document.getElementById('ps-confirm').onclick=function(){emit('confirm');};
   document.getElementById('ps-minus').onclick=function(){nudge(-1);};document.getElementById('ps-plus').onclick=function(){nudge(1);};
   body.querySelectorAll('[data-ps-select]').forEach(function(b){b.onclick=function(){if(swipe)return;selected=Number(b.dataset.psSelect);draw();};});
  }
 }
 if(s.phase==='play'){
  document.getElementById('ps-budget').textContent='剩余机会 '+s.remaining+' / '+s.maxMistakes;
  if(q.preview&&s.ack[w]>=q.preview.seq)q.preview=null;
  s.rows.forEach(function(r,i){var preview=swipe&&swipe.index===i?swipe.value:q.preview&&q.preview.index===i?q.preview.value:r.offset;renderOffset(i,preview);var row=body.querySelector('[data-ps-row="'+i+'"]');row.classList.toggle('ps-owned',r.owner===w);row.classList.toggle('ps-selected-row',i===selected);});
  body.querySelectorAll('[data-ps-select]').forEach(function(b){b.setAttribute('aria-pressed',String(Number(b.dataset.psSelect)===selected));});
  document.getElementById('ps-selected').textContent='正在操作第 '+(selected+1)+' 条';
  var offset=swipe?swipe.value:q.preview&&q.preview.index===selected?q.preview.value:s.rows[selected].offset;
  document.getElementById('ps-minus').disabled=offset<=-LIMIT;document.getElementById('ps-plus').disabled=offset>=LIMIT;
  var confirm=document.getElementById('ps-confirm');confirm.disabled=s.confirmed[w]||!!swipe||!!q.preview;confirm.textContent=s.confirmed[w]?'已确认 · 等待同伴':'拼好了 · 确认';
 }else{var ready=document.getElementById('ps-ready'),again=document.getElementById('ps-again');if(ready){ready.disabled=s.ready[w];ready.textContent=s.ready[w]?'已准备 · 等待同伴':'读懂了 · 准备';}if(again){again.disabled=s.again[w];again.textContent=s.again[w]?'等待同伴重开':'再来一局';}}
 document.getElementById('ps-status').textContent=s.notice||(s.phase==='play'?'沿数字轮廓接好切口；细条不好点时，用下方条号选择。':s.phase==='done'?(s.win?'合作完成。':'本局机会用尽。'):'读完规则后，和同伴一起准备。');
}
function position(i,value){var q=session;if(!q||!view)return;value=Math.max(-LIMIT,Math.min(LIMIT,Math.round(value)));q.preview={index:i,value:value,seq:q.seq+1};renderOffset(i,value);emit('move',{index:i,offset:value});}
function nudge(delta){if(!view||view.phase!=='play'||swipe)return;var q=session,value=q.preview&&q.preview.index===selected?q.preview.value:view.rows[selected].offset;position(selected,Math.round(value/STEP)*STEP+delta*STEP);draw();}
function controls(q){var root=document.querySelector('.ps-shell');
 function down(e){if(e.button!==0||swipe||!view||view.phase!=='play'||q.failed)return;var row=e.target.closest('[data-ps-row]'),pad=e.target.closest('.ps-touch');if(!row&&!pad)return;var index=row?Number(row.dataset.psRow):selected;if(view.rows[index].owner!==q.role)return;e.preventDefault();selected=index;var board=root.querySelector('.ps-board'),start=q.preview&&q.preview.index===index?q.preview.value:view.rows[index].offset;swipe={x:e.clientX,index:index,id:view.id,round:view.round,pointer:e.pointerId,start:start,value:start,scale:360/board.clientWidth,sentAt:0};root.setPointerCapture(e.pointerId);draw();}
 function move(e){var a=swipe;if(!a||a.pointer!==e.pointerId||q.failed)return;e.preventDefault();a.value=Math.max(-LIMIT,Math.min(LIMIT,Math.round(a.start+(e.clientX-a.x)*a.scale)));renderOffset(a.index,a.value);if(Date.now()-a.sentAt>=40){a.sentAt=Date.now();position(a.index,a.value);}}
 function up(e){var a=swipe;if(!a||a.pointer!==e.pointerId)return;move(e);swipe=null;if(root.hasPointerCapture(e.pointerId))root.releasePointerCapture(e.pointerId);if(!view||a.id!==view.id||a.round!==view.round||q.failed)return;position(a.index,Math.round(a.value/STEP)*STEP);draw();}
 function cancel(){var a=swipe;swipe=null;if(a&&root.hasPointerCapture(a.pointer))root.releasePointerCapture(a.pointer);if(a&&!q.failed&&view&&a.id===view.id&&a.round===view.round){position(a.index,Math.round(a.value/STEP)*STEP);draw();}}
 function keyboard(e){if(e.repeat&&(e.key==='Enter'||e.key===' ')){e.preventDefault();return;}if(!view||view.phase!=='play'||q.failed||swipe||/INPUT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();nudge(e.key==='ArrowLeft'?-1:1);}}
 root.addEventListener('pointerdown',down);root.addEventListener('pointermove',move);root.addEventListener('pointerup',up);root.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);window.addEventListener('keydown',keyboard);q.clean.push(function(){root.removeEventListener('pointerdown',down);root.removeEventListener('pointermove',move);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',keyboard);});
}
function lobby(w){clearTimers();closePeer();clearNetZones();S.mod=MODE;S.role=w;window._dungeon=false;window._netMode=w==='A'?'host':'guest';selected=0;drawKey='';scaffold(w);
 var q={role:w,seq:0,frame:0,lastFrame:0,match:null,state:null,conn:null,clean:[],failed:false,accepted:false,stopped:false,lastSeen:Date.now()};session=q;
 document.getElementById('ps-body').innerHTML='<section class="ps-paper ps-intro">'+icon()+'<h2>'+(w==='A'?'创建密码推条房间':'加入密码推条房间')+'</h2><p>两端看同一幅拼图，A 推奇数条，B 推偶数条。<br>连接后双方准备，再开始解谜。</p>'+(w==='A'?'<div id="ps-code" class="ps-code">····</div>':'<label for="ps-room">同伴的四位房间码</label><input id="ps-room" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="例如 1234">'+btn('ps-join','加入房间'))+'</section>';
 function status(t){if(session===q&&!q.failed)document.getElementById('ps-status').textContent=t;}
 function connect(code){status('正在连接…');loadPeerLib(function(P){if(session!==q)return;if(!P){fail('联网组件加载失败，请返回重试。');return;}var p=newPeerId(w==='A'?'pwstrip-'+code:null,peerOpts());PEER.peer=p;PEER.room=code;PEER.isHost=w==='A';q.timeout=setTimeout(function(){fail('连接超时，请确认双方选择密码推条，再返回重试。');p.destroy();},15000);
 p.on('error',function(e){if(session!==q)return;fail(e.type==='unavailable-id'?'房间码已占用，请返回重新创建。':'无法连接房间，请确认房间码和玩法后返回重试。');});
 function attach(c){if(session!==q||q.conn){c.close();return;}q.conn=c;PEER.conn=c;
 c.on('data',function(d){if(window.RoomResults&&RoomResults.consume(d,c))return;if(session!==q||q.failed||!d)return;q.lastSeen=Date.now();
  if(!q.accepted){if(w==='A'&&d.t==='psHello'&&d.mode===MODE&&d.proto===PROTO){q.accepted=true;q.match=uid();q.state=create();clearTimeout(q.timeout);packet({t:'psWelcome',mode:MODE,proto:PROTO,match:q.match});controls(q);publish();}else if(w==='B'&&d.t==='psWelcome'&&d.mode===MODE&&d.proto===PROTO&&typeof d.match==='string'){q.accepted=true;q.match=d.match;clearTimeout(q.timeout);controls(q);}else{packet({t:'psReject'});fail('房间玩法或协议不匹配，请返回重新选择。');c.close();}return;}
  if(w==='A'&&d.t==='psInput'&&d.proto===PROTO){input(q.state,d,'B');publish();}
  else if(w==='B'&&d.t==='psState'&&d.proto===PROTO&&d.state&&d.match===q.match&&Number.isSafeInteger(d.frame)&&d.frame>q.lastFrame){q.lastFrame=d.frame;if(view&&view.id!==d.state.id){q.seq=0;selected=0;}view=d.state;resultBegin(q,view);draw();}
 });
 c.on('close',function(){if(session===q)fail('同伴断线，操作已停止。请返回重新建房。');});c.on('error',function(){if(session===q)fail('连接中断，操作已停止。请返回重新建房。');});
 c.on('open',function(){if(session!==q||q.failed)return;q.lastSeen=Date.now();if(w==='B')packet({t:'psHello',mode:MODE,proto:PROTO});});
 }
 p.on('open',function(){if(session!==q)return;if(w==='A'){clearTimeout(q.timeout);document.getElementById('ps-code').textContent=code;status('把房间码告诉同伴，等待加入。');}else attach(p.connect('pwstrip-'+code,{reliable:true,metadata:{mode:MODE,proto:PROTO}}));});
 if(w==='A')p.on('connection',function(c){if(q.conn||session!==q){c.close();return;}if(!c.metadata||c.metadata.mode!==MODE||c.metadata.proto!==PROTO){c.on('open',function(){c.send({t:'psReject'});setTimeout(function(){c.close();},100);});return;}attach(c);q.timeout=setTimeout(function(){if(!q.accepted){fail('房间握手超时，请返回重试。');c.close();}},8000);});
 q.timer=setInterval(function(){if(session!==q||q.failed||!q.accepted)return;if(Date.now()-q.lastSeen>7000){fail('同伴连接无响应，操作已停止。请返回重新建房。');return;}if(w==='A')publish();else packet({t:'psPulse',match:q.match});},250);
 });}
 if(w==='A')connect(String(1000+Math.floor(Math.random()*9000)));else document.getElementById('ps-join').onclick=function(){var code=document.getElementById('ps-room').value.trim();if(!/^\d{4}$/.test(code)){status('请输入四位数字房间码。');return;}this.disabled=true;connect(code);};
}
function choose(){clearTimers();closePeer();scaffold();document.getElementById('ps-body').innerHTML='<section class="ps-paper ps-intro">'+icon()+'<h2>一幅密码，两个人拼</h2><p>把一组大数字横切成条。A 推奇数条、B 推偶数条，一起把切口接齐。共两轮，整局共享 5 次错误确认机会。</p>'+btn('ps-host','角色 A · 创建房间')+btn('ps-guest','角色 B · 加入房间')+'</section>';document.getElementById('ps-host').onclick=function(){lobby('A');};document.getElementById('ps-guest').onclick=function(){lobby('B');};}
function enterRoom(ctx,w){clearTimers();clearNetZones();S.mod=MODE;selected=0;drawKey='';var q={role:w,ctx:ctx,seq:0,frame:0,lastFrame:0,match:ctx.sessionId,state:null,conn:PEER.conn,clean:[],failed:false,accepted:true,stopped:false,lastSeen:Date.now()};session=q;scaffold(w);document.querySelector('.ps-shell').classList.add('ps-room');if(exitTheme())document.querySelector('.ps-header h1').textContent='出口密码锁';var captured=ctx;document.getElementById('ps-back').onclick=function(){if(captured.isActive())captured.abort();else{clearTimers();renderDungeonMenu();}};controls(q);function disconnected(){if(session===q)fail('同伴断线，出口锁操作已停止。请返回重新建房。');}if(q.conn){q.conn.on('close',disconnected);q.conn.on('error',disconnected);q.clean.push(function(){if(q.conn.off){q.conn.off('close',disconnected);q.conn.off('error',disconnected);}});}if(w==='A'){q.state=create(ctx);publish();}else document.getElementById('ps-status').textContent='等待房主同步出口锁…';q.timer=setInterval(function(){if(session!==q||q.failed||!ctx.isActive())return;if(Date.now()-q.lastSeen>7000){fail('同伴连接无响应，操作已停止。请返回重新建房。');return;}if(w==='A')publish();else packet({t:'psRoomPulse',proto:PROTO,roomSession:ctx.sessionId});},150);}
var oldHostData=dgHostOnData;dgHostOnData=function(d){if(d&&['psRoomInput','psRoomPulse'].includes(d.t)){var q=session;if(!q||!q.ctx||q.failed||d.proto!==PROTO||!q.ctx.isActive()||d.roomSession!==q.ctx.sessionId)return;q.lastSeen=Date.now();if(d.t==='psRoomInput'&&d.kind!=='again'){input(q.state,d,'B');publish();}return;}return oldHostData(d);};
var oldGuestData=dgGuestOnData;dgGuestOnData=function(d){if(d&&d.t==='psRoomState'){var q=session;if(!q||!q.ctx||q.failed||d.proto!==PROTO||!q.ctx.isActive()||d.roomSession!==q.ctx.sessionId||d.match!==q.match||!Number.isSafeInteger(d.frame)||d.frame<=q.lastFrame||!d.state)return;if(view&&view.id!==d.state.id)return;q.lastFrame=d.frame;q.lastSeen=Date.now();view=d.state;resultBegin(q,view);draw();return;}return oldGuestData(d);};
window.RoomGameAdapters=window.RoomGameAdapters||{};window.RoomGameAdapters[MODE]={host:function(ctx){enterRoom(ctx,'A');},guest:function(ctx){enterRoom(ctx,'B');}};
PLAYGROUNDS.push({id:MODE,name:'密码推条',icon:'▤',tag:'合作解谜',time:null,a:'看共享拼图，左右拖动奇数条，拼回完整数字。',b:'看共享拼图，左右拖动偶数条，拼回完整数字。'});
var oldClear=clearTimers;clearTimers=function(){stop();return oldClear.apply(this,arguments);};var oldRender=render;render=function(){if(S.mod===MODE)return S.role?lobby(S.role):choose();return oldRender.apply(this,arguments);};
window.PasswordStrip={create:create,input:input,snapshot:snapshot,state:function(){return view;}};
})();
