(function(){
'use strict';
var script=document.currentScript,base=new URL('../../assets/maze-resource-first/',script.src),query=new URL(script.src).search;
var ready=false,error=null,manifest=null,images={},pending=false,surfaces=new Map();
var keys=['rockA','rockB','platform','sign','pool','stump','button','panel'],letters=['甲','乙','丙'];
function url(file){var u=new URL(file,base);u.search=query;return u.href;}
function sprite(ctx,key,x,y,w,h){ctx.drawImage(images[key],x,y,w,h);}
function nine(ctx,key,w,h){var img=images[key],part=manifest.assets[key],s=part.slice;if(!s){sprite(ctx,key,0,0,w,h);return;}var border=Math.min((part.displayBorderCssPx||part.borderCss||12)*2,w/2,h/2),xs=[0,s.left,img.width-s.right,img.width],ys=[0,s.top,img.height-s.bottom,img.height],dx=[0,border,w-border,w],dy=[0,border,h-border,h];for(var r=0;r<3;r++)for(var c=0;c<3;c++)if(dx[c+1]>dx[c]&&dy[r+1]>dy[r])ctx.drawImage(img,xs[c],ys[r],xs[c+1]-xs[c],ys[r+1]-ys[r],dx[c],dy[r],dx[c+1]-dx[c],dy[r+1]-dy[r]);}
function drawFull(ctx,cell,state){
 if(!ready||!state||state.theme!=='mountain')return false;
 var m=state.map,notes=state.notes||[],w=ctx.canvas.width,h=ctx.canvas.height;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#c3cfcc';ctx.fillRect(0,0,w,h);
 ctx.save();ctx.beginPath();m.walls.forEach(function(row,r){row.split('').forEach(function(v,c){if(v==='1')ctx.rect(c*cell,r*cell,cell,cell);});});ctx.clip();ctx.fillStyle='#454560';ctx.fillRect(0,0,w,h);
 for(var r=0;r<m.walls.length;r+=2)for(var c=0;c<m.walls[0].length;c+=2)sprite(ctx,(r+c)%4?'rockA':'rockB',c*cell-cell*.22,r*cell-cell*.22,cell*2.44,cell*2.44);ctx.restore();
 ctx.strokeStyle='#292339';ctx.lineWidth=cell*.05;ctx.beginPath();m.walls.forEach(function(row,r){row.split('').forEach(function(v,c){if(v!=='1')return;var x=c*cell,y=r*cell;if(m.walls[r-1]&&m.walls[r-1][c]==='0'){ctx.moveTo(x,y);ctx.lineTo(x+cell,y);}if(m.walls[r+1]&&m.walls[r+1][c]==='0'){ctx.moveTo(x,y+cell);ctx.lineTo(x+cell,y+cell);}if(row[c-1]==='0'){ctx.moveTo(x,y);ctx.lineTo(x,y+cell);}if(row[c+1]==='0'){ctx.moveTo(x+cell,y);ctx.lineTo(x+cell,y+cell);}});});ctx.stroke();
 var names={'石台':'platform','路牌':'sign','水池':'pool','木桩':'stump'},point=function(p){return[(p[1]+.5)*cell,(p[0]+.5)*cell];};
 (m.location&&m.location.landmarks||[]).forEach(function(l){var p=point(l.at),z=cell*.62;sprite(ctx,names[l.name],p[0]-z/2,p[1]-z/2,z,z);});
 ctx.textAlign='center';ctx.textBaseline='middle';
 m.gatePoints.forEach(function(p,i){var q=point(p);ctx.fillStyle='#677aa6';ctx.strokeStyle='#292339';ctx.beginPath();ctx.arc(q[0],q[1],cell*.31,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#f1eef1';ctx.font='700 '+cell*.525+'px sans-serif';ctx.fillText(String(i+1),q[0],q[1]);});
 m.traps.forEach(function(p){var q=point(p),z=cell*.3;ctx.fillStyle='#af6780';ctx.beginPath();ctx.moveTo(q[0],q[1]-z);ctx.lineTo(q[0]+z,q[1]);ctx.lineTo(q[0],q[1]+z);ctx.lineTo(q[0]-z,q[1]);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.font='700 '+cell*.45+'px sans-serif';ctx.fillText('!',q[0],q[1]);});
 var e=point(m.end),z=cell*.325;ctx.fillStyle='#3c8588';ctx.fillRect(e[0]-z,e[1]-z,z*2,z*2);ctx.strokeRect(e[0]-z,e[1]-z,z*2,z*2);ctx.fillStyle='#fff';ctx.font='700 '+cell*.5+'px sans-serif';ctx.fillText('E',e[0],e[1]);
 (m.location&&m.location.sites||[]).forEach(function(p,i){var q=point(p),x=q[0]+cell*.24,y=q[1]-cell*.25;ctx.fillStyle=notes[i]===1?'#367d82':'#d6e4e0';ctx.strokeStyle='#292339';ctx.beginPath();ctx.moveTo(x-cell*.175,y-cell*.2);ctx.lineTo(x+cell*.2,y-cell*.175);ctx.lineTo(x+cell*.175,y+cell*.2);ctx.lineTo(x-cell*.2,y+cell*.175);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=notes[i]===1?'#fff':'#292339';ctx.font='700 '+cell*.3+'px sans-serif';ctx.fillText(letters[i],x,y);if(notes[i]===2){ctx.beginPath();ctx.moveTo(x-cell*.175,y-cell*.175);ctx.lineTo(x+cell*.175,y+cell*.175);ctx.stroke();}});
 return true;
}
function surface(el,key){var old=surfaces.get(el);if(old&&old.canvas.isConnected)return;if(old)old.observer.disconnect();var cv=document.createElement('canvas');cv.className='maze-art-surface';cv.setAttribute('aria-hidden','true');Array.from(el.childNodes).forEach(function(node){if(node.nodeType===3&&node.textContent){var copy=document.createElement('span');copy.className='maze-art-copy';copy.textContent=node.textContent;node.replaceWith(copy);}});el.prepend(cv);el.classList.add('maze-art-framed');function paint(){if(!el.isConnected)return;var w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;cv.width=Math.round(w*2);cv.height=Math.round(h*2);nine(cv.getContext('2d'),key,cv.width,cv.height);}var ro=new ResizeObserver(paint);surfaces.set(el,{canvas:cv,observer:ro});ro.observe(el);paint();}
function decorate(){
 pending=false;surfaces.forEach(function(value,el){if(!el.isConnected){value.observer.disconnect();surfaces.delete(el);}});
 var app=document.getElementById('app'),cv=document.getElementById('maze-map'),state=window.MazeMobile&&MazeMobile.artState&&MazeMobile.artState();
 if(!ready||!app||!cv||!state||state.theme!=='mountain'||app.dataset.mazeRole!=='B'){if(app&&app.classList.contains('maze-art-b'))app.classList.remove('maze-art-b');return;}
 if(!app.classList.contains('maze-art-b'))app.classList.add('maze-art-b');
 var back=document.getElementById('back');if(back&&back.textContent!=='☰')back.textContent='☰';
 var legend=app.querySelector('.maze-art-legend');if(!legend){legend=document.createElement('div');legend.className='maze-art-legend';[['platform','石台'],['sign','路牌'],['pool','水池'],['stump','木桩']].forEach(function(item){var wrap=document.createElement('span'),icon=document.createElement('canvas');icon.width=80;icon.height=70;icon.setAttribute('aria-hidden','true');sprite(icon.getContext('2d'),item[0],8,4,64,60);wrap.append(icon,document.createTextNode(item[1]));legend.append(wrap);});cv.closest('.stage').after(legend);}
 app.querySelectorAll('[data-candidate]').forEach(function(b){var i=Number(b.dataset.candidate),n=state.notes[i]||0,text='石台'+letters[i]+' · '+['未标记','候选','排除'][n];if(b.textContent!==text)b.textContent=text;if(b.dataset.artNote!==String(n))b.dataset.artNote=String(n);});
 var desc=document.getElementById('mz-candidate-description');if(desc){var text=desc.textContent.replace(/查阅石台 ([123])/g,function(_,n){return '查看石台'+letters[Number(n)-1];});if(text!==desc.textContent)desc.textContent=text;}
 app.querySelectorAll('button').forEach(function(b){surface(b,'button');});var top=app.querySelector('.topbar');if(top)surface(top,'panel');if(desc)surface(desc,'panel');drawFull(cv.getContext('2d'),32,state);
}
function schedule(){if(!pending){pending=true;requestAnimationFrame(decorate);}}
window.MazeArtSkin={active:function(){return ready;},drawFull:drawFull,status:function(){return{ready:ready,error:error};}};
new MutationObserver(schedule).observe(document.getElementById('app'),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-maze-role','class']});
var controller=new AbortController(),timeout=setTimeout(function(){controller.abort();},10000);
fetch(url('runtime-manifest.json'),{signal:controller.signal}).then(function(r){if(!r.ok)throw new Error('manifest unavailable');return r.json();}).then(function(data){manifest=data;return Promise.all(keys.map(function(key){if(!data.assets||!data.assets[key]||!data.assets[key].file)throw new Error('missing '+key);return new Promise(function(resolve,reject){var img=new Image(),imageTimeout=setTimeout(function(){reject(new Error('image timeout: '+key));},10000);img.onload=function(){clearTimeout(imageTimeout);images[key]=img;resolve();};img.onerror=function(){clearTimeout(imageTimeout);reject(new Error('image unavailable: '+key));};img.src=url(data.assets[key].file);});}));}).then(function(){ready=true;schedule();}).catch(function(e){error=e.message;}).finally(function(){clearTimeout(timeout);});
})();
