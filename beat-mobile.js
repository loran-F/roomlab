(function(){
'use strict';
window.beatMobileDraw=function(c,notes,lives,bpm){
 c.clearRect(0,0,340,400);c.fillStyle='#ffe8ac';c.fillRect(0,0,340,400);
 c.fillStyle='#f4d28b';c.fillRect(0,158,340,84);c.strokeStyle='#d5ad69';c.lineWidth=1;
 for(var x=25;x<340;x+=45){c.beginPath();c.moveTo(x,165);c.lineTo(x,235);c.stroke();}
 c.fillStyle='#f7bd51';c.fillRect(48,158,44,84);c.fillStyle='#30253a';c.fillRect(68,143,4,114);
 c.textAlign='center';c.font='bold 15px sans-serif';c.fillText('到线再点',70,126);
 c.font='13px sans-serif';c.fillStyle='#745744';c.fillText('音符从右侧进入  ←',210,284);
 notes.forEach(function(n){if(n.hit)return;var col=n.type==='A'?'#77c7e1':n.type==='B'?'#ffad67':'#c9a1e1';c.fillStyle=col;c.strokeStyle='#30253a';c.lineWidth=2.5;c.beginPath();c.arc(n.x,200,17,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#30253a';c.font='bold 13px sans-serif';c.textAlign='center';c.fillText(n.type,n.x,205);});
 c.fillStyle='#745744';c.font='bold 13px sans-serif';c.textAlign='left';c.fillText('机会 '+lives+' / 8',16,27);c.textAlign='right';c.fillText(bpm+' BPM',324,27);
};
function layout(role){
 var canvas=document.querySelector('#stage canvas');if(!canvas)return;
 var count=$('count').textContent,goal=$('goal').textContent,fb=$('fb');clearNetZones();
 $('app').innerHTML='<section class="beat-mobile"><header class="bt-top"><button id="back" aria-label="返回">‹</button><strong>信号节拍</strong><span id="count">'+count+'</span></header><div class="bt-status"><span id="goal">'+goal+'</span><span>蓝 A · 橙 B · 紫色一起</span></div><div class="bt-arena" id="stage"></div><div id="msg" class="msg" role="status">等音符进入黄色判定区，再点击下方按钮。</div><footer class="bt-controls"><div class="bt-role"><b class="'+role.toLowerCase()+'">'+role+'</b><span>你负责'+(role==='A'?'蓝色 A':'橙色 B')+'，紫色 AB 与同伴一起点</span></div><button id="bt-tap" class="'+role.toLowerCase()+'" disabled>♫ 点击'+(role==='A'?'蓝色 A':'橙色 B')+'节拍</button><p>点一下判定一次，无需长按</p></footer></section>';
 $('stage').appendChild(canvas);if(fb)$('app').appendChild(fb);$('back').onclick=gobackMenu;
 var button=$('bt-tap');button.onclick=function(){if(!button.disabled&&window._beatPress)window._beatPress(role);};
 var timer=setInterval(function(){if(!button.isConnected){clearInterval(timer);return;}var s=role==='B'&&window._guestState?window._guestState():null;button.disabled=!!window._dead||!!window._introLock||(role==='B'&&(!s||s.dead||s.win));},80);
 var conn=PEER.conn;function close(){button.disabled=true;clearInterval(timer);if($('msg'))$('msg').textContent='连接断开，请返回后重新建房。';}if(conn)conn.on('close',close);
 var observer=new MutationObserver(function(){if(!button.isConnected){clearInterval(timer);if(conn&&conn.off)conn.off('close',close);observer.disconnect();}});observer.observe($('app'),{childList:true});
}
var host=startHostBeat;startHostBeat=function(){host();layout('A');};
var guest=renderGuestBeat;renderGuestBeat=function(code){guest(code);layout('B');};
})();
