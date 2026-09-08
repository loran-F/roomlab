(function(){
'use strict';
function plantRoom(){return !!window._dungeon&&typeof DUNGEON!=='undefined'&&DUNGEON&&DUNGEON.roomId==='room-1';}
window.catchMobileText=function(txt){return plantRoom()?String(txt).replace(/绿箱|好物/g,'花盆').replace(/金箱/g,'牛奶').replace(/红箱|坏物/g,'碎砖').replace(/接收篮|接货员/g,'接物布'):txt;};
function shape(c,color,points){c.fillStyle=color;c.beginPath();points.forEach(function(p,i){if(i)c.lineTo(p[0],p[1]);else c.moveTo(p[0],p[1]);});c.closePath();c.fill();c.stroke();}
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();c.stroke();}
function plantScene(c,px,items){
 c.clearRect(0,0,340,400);c.fillStyle='#ecd8b8';c.fillRect(0,0,340,400);c.strokeStyle='#cfb895';c.lineWidth=1;
 for(var y=40;y<330;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(340,y);c.stroke();}
 // Quiet apartment edges leave the entire central falling lane clear.
 [0,284].forEach(function(x){c.fillStyle='#cfb895';c.fillRect(x,34,56,243);c.fillStyle='#759b99';c.fillRect(x+6,42,44,225);c.fillStyle='#adc6bd';c.fillRect(x+12,49,13,205);c.fillStyle='#ead2ac';c.fillRect(x+4,112,48,6);c.fillRect(x+4,189,48,6);});
 c.fillStyle='#b6b89c';c.fillRect(0,367,340,33);c.strokeStyle='#343b32';c.lineWidth=2;
 // The cloth lip matches the existing receiver center and collision width.
 var left=Math.max(17,px-44),right=Math.min(323,px+44);
 function person(x,girl){c.fillStyle=girl?'#5d8957':'#686b42';c.fillRect(x-10,355,20,27);oval(c,x,346,12,14,'#f3c394');c.fillStyle='#3e342a';if(girl){c.fillRect(x-13,332,26,10);c.fillRect(x-13,338,5,15);c.fillRect(x+8,338,5,15);}else{oval(c,x,334,14,5,'#3e342a');c.fillStyle='#272c2a';c.fillRect(x-11,341,22,6);}c.fillStyle='#343b32';c.fillRect(x-9,381,7,5);c.fillRect(x+3,381,7,5);}
 person(left,false);person(right,true);shape(c,'#f3efe0',[[px-32,352],[px+32,352],[px+23,366],[px-23,366]]);c.strokeStyle='#5a806c';c.beginPath();c.moveTo(px-27,357);c.quadraticCurveTo(px,373,px+27,357);c.stroke();
 items.forEach(function(it){c.save();c.translate(it.x,it.y);c.strokeStyle='#343b32';c.lineWidth=1.8;
 if(it.type==='good'){c.strokeStyle='#356344';c.beginPath();c.moveTo(0,2);c.lineTo(0,-18);c.stroke();oval(c,-7,-14,8,5,'#68a04f');oval(c,6,-20,7,5,'#93ba65');oval(c,8,-8,8,5,'#528b4c');c.strokeStyle='#343b32';shape(c,'#c67c50',[[-11,0],[11,0],[8,15],[-8,15]]);c.fillStyle='#e9ab73';c.fillRect(-12,-1,24,4);}
 else if(it.type==='gold'){shape(c,'#fff9df',[[-10,-10],[0,-17],[10,-10],[10,15],[-10,15]]);c.fillStyle='#719cb5';c.fillRect(-9,-5,18,8);c.fillStyle='#343b32';c.font='bold 9px sans-serif';c.textAlign='center';c.fillText('+2',0,12);}
 else{shape(c,'#d66a55',[[-14,-5],[-3,-12],[12,-5],[9,9],[-8,12]]);c.strokeStyle='#fff2df';c.lineWidth=2.5;c.beginPath();c.moveTo(-5,-4);c.lineTo(5,5);c.moveTo(5,-4);c.lineTo(-5,5);c.stroke();}c.restore();});
}
window.catchMobileDraw=function(c,px,items){
 if(plantRoom()){plantScene(c,px,items);return;}
 c.clearRect(0,0,340,400);c.fillStyle='#ffe8ac';c.fillRect(0,0,340,400);c.strokeStyle='#eac98c';c.lineWidth=1;
 for(var y=45;y<350;y+=55){c.beginPath();c.moveTo(18,y);c.lineTo(322,y);c.stroke();}
 c.fillStyle='#dec38c';c.fillRect(0,365,340,3);c.fillStyle='#e9a342';c.strokeStyle='#30253a';c.lineWidth=3;c.beginPath();c.moveTo(px-32,338);c.lineTo(px+32,338);c.lineTo(px+25,362);c.lineTo(px-25,362);c.closePath();c.fill();c.stroke();c.fillStyle='#30253a';c.font='bold 12px sans-serif';c.textAlign='center';c.fillText('接收篮',px,354);
 items.forEach(function(it){c.lineWidth=2;c.strokeStyle='#30253a';c.fillStyle=it.type==='good'?'#91cba1':it.type==='gold'?'#ffcd55':'#ed8875';c.beginPath();if(it.type==='good')c.rect(it.x-10,it.y-10,20,20);else if(it.type==='gold'){c.moveTo(it.x,it.y-12);c.lineTo(it.x+12,it.y+10);c.lineTo(it.x-12,it.y+10);c.closePath();}else c.arc(it.x,it.y,11,0,Math.PI*2);c.fill();c.stroke();if(it.type==='bad'){c.fillStyle='#30253a';c.font='bold 14px sans-serif';c.fillText('×',it.x,it.y+5);}});
};
function layout(role){
 var canvas=document.querySelector('#stage canvas');if(!canvas)return;
 var count=$('count').textContent,goal=$('goal').textContent,fb=$('fb');clearNetZones();
 $('app').innerHTML='<section class="catch-mobile"><header class="ct-top"><button id="back" aria-label="返回">‹</button><strong>情报空投</strong><span id="count">'+count+'</span></header><div class="ct-status"><span id="goal">'+goal+'</span><span>绿箱 +1 · 金箱 +2 · 红色避开</span></div><div class="ct-arena" id="stage"></div><div id="msg" class="msg" role="status">移动接收篮接物资，遇到红色危险物及时避开。</div><footer class="ct-controls"><div class="ct-role"><b class="ct-role-'+role.toLowerCase()+'">'+role+'</b><span>你负责'+(role==='A'?'左移':'右移')+'，两人共同控制接收篮</span></div><button id="ct-tap" class="ct-role-'+role.toLowerCase()+'" disabled>'+(role==='A'?'← 按住向左移动':'按住向右移动 →')+'</button><p>按住移动，松手减速 · 可与同伴一起刹停</p></footer></section>';
 if(plantRoom()){var shell=document.querySelector('.catch-mobile');shell.classList.add('ct-plant');shell.dataset.roomTheme='room-1';shell.querySelector('.ct-top strong').textContent='接住小花盆';shell.querySelector('.ct-status span:last-child').textContent='花盆 +1 · 牛奶 +2 · 碎砖 −3秒';$('msg').textContent='两人托住接物布：接花盆和牛奶，避开红色碎砖。';shell.querySelector('.ct-role span').textContent='你负责'+(role==='A'?'左移':'右移')+'，一起托稳接物布';}
 $('stage').appendChild(canvas);if(fb)$('app').appendChild(fb);$('back').onclick=gobackMenu;
 var button=$('ct-tap');function set(v){button.setAttribute('aria-pressed',String(!!v));if(role==='A')window._inL=!!v;else if(window._guestSetDir)window._guestSetDir(v?1:0);}
 button.onpointerdown=function(e){if(button.disabled)return;e.preventDefault();button.setPointerCapture(e.pointerId);set(true);};button.onpointerup=button.onpointercancel=button.onlostpointercapture=function(){set(false);};
 function release(){set(false);}window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);
 var timer=setInterval(function(){if(!button.isConnected){clearInterval(timer);return;}var s=role==='B'&&window._guestState?window._guestState():null;button.disabled=!!window._dead||!!window._introLock||(role==='B'&&(!s||s.dead||s.win));},80);
 var conn=PEER.conn;function close(){release();button.disabled=true;clearInterval(timer);if($('msg'))$('msg').textContent='连接断开，请返回后重新建房。';}if(conn)conn.on('close',close);
 var observer=new MutationObserver(function(){if(!button.isConnected){clearInterval(timer);release();window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',release);if(conn&&conn.off)conn.off('close',close);observer.disconnect();}});observer.observe($('app'),{childList:true});
}
var host=startHostGame;startHostGame=function(){var isCatch=S.mod==='catch';host();if(isCatch)layout('A');};
var guest=renderGuestUI;renderGuestUI=function(code){var isCatch=S.mod==='catch';guest(code);if(isCatch)layout('B');};
})();
