(function(){
  function polish(manual){
    var app=document.getElementById('app');app.classList.add('maze-mobile');
    var observer=new MutationObserver(function(){if(S.mod!=='maze'||!app.querySelector('canvas')){app.classList.remove('maze-mobile');observer.disconnect();}});observer.observe(app,{childList:true});
    var tip=app.querySelector(manual?'.mc':'.taskline');
    if(tip)tip.innerHTML=manual?'听 A 报图号，切换对应地图。规划避开红点的路线，先经过三个编号阀门，再到 E 出口。A 报现场符号，你查阀门表。':'你负责移动 · 向 B 报「图 '+(window._mazeSeed+1)+'」<br>先找到并打开三个阀门。向 B 报现场符号，再按他说的阀门；B 为你规划路线。';
    var dp=document.getElementById('dpad');if(dp){var names={up:'↑ 上',l:'← 左',d:'↓ 下',r:'右 →'};dp.querySelectorAll('button').forEach(function(b){b.textContent=names[b.dataset.d];b.setAttribute('aria-label',names[b.dataset.d]);});}
    if(manual){var title=app.querySelector('h3');if(title)title.textContent='B · 路线指挥';var card=app.querySelector('.manual-card');if(card&&!document.getElementById('maze-valve-table'))card.insertAdjacentHTML('beforeend','<div id="maze-valve-table" class="maze-valve-table"><b>阀门对照 · 听 A 报符号</b><p>○ / ◇ → 蓝阀　　△ / ☆ → 橙阀<br>□ / ⊕ → 绿阀</p><small>S 起点 · E 出口 · 红点陷阱 · 1/2/3 阀门</small></div>');}
  }
  var run=runMaze;runMaze=function(set){run(set);polish(false);};
  var manual=renderManual;renderManual=function(){var result=manual.apply(this,arguments);if(S.mod==='maze')polish(true);return result;};
})();
