(function(){
'use strict';
window.catchMobileDraw=function(c,px,items){
 c.clearRect(0,0,340,400);c.fillStyle='#ffe8ac';c.fillRect(0,0,340,400);c.strokeStyle='#eac98c';c.lineWidth=1;
 for(var y=45;y<350;y+=55){c.beginPath();c.moveTo(18,y);c.lineTo(322,y);c.stroke();}
 c.fillStyle='#dec38c';c.fillRect(0,365,340,3);c.fillStyle='#e9a342';c.strokeStyle='#30253a';c.lineWidth=3;c.beginPath();c.moveTo(px-32,338);c.lineTo(px+32,338);c.lineTo(px+25,362);c.lineTo(px-25,362);c.closePath();c.fill();c.stroke();c.fillStyle='#30253a';c.font='bold 12px sans-serif';c.textAlign='center';c.fillText('接收篮',px,354);
 items.forEach(function(it){c.lineWidth=2;c.strokeStyle='#30253a';c.fillStyle=it.type==='good'?'#91cba1':it.type==='gold'?'#ffcd55':'#ed8875';c.beginPath();if(it.type==='good')c.rect(it.x-10,it.y-10,20,20);else if(it.type==='gold'){c.moveTo(it.x,it.y-12);c.lineTo(it.x+12,it.y+10);c.lineTo(it.x-12,it.y+10);c.closePath();}else c.arc(it.x,it.y,11,0,Math.PI*2);c.fill();c.stroke();if(it.type==='bad'){c.fillStyle='#30253a';c.font='bold 14px sans-serif';c.fillText('×',it.x,it.y+5);}});
};
function layout(role){
 var canvas=document.querySelector('#stage canvas');if(!canvas)return;
 var count=$('count').textContent,goal=$('goal').textContent,fb=$('fb');clearNetZones();
 $('app').innerHTML='<section class="catch-mobile"><header class="ct-top"><button id="back" aria-label="返回">‹</button><strong>情报空投</strong><span id="count">'+count+'</span></header><div class="ct-status"><span id="goal">'+goal+'</span><span>绿箱 +1 · 金箱 +2 · 红色避开</span></div><div class="ct-arena" id="stage"></div><div id="msg" class="msg" role="status">移动接收篮接物资，遇到红色危险物及时避开。</div><footer class="ct-controls"><div class="ct-role"><b class="'+role.toLowerCase()+'">'+role+'</b><span>你负责'+(role==='A'?'左移':'右移')+'，两人共同控制接收篮</span></div><button id="ct-tap" class="'+role.toLowerCase()+'" disabled>'+(role==='A'?'← 按住向左移动':'按住向右移动 →')+'</button><p>按住移动，松手减速 · 可与同伴一起刹停</p></footer></section>';
 $('stage').appendChild(canvas);if(fb)$('app').appendChild(fb);$('back').onclick=gobackMenu;
 var button=$('ct-tap');function set(v){if(role==='A')window._inL=!!v;else if(window._guestSetDir)window._guestSetDir(v?1:0);}
 button.onpointerdown=function(e){if(button.disabled)return;e.preventDefault();button.setPointerCapture(e.pointerId);set(true);};button.onpointerup=button.onpointercancel=button.onlostpointercapture=function(){set(false);};
 function release(){set(false);}window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);
 var timer=setInterval(function(){if(!button.isConnected){clearInterval(timer);return;}var s=role==='B'&&window._guestState?window._guestState():null;button.disabled=!!window._dead||!!window._introLock||(role==='B'&&(!s||s.dead||s.win));},80);
 var conn=PEER.conn;function close(){release();button.disabled=true;clearInterval(timer);if($('msg'))$('msg').textContent='连接断开，请返回后重新建房。';}if(conn)conn.on('close',close);
 var observer=new MutationObserver(function(){if(!button.isConnected){clearInterval(timer);release();window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',release);if(conn&&conn.off)conn.off('close',close);observer.disconnect();}});observer.observe($('app'),{childList:true});
}
var host=startHostGame;startHostGame=function(){var isCatch=S.mod==='catch';host();if(isCatch)layout('A');};
var guest=renderGuestUI;renderGuestUI=function(code){var isCatch=S.mod==='catch';guest(code);if(isCatch)layout('B');};
})();
