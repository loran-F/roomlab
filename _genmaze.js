// 生成固定迷宫 + BFS 验证 + 最短路径
function gen(rows, cols, seed){
  let s = seed>>>0;
  const rnd = () => (s = (s*1664525+1013904223)>>>0) / 4294967296;
  const H = rows, W = cols;
  const gR = H*2+1, gC = W*2+1;
  const grid = Array.from({length:gR}, ()=>Array(gC).fill(1));
  for(let r=0;r<H;r++) for(let c=0;c<W;c++) grid[2*r+1][2*c+1]=0;
  const stack=[[0,0]]; const visited=new Set(['0,0']);
  const dirs=[[0,1],[0,-1],[1,0],[-1,0]];
  while(stack.length){
    const [r,c]=stack[stack.length-1];
    const nbs=[];
    for(const [dr,dc] of dirs){
      const nr=r+dr, nc=c+dc;
      if(nr<0||nc<0||nr>=H||nc>=W) continue;
      if(!visited.has(nr+','+nc)) nbs.push([nr,nc,dr,dc]);
    }
    if(!nbs.length){ stack.pop(); continue; }
    const [nr,nc,dr,dc]=nbs[Math.floor(rnd()*nbs.length)];
    grid[2*r+1+dr][2*c+1+dc]=0;
    visited.add(nr+','+nc); stack.push([nr,nc]);
  }
  grid[0][0]=0;
  grid[1][1]=0; grid[0][1]=0;
  grid[1][14]=0; grid[0][14]=0;
  return grid;
}
const G = gen(5,7,20260901);
const R=G.length, C=G[0].length;
const q=[[0,0]]; const prev={}; const seen=new Set(['0,0']);
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
while(q.length){
  const [r,c]=q.shift();
  for(const [dr,dc] of dirs){
    const nr=r+dr,nc=c+dc;
    if(nr<0||nc<0||nr>=R||nc>=C||G[nr][nc]===1||seen.has(nr+','+nc)) continue;
    seen.add(nr+','+nc); prev[nr+','+nc]=r+','+c; q.push([nr,nc]);
  }
}
console.log('reachable:', seen.size, '/', (R*C - G.flat().filter(x=>x===1).length));
console.log('E reachable:', seen.has('0,14'));
const path=[]; let cur='0,14';
while(cur){ path.push(cur); cur=prev[cur]; }
path.reverse();
console.log('path len:', path.length);
for(let r=0;r<R;r++){
  let line='';
  for(let c=0;c<C;c++){
    const key=r+','+c;
    if(key==='0,0') line+='S';
    else if(key==='0,8') line+='E';
    else if(path.includes(key)) line+='*';
    else if(G[r][c]===0) line+='.';
    else line+='#';
  }
  console.log(line);
}
// 输出硬编码
const wallRows = G.map(row => row.map(v=>v===1?1:0).join(''));
console.log('WALLS', JSON.stringify(wallRows));
console.log('PATH', JSON.stringify(path));
