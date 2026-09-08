(function(){
  function polish(manual){
    var app=document.getElementById('app');app.classList.add('maze-mobile');
    var observer=new MutationObserver(function(){if(S.mod!=='maze'||!app.querySelector('canvas')){app.classList.remove('maze-mobile');observer.disconnect();}});observer.observe(app,{childList:true});
    var tip=app.querySelector(manual?'.mc':'.taskline');
    if(tip)tip.innerHTML=manual?'听 A 报图号，切换对应地图。沿绿线逐步报方向；红点是陷阱，S 是起点，E 是出口。':'你负责移动 · 向 B 报「图 '+(window._mazeSeed+1)+'」<br>只看得到身边五格，听指挥点方向。碰墙 −5 秒，陷阱 −8 秒。';
    var dp=document.getElementById('dpad');if(dp){var names={up:'↑ 上',l:'← 左',d:'↓ 下',r:'右 →'};dp.querySelectorAll('button').forEach(function(b){b.textContent=names[b.dataset.d];b.setAttribute('aria-label',names[b.dataset.d]);});}
    if(manual){var title=app.querySelector('h3');if(title)title.textContent='B · 路线指挥';}
  }
  var run=runMaze;runMaze=function(set){run(set);polish(false);};
  var manual=renderManual;renderManual=function(){var result=manual.apply(this,arguments);if(S.mod==='maze')polish(true);return result;};
})();
