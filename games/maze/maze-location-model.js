(function(root){
'use strict';
var dirs=[[-1,0,'上'],[0,1,'右'],[1,0,'下'],[0,-1,'左']];
function key(p){return p.join(',');}
function distance(a,b){return Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);}
function walk(m,p){return m.walls[p[0]]&&m.walls[p[0]][p[1]]==='0';}
function around(p){return dirs.map(function(d){return[p[0]+d[0],p[1]+d[1]];});}
function observation(m,p){return [p].concat(around(p)).map(function(q){var mark=(m.location&&m.location.landmarks||[]).find(function(l){return key(l.at)===key(q);});return !walk(m,q)?'岩壁':mark?mark.name:'通道';});}
function construct(m,tier,random){
 random=random||Math.random;
 var hazards=m.gatePoints.concat(m.traps,[m.end]),groups={},reachable=new Set(),queue=[m.gatePoints[0]];reachable.add(key(queue[0]));for(var z=0;z<queue.length;z++)around(queue[z]).forEach(function(q){if(walk(m,q)&&key(q)!==key(m.end)&&!reachable.has(key(q))){reachable.add(key(q));queue.push(q);}});
 m.walls.forEach(function(row,r){row.split('').forEach(function(v,c){var p=[r,c];if(v!=='0'||!reachable.has(key(p))||hazards.some(function(q){return distance(p,q)<=2;}))return;var shape=around(p).map(function(q){return walk(m,q)?1:0;}).join('');if(shape.split('1').length<3)return;(groups[shape]||(groups[shape]=[])).push(p);});});
 var options=[];
 Object.keys(groups).forEach(function(shape){var group=groups[shape];for(var i=0;i<group.length;i++)for(var j=i+1;j<group.length;j++)if(distance(group[i],group[j])>=5)options.push([group[i],group[j]]);});
 if(!options.length)return null;
 for(var attempt=0;attempt<options.length;attempt++){
  var sites=options[Math.floor(random()*options.length)].map(function(p){return p.slice();});
  if(tier>1){var extras=groups[around(sites[0]).map(function(q){return walk(m,q)?1:0;}).join('')].filter(function(p){return sites.every(function(q){return distance(p,q)>=5;});});if(extras.length)sites.push(extras[Math.floor(random()*extras.length)].slice());}
  var landmarks=sites.map(function(p){return{at:p.slice(),name:'石台'};}),probes=[],ok=true;
  sites.forEach(function(p,i){var choices=[];around(p).forEach(function(step,d){if(!walk(m,step))return;around(step).forEach(function(q){if(walk(m,q)&&distance(p,q)===2&&sites.every(function(s){return distance(s,q)>1;})&&!hazards.some(function(h){return key(q)===key(h);})&&!landmarks.some(function(l){return key(l.at)===key(q);}))choices.push({step:step,at:q,direction:d});});});if(!choices.length){ok=false;return;}var choice=choices[Math.floor(random()*choices.length)];landmarks.push({at:choice.at.slice(),name:['路牌','水池','木桩'][i]});probes.push(choice);});
  if(!ok)continue;
  var location={sites:sites,landmarks:landmarks};var view=Object.assign({},m,{location:location});
  if(!sites.every(function(p){return JSON.stringify(observation(view,p))===JSON.stringify(observation(view,sites[0]));}))continue;
  if(!probes.every(function(probe,i){var seen=JSON.stringify(observation(view,probe.step));return sites.filter(function(p){var d=dirs[probe.direction],q=[p[0]+d[0],p[1]+d[1]];return walk(m,q)&&JSON.stringify(observation(view,q))===seen;}).length===1;}))continue;
  return location;
 }
 return null;
}
function validate(m){var l=m.location;if(!l||Object.keys(l).some(function(k){return !['sites','landmarks'].includes(k);})||!Array.isArray(l.sites)||l.sites.length<2||l.sites.length>3||!Array.isArray(l.landmarks)||l.landmarks.length!==l.sites.length*2)return false;var point=function(p){return Array.isArray(p)&&p.length===2&&p.every(Number.isInteger)&&walk(m,p);};if(!l.sites.every(point)||new Set(l.sites.map(key)).size!==l.sites.length)return false;if(!l.landmarks.every(function(x){return x&&Object.keys(x).every(function(k){return ['at','name'].includes(k);})&&point(x.at)&&['石台','路牌','水池','木桩'].includes(x.name);})||new Set(l.landmarks.map(function(x){return key(x.at);})).size!==l.landmarks.length)return false;return l.sites.every(function(p){return JSON.stringify(observation(m,p))===JSON.stringify(observation(m,l.sites[0]));});}
root.MazeLocationModel={construct:construct,observation:observation,validate:validate,dirs:dirs};
})(typeof window==='undefined'?globalThis:window);

