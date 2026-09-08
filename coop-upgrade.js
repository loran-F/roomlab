/* Existing-game cooperation upgrade. Loaded after the base game, before render(). */
(function(){
'use strict';
var duties={
maze:['按 B 的路线移动，遇到岔路先停下。','看地图，一次只报一个方向。'],
dial:['调整频率，让波形平顺；对准后通知同伴。','调整增益，让信号条满格；与 A 稳定收录。'],
wires:['报线号、颜色和纹理，选线后再确认剪断。','分步判断线号；救场时听 A 报符号，选择旁路。'],
code:['描述符号的形状和方向，输入 B 报的数字。','根据描述查符号，逐位报回数字。'],
vault:['报出“第几位、什么数字”。','选对应位序，再记录数字。'],
pressure:['加减压力，持续把读数报给 B。','报安全区间，在范围内按住阀门。'],
catch:['按住左移，与 B 协调接物资。','按住右移，与 A 协调接物资。'],
shield:['守左半边，按住抵挡，及时松手。','守右半边，按住抵挡，及时松手。'],
beam:['抬左端使货物滚向中央；危险时一起按住。','抬右端使货物滚向中央；危险时一起按住。'],
beat:['蓝色音符你来打，紫色一起打。','橙色音符你来打，紫色一起打。'],
bridge:['控制左移，运送中避免急转；危险时一起刹车。','控制右移，运送中避免急转；危险时一起刹车。'],
boss:['听 B 报弱点攻击，看到来袭方向立即报给 B。','报弱点部位给 A，听 A 报方向选择护盾。']
};
var families={maze:'判断',dial:'搜索',wires:'判断',code:'判断',vault:'记忆',beat:'节奏',catch:'搬运',beam:'搬运',bridge:'搬运',shield:'反应',pressure:'调节',lookback:'反应',caller:'沟通',shadow:'协作'};
var current=null,prep=null,serial=0,seen={},prepConn=null;
document.addEventListener('keydown',function(e){if($('coop-panel')){e.stopImmediatePropagation();}},true);
function lostPrep(){if(!prep&&!window._coopRescue)return;prep=null;clearTimers();window._dead=true;removeRescue();removePanel();panel('连接已断开','行动已停止，请返回后重新建房。');}
function watchPrep(){if(prepConn&&prepConn.off)prepConn.off('close',lostPrep);prepConn=PEER.conn;if(prepConn)prepConn.on('close',lostPrep);}
try{seen=JSON.parse(sessionStorage.getItem('coop-practice-v1')||'{}');}catch(e){}
function remember(mode,role){seen[mode+role]=true;try{sessionStorage.setItem('coop-practice-v1',JSON.stringify(seen));}catch(e){}}
function removePanel(){var el=$('coop-panel');if(el)el.remove();}
function panel(title,txt){removePanel();var el=document.createElement('div');el.id='coop-panel';el.className='coop-overlay';el.innerHTML='<section class="coop-card"><h2>'+title+'</h2><p>'+txt+'</p><div id="coop-work"></div><p id="coop-status" role="status"></p><button id="coop-cancel" class="btn">返回</button></section>';document.body.appendChild(el);$('coop-cancel').onclick=function(){cancelPrep();};return $('coop-work');}
function button(parent,txt,fn){var b=document.createElement('button');b.className='btn coop-action';b.textContent=txt;b.onclick=fn;parent.appendChild(b);return b;}
function say(txt){if($('coop-status'))$('coop-status').textContent=txt;}
function hold(parent,label,ms,done){var b=button(parent,label,function(){}),started=0,iv=null,finished=false;
function stop(){clearInterval(iv);iv=null;started=0;if(!finished)b.textContent=label;}
b.onpointerdown=function(e){if(finished)return;e.preventDefault();b.setPointerCapture(e.pointerId);started=performance.now();iv=setInterval(function(){var n=performance.now()-started;b.textContent='保持 '+Math.min(100,Math.round(n/ms*100))+'%';if(n>=ms){finished=true;stop();b.textContent='完成 ✓';b.disabled=true;done();}},30);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=stop;
var observer=new MutationObserver(function(){if(!b.isConnected){stop();observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});return b;}
function practice(mode,role,done){
 var words=duties[mode]||['按提示操作，与 B 交流。','观察提示，与 A 配合。'];
 var box=panel((dgPG(mode)||{name:mode}).name+' · 角色 '+role,words[role==='A'?0:1]+' 先做一次不扣血、不计时的练习。');
 function pass(){remember(mode,role);say('练习完成，等待同伴。');box.innerHTML='';done();}
 function choice(prompt,choices,answer){var p=document.createElement('p');p.textContent=prompt;box.appendChild(p);choices.forEach(function(x){button(box,x,function(){if(x===answer)pass();else say('再试一次，练习不会扣血。');});});}
 if(mode==='maze')choice(role==='A'?'同伴说“右移一格”，请选择方向。':'地图出口在角色右侧，你应该报：',['← 左','→ 右','↑ 上'],'→ 右');
 else if(mode==='dial')choice(role==='A'?'同伴说目标为 7，把练习指针移到：':'练习卡 C1 → 刻度 7。A 报 C1，你报：',['3','7','9'],'7');
 else if(mode==='wires')choice(role==='A'?'B 让你剪第 2 根，点击对应线号。':'练习线序：1黄、2蓝、3红。红线不足2根时剪蓝线，应剪：',['1','2','3'],'2');
 else if(mode==='code')choice(role==='A'?'同伴报回数字 4，输入：':'练习密码本：圆圈向左下伸线 → 4。A 描述相同符号，你报：',['2','4','8'],'4');
 else if(mode==='vault'){choice(role==='A'?'第 2 位亮起数字 7，你应该报：':'同伴说“第 2 位，7”，选择正确记录。',['第 7 位，2','第 2 位，7','第 1 位，7'],'第 2 位，7');}
 else if(mode==='pressure'&&role==='A'){var value=40;var gauge=document.createElement('p');box.appendChild(gauge);gauge.textContent='练习压力 40 · 目标 50';button(box,'＋ 加压',function(){value+=5;gauge.textContent='练习压力 '+value;if(value>=50)pass();});}
 else if(mode==='boss')choice(role==='A'?'B 报弱点是右臂，你攻击：':'A 报泡泡弹从左侧来，你防御：',['左侧','右臂','上方'],role==='A'?'右臂':'左侧');
 else if(mode==='beat'){var ready=false;var b=button(box,'等待绿色提示',function(){if(ready)pass();else say('提前了，等绿色提示再按。');});setTimeout(function(){if(b.isConnected){ready=true;b.textContent='现在点击';b.style.background='#8cd2a2';}},900);}
 else hold(box,mode==='pressure'?'读数 50，在 45—55 内：按住阀门':role==='A'?'按住你的左侧控制':'按住你的右侧控制',650,pass);
}
function themeName(){return DUNGEON&&DUNGEON.roomId==='room-4'?'镜像双胞胎':DUNGEON&&DUNGEON.roomId==='room-8'?'异形惊扰':'';}
function configFor(n){
 if(n.coopConfig){var saved=Object.assign({},n.coopConfig);saved.timeScale=saved.baseScale||saved.timeScale;saved.alarm=DUNGEON.coopAlarm||0;return saved;}
 var history=DUNGEON.coopHistory||[],streak=1;
 for(var i=history.length-1;i>=0&&history[i].mode===n.mode;i--)streak++;
 return {mode:n.mode||'boss',streak:streak,tier:Math.min(streak,4),baseScale:Math.max(.7,1-(streak-1)*.1),timeScale:Math.max(.7,1-(streak-1)*.1),theme:themeName(),alarm:DUNGEON.coopAlarm||0};
}
window.coopDifficulty=function(){return window._dungeon&&current?current:{tier:1,streak:1,timeScale:1};};
window.coopTime=function(t){return Math.max(15,Math.round(t*coopDifficulty().timeScale));};
function beginPrep(id){
 var n=dgNode(id);if(!n||n.type==='rest'){originalEnter(id);return;}if(prep)return;
 window._wirePick=null;window._wireKey=null;window._dialLock=null;window._mazeMove=null;
 current=Object.assign({},configFor(n));
 current.mirror=[0,0,0].map(function(){return Math.floor(Math.random()*3);});
 prep={id:Date.now().toString(36)+'-'+(++serial),node:id,mode:n.mode||'boss',cfg:current,ready:{A:false,B:false},theme:{A:false,B:false}};
 watchPrep();netSend({t:'coopPrep',id:prep.id,node:id,mode:prep.mode,cfg:current});localPrep('A');
}
function localPrep(role){
 var p=prep;S.mod=p.mode;
 if(!seen[p.mode+role]&&['lookback','caller','shadow','dial'].indexOf(p.mode)<0)practice(p.mode,role,function(){if(prep===p)ready(role);});
 else {panel('角色 '+role+' · 行动准备',(duties[p.mode]||['与同伴配合','与同伴配合'])[role==='A'?0:1]+' 连续同玩法第 '+p.cfg.streak+' 次，基础限时 '+Math.round(p.cfg.baseScale*100)+'%。');button($('coop-work'),'准备好了',function(){ready(role);});}
}
function ready(role){if(!prep)return;prep.ready[role]=true;if($('coop-work'))$('coop-work').innerHTML='';say('已就绪，等待同伴。');if(role==='B')netSend({t:'coopReady',id:prep.id});else advance();}
function advance(){if(!prep||!prep.ready.A||!prep.ready.B||prep.phase)return;prep.phase='theme';
 if(prep.cfg.theme){netSend({t:'coopTheme',id:prep.id});themePractice('A');}else launch();}
function themePractice(role){
 if(!prep)return;var p=prep;var box;
 if(p.cfg.theme==='镜像双胞胎'){
   box=panel('双胞胎的镜像门','你们看到不同线索。读出自己的线索，让同伴完成镜像输入。');
   var seq=p.cfg.mirror;
   var mine=role==='A'?seq:seq.map(function(v){return 2-v;});
   var target=role==='A'?seq.map(function(v){return 2-v;}):seq;
   var info=document.createElement('p');info.textContent='告诉同伴：'+mine.map(function(v){return ['左','中','右'][v];}).join(' → ');box.appendChild(info);
   var step=0;['左','中','右'].forEach(function(label,index){button(box,label,function(){if(index===target[step]){step++;say('镜像输入 '+step+' / 3');if(step===3)themeDone(role,'mirror');}else{step=0;say('顺序不符，问问同伴，从第一步重来。');}});});
 }else{
   box=panel('异形惊扰 · '+p.cfg.alarm+' / 3',(p.cfg.disagree?'刚才选择不同，请商量后选择同一个方案。':'')+'行动失败会增加惊扰。双方可安抚 3 秒降低惊扰，或都选择冒险；每级惊扰让本次行动时间再缩短 5%。');
   hold(box,'按住安抚 3 秒',3000,function(){themeDone(role,'calm');});button(box,'冒险继续',function(){themeDone(role,'risk');});
 }
}
function themeDone(role,choice){if(!prep)return;prep.theme[role]=choice;if($('coop-work'))$('coop-work').innerHTML='';say('已完成，等待同伴。');if(role==='B')netSend({t:'coopThemeDone',id:prep.id,choice:choice});else launchTheme();}
function launchTheme(){if(!prep||!prep.theme.A||!prep.theme.B)return;
 if(prep.cfg.theme==='异形惊扰'){
  if(prep.theme.A!==prep.theme.B){prep.theme={A:false,B:false};prep.cfg.disagree=true;netSend({t:'coopTheme',id:prep.id,disagree:true});themePractice('A');return;}
  if(prep.theme.A==='calm'&&prep.theme.B==='calm')DUNGEON.coopAlarm=Math.max(0,(DUNGEON.coopAlarm||0)-1);
  prep.cfg.alarm=DUNGEON.coopAlarm||0;prep.cfg.timeScale=Math.max(.55,prep.cfg.timeScale*(1-prep.cfg.alarm*.05));
 }
 launch();
}
function launch(){var p=prep;if(!p)return;current=p.cfg;dgNode(p.node).coopConfig=Object.assign({},current);netSend({t:'coopLaunch',id:p.id,cfg:current});prep=null;removePanel();originalEnter(p.node);}
function cancelPrep(remote){if(prep&&!remote)netSend({t:'coopCancel',id:prep.id});prep=null;removePanel();if(DUNGEON){S.mod='dungeon';if(window._netMode==='host')renderDungeonHostMap();else renderDungeonGuestMap(String(PEER.room||''));}else location.search='';}
var originalEnter=dgEnterHost;dgEnterHost=beginPrep;
var originalHost=dgHostOnData;dgHostOnData=function(d){
 if(d.t==='coopReady'&&prep&&d.id===prep.id){prep.ready.B=true;advance();return;}
 if(d.t==='coopThemeDone'&&prep&&d.id===prep.id&&['mirror','calm','risk'].indexOf(d.choice)>=0){prep.theme.B=d.choice;launchTheme();return;}
 if(d.t==='coopCancel'&&prep&&d.id===prep.id){cancelPrep(true);return;}
 if(d.t==='coopRescueHold'){if(window._coopRescue&&d.id===window._coopRescue.id)window._coopRescue.holdB=!!d.v;return;}
 return originalHost(d);
};
var originalGuest=dgGuestOnData;dgGuestOnData=function(d){
 if(d.t==='coopPrep'){prep={id:d.id,node:d.node,mode:d.mode,cfg:d.cfg,ready:{},theme:{}};current=d.cfg;watchPrep();localPrep('B');return;}
 if(d.t==='coopTheme'&&prep&&d.id===prep.id){prep.cfg.disagree=!!d.disagree;themePractice('B');return;}
 if(d.t==='coopLaunch'&&prep&&d.id===prep.id){current=d.cfg;prep=null;removePanel();return;}
 if(d.t==='coopCancel'&&prep&&d.id===prep.id){cancelPrep(true);return;}
 if(d.t==='coopRescue'){showRescue(d,'B');return;}
 if(d.t==='coopRescueEnd'){removeRescue();return;}
 return originalGuest(d);
};
var oldNew=newDungeon;newDungeon=function(){oldNew();current=null;prep=null;DUNGEON.coopHistory=[];DUNGEON.coopAlarm=0;
 if(window._netMode!=='host')return;
 var pool=EV_POOL_NET.slice();var used={};
 DUNGEON.nodes.filter(function(n){return n.type==='event';}).forEach(function(n){
   var sameLayer=DUNGEON.nodes.filter(function(x){return x.layer===n.layer&&used[x.id];}).map(function(x){return x.mode;});
   var parents=n.prev.map(dgNode).filter(function(x){return x&&x.type==='event';});
   var ranked=pool.map(function(mode){var score=1;if(sameLayer.indexOf(mode)>=0)score*=.05;parents.forEach(function(p){if(p.mode===mode)score*=.18;else if(families[p.mode]===families[mode])score*=.4;});return {mode:mode,score:score};});
   var sum=ranked.reduce(function(s,x){return s+x.score;},0),r=Math.random()*sum;
   n.mode=ranked[ranked.length-1].mode;ranked.some(function(x){r-=x.score;if(r<=0){n.mode=x.mode;return true;}return false;});used[n.id]=true;
 });
};
var oldEnd=dungeonEnd;dungeonEnd=function(ok){
 var n=dgNode(window._dgNode);if(n&&!n.done&&ok){DUNGEON.coopHistory=DUNGEON.coopHistory||[];DUNGEON.coopHistory.push({node:n.id,mode:n.mode});}
 if(n&&!ok&&DUNGEON.roomId==='room-8')DUNGEON.coopAlarm=Math.min(3,(DUNGEON.coopAlarm||0)+1);
 removeRescue();return oldEnd(ok);
};
var oldRest=dgRestHost;dgRestHost=function(id){DUNGEON.coopHistory=DUNGEON.coopHistory||[];DUNGEON.coopHistory.push({node:id,mode:'rest'});return oldRest(id);};
var oldSnap=dgSnapshot;dgSnapshot=function(){var d=oldSnap();d.coopAlarm=DUNGEON.coopAlarm||0;d.coopHistory=DUNGEON.coopHistory||[];return d;};
var oldApply=applyDungeon;applyDungeon=function(d){oldApply(d);DUNGEON.coopAlarm=d.coopAlarm||0;DUNGEON.coopHistory=d.coopHistory||[];};
var oldAbort=dungeonAbort;dungeonAbort=function(remote){prep=null;removePanel();removeRescue();return oldAbort(remote);};
var oldMap=renderDungeonMapShell;renderDungeonMapShell=function(role,code){oldMap(role,code);document.querySelectorAll('.dungeon-screen .coop-theme').forEach(function(p){p.remove();});var name=themeName();if(name){var p=document.createElement('p');p.className='coop-theme';p.textContent=name+(DUNGEON.roomId==='room-8'?' · 惊扰 '+(DUNGEON.coopAlarm||0)+'/3':' · 每次行动前互报镜像线索');document.querySelector('.dungeon-screen').appendChild(p);}};
var oldIntro=introGo;introGo=function(broadcast,cb){function go(){oldIntro(broadcast,function(){if(window._dungeon){S.time=coopTime(S.time);var banner=document.createElement('p');banner.className='coop-theme';banner.textContent='连续同玩法第 '+coopDifficulty().streak+' 次 · 本次限时 '+S.time+' 秒';var host=$('playarea')||$('stage');if(host)host.parentNode.insertBefore(banner,host);}cb();});}
 if(!window._dungeon&&!seen[S.mod+(S.role==='B'?'B':'A')])practice(S.mod,S.role==='B'?'B':'A',function(){removePanel();go();});else go();};
var oldRt=startRealtime;startRealtime=function(mode){function start(){oldRt(mode);if(RT&&window._dungeon)RT.time=coopTime(RT.time);}if(!window._dungeon&&!seen[mode+'A'])practice(mode,'A',function(){removePanel();start();});else start();};
var guestLesson=null,latestRt=null,oldRtGuest=realtimeGuestData;realtimeGuestData=function(d){
 if(!window._dungeon&&!seen[d.state.mode+'B']){latestRt=d;if(!guestLesson){guestLesson=d.state.mode;practice(guestLesson,'B',function(){var last=latestRt;guestLesson=null;latestRt=null;removePanel();if(last)oldRtGuest(last);});}return;}return oldRtGuest(d);
};
var oldManual=renderManual;renderManual=function(){oldManual();if(!window._dungeon&&duties[S.mod]&&!seen[S.mod+'B'])practice(S.mod,'B',function(){removePanel();});};
// Rescue is host-authoritative, scoped to the active node, and expires on abort.
function removeRescue(){var el=$('coop-rescue');if(el)el.remove();window._coopRescue=null;}
function showRescue(d,role){var old=$('coop-rescue');if(old)old.remove();var el=document.createElement('div');el.id='coop-rescue';el.className='coop-rescue';el.innerHTML='<b>应急救场</b><p>'+d.text+'</p>';document.body.appendChild(el);
 var b=button(el,role==='B'?'按住应急开关':'按住确认修复',function(){});
 function set(v){if(role==='B')netSend({t:'coopRescueHold',id:d.id,v:v});else if(window._coopRescue)window._coopRescue.holdA=v;}
 b.onpointerdown=function(e){b.setPointerCapture(e.pointerId);set(true);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=function(){set(false);};
}
window.coopWireRescue=function(resume){
 if(!window._dungeon||window._netMode!=='host'||window._coopWireUsed)return false;window._coopWireUsed=true;
 var r={id:Date.now().toString(36),holdA:false,holdB:false,charge:0,left:4.5};window._coopRescue=r;
 var d={t:'coopRescue',id:r.id,text:'4.5 秒内双方按住应急开关 0.7 秒。成功保留线路，扣 5 秒；本次只有一次机会。'};showRescue(d,'A');netSend(d);
 var iv=setInterval(function(){if(window._coopRescue!==r){clearInterval(iv);return;}r.left-=.05;r.charge=r.holdA&&r.holdB?r.charge+.05:0;if(r.charge>=.7){clearInterval(iv);removeRescue();netSend({t:'coopRescueEnd'});cut(5);if(!window._dead)resume();}else if(r.left<=0){clearInterval(iv);removeRescue();netSend({t:'coopRescueEnd'});explode('应急修复未完成');}},50);timers.push(iv);return true;
};
var oldWires=runWires;runWires=function(set){window._coopWireUsed=false;return oldWires(set);};
window.coopRescueFeedback=function(txt){dgPlayMsg('warn',txt);netSend({t:'dgMsg',kind:'warn',txt:txt});};
var oldExplode=explode;explode=function(reason){if(window._coopRescue){removeRescue();netSend({t:'coopRescueEnd'});}return oldExplode(reason);};
window.COOP_UPGRADE={configFor:configFor,duties:duties,families:families,getPrep:function(){return prep;},practice:practice};
})();
