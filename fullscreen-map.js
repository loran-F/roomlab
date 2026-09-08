(function(){
'use strict';
var lastRoom=null,savedScroll={},toastTimer;
function key(){return selectedRoomId+':'+(window._netMode||'host');}
function centerSelf(animate){var viewport=document.querySelector('.scroll-paper'),node=DUNGEON&&dgNode(DUNGEON[window._netMode==='guest'?'posB':'posA']);if(!viewport||!node)return;viewport.scrollTo({top:node.y/100*dgMapHeight()-viewport.clientHeight*.68,behavior:animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});}
var oldDraw=dgDrawMap;dgDrawMap=function(){
 var map=$('dgmap'),viewport=document.querySelector('.scroll-paper');if(!map||!viewport||!DUNGEON)return oldDraw();
 var layers=Array.from(new Set(DUNGEON.nodes.map(function(n){return n.layer;}))).sort(function(a,b){return a-b;});
 var height=Math.max(viewport.clientHeight,160+Math.max(1,layers.length-1)*140),gap=(height-160)/Math.max(1,layers.length-1);
 map.style.setProperty('--map-height',height+'px');
 DUNGEON.nodes.forEach(function(n){n.y=(80+(layers.length-1-layers.indexOf(n.layer))*gap)/height*100;});
 var top=viewport.scrollTop,bar=$('dg-nodeprogress'),oldHeight=map.clientHeight;
 oldDraw();
 if(bar){map.appendChild(bar);var n=dgNode(bar.dataset.node);if(n){bar.style.top=(n.y/100*height+44)+'px';bar.style.left=(n.x/100*map.clientWidth-32)+'px';}}
 viewport.scrollTop=top;
};
var oldMsg=dgMsg;dgMsg=function(html){oldMsg(html);var el=$('dgmsg');if(!el)return;el.setAttribute('role','status');clearTimeout(toastTimer);toastTimer=setTimeout(function(){if(el.isConnected)el.style.display='none';},4500);};
var oldShell=renderDungeonMapShell;renderDungeonMapShell=function(role,code){
 var before=document.querySelector('.dungeon-screen'),previous=before&&before.querySelector('.scroll-paper');if(previous)savedScroll[key()]=previous.scrollTop;
 oldShell(role,code);
 var shell=document.querySelector('.dungeon-screen');if(!shell)return;
 shell.querySelectorAll('.coop-theme').forEach(function(el){el.remove();});
 if(!shell.dataset.fullscreen){
  shell.dataset.fullscreen='true';
  var top=shell.querySelector('.dg-topline'),title=shell.querySelector('.dg-room-code');title.className='dg-map-title';title.textContent=selectedRoom().name;title.title=selectedRoom().name;
  var help=document.createElement('button');help.className='dg-help';help.type='button';help.textContent='?';help.setAttribute('aria-label','地图操作说明');help.setAttribute('aria-expanded','false');top.appendChild(help);
  var info=document.createElement('div');info.className='dg-map-help';info.hidden=true;info.id='dg-map-help';info.innerHTML='上下滑动查看路线，点击相邻节点前进。两人停在同一节点 3 秒开始。<br>黄色可前往，绿色已完成，锁图标表示未解锁。<br>房间码：'+code+' · 你控制 '+role;help.setAttribute('aria-controls',info.id);help.onclick=function(){info.hidden=!info.hidden;help.setAttribute('aria-expanded',String(!info.hidden));};shell.appendChild(info);
  var msg=$('dgmsg');shell.appendChild(msg);msg.style.display='none';
  shell.querySelectorAll('.dg-heading,.dg-footer,.dg-legend').forEach(function(el){el.remove();});
  var tools=document.createElement('div');tools.className='dg-map-tools';tools.innerHTML='<button type="button" aria-label="回到我的地图位置"><span class="dg-role-dot'+(role==='B'?' b':'')+'">'+role+'</span>回到我</button>';tools.querySelector('button').onclick=function(){centerSelf(true);};shell.appendChild(tools);
  var viewport=shell.querySelector('.scroll-paper');viewport.setAttribute('tabindex','0');viewport.setAttribute('role','region');viewport.setAttribute('aria-label','密室路线地图，可上下滚动');
  var start=null,moved=false;
  viewport.addEventListener('pointerdown',function(e){start={x:e.clientX,y:e.clientY};moved=false;},{passive:true});
  viewport.addEventListener('pointermove',function(e){if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>9)moved=true;},{passive:true});
  viewport.addEventListener('pointercancel',function(){moved=true;start=null;});
  viewport.addEventListener('click',function(e){if(moved){e.preventDefault();e.stopImmediatePropagation();}start=null;},true);
  viewport.addEventListener('scroll',function(){savedScroll[key()]=viewport.scrollTop;},{passive:true});
  viewport.addEventListener('keydown',function(e){if(e.key==='Escape'){info.hidden=true;help.setAttribute('aria-expanded','false');}if(e.key==='Enter'||e.key===' ')moved=false;});
  dgDrawMap();
  if(lastRoom!==DUNGEON){lastRoom=DUNGEON;centerSelf(false);}else if(savedScroll[key()]!==undefined)viewport.scrollTop=savedScroll[key()];else centerSelf(false);
 }
 shell.style.setProperty('--viewport-height',shell.querySelector('.scroll-paper').clientHeight+'px');
};
})();
