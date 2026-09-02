// roomlab-v5 三步剪线规则验证脚本
// 规则：6 根线，按顺序剪 3 根（第 1 步看 6 根，剪完看剩余 5 根，再剪完看剩余 4 根，每次重新编号）
// 目标：任意随机线序，三步都必有唯一合法答案（规则自洽）
// 运行：node _genwires.js  （应输出 fail 0 / N）
function judgeStep(wires){
  var yellow=[]; for(var i=0;i<wires.length;i++) if(wires[i]==='yellow') yellow.push(i);
  if(yellow.length>=2) return yellow[1];
  if(yellow.length===1) return yellow[0];
  var blue=[]; for(var j=0;j<wires.length;j++) if(wires[j]==='blue') blue.push(j);
  if(blue.length>=3) return blue[2];
  if(blue.length>=1) return blue[0];
  var green=[]; for(var k=0;k<wires.length;k++) if(wires[k]==='green') green.push(k);
  if(green.length>=1) return green[0];
  return 0; // 全红 → 剪第 1 根
}
function genWires(){ var w=[]; for(var i=0;i<6;i++) w.push(['red','blue','yellow','green'][Math.floor(Math.random()*4)]); return w; }

var fail=0, N=100000;
for(var t=0;t<N;t++){
  var w=genWires();
  var a1=judgeStep(w);
  if(a1<0||a1>=6){ fail++; continue; }
  var r2=w.filter(function(_,i){ return i!==a1; });
  var a2=judgeStep(r2);
  if(a2<0||a2>=5){ fail++; continue; }
  var r3=r2.filter(function(_,i){ return i!==a2; });
  var a3=judgeStep(r3);
  if(a3<0||a3>=4){ fail++; continue; }
}
console.log('three-step wires: fail', fail, '/', N);
var samples=[];
for(var s=0;s<6;s++){ var w=genWires(); var b1=judgeStep(w); var r2=w.filter(function(_,i){return i!==b1;}); var b2=judgeStep(r2); var r3=r2.filter(function(_,i){return i!==b2;}); var b3=judgeStep(r3); samples.push(w.join(',')+' | cut '+(b1+1)+'->'+(b2+1)+'->'+(b3+1)+' (remaining reindexed)'); }
console.log('samples:'); samples.forEach(function(x){ console.log(' ', x); });
