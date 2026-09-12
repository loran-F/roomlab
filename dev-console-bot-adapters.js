/* Per-mode companion adapters. Each adapter receives one role window only. */
(function(g){
'use strict';
const guided={
 maze:{A:'听手动 B 指路后执行方向或关卡口令。',B:'读取自己的完整地图，向手动 A 给出路线；B 无正式操作。'},
 code:{A:'听手动 B 报数字后按本端数字键。',B:'查本端密码本，并把数字口述给手动 A。'},
 wires:{A:'听手动 B 报线号后在本端选线并确认。',B:'按本端规则给手动 A 报线号；救场时听符号选旁路。'},
 vault:{A:'准备好后由验收者发出口令开始扫描，再把逐位内容口述给手动 B。',B:'听手动 A 报位序与内容后，在本端记录并提交。'},
 pressure:{A:'听手动 B 报安全区间后执行加压、减压或松手。',B:'根据本端区间指挥手动 A；确认稳定后开阀。'},
 lookback:{A:'听手动 B 报怪物应对后选择前进、停步或躲藏。',B:'听手动 A 报门向后开门；怪物出现时自动显示应对口令。'},
 caller:{A:'听手动 B 指定核验项并操作提问、放行或拒绝。',B:'查本端档案，把核验项和结论口述给手动 A。'},
 evidence:{A:'交换证据后按口令选择人物、工具、时间并提交。',B:'交换证据后按口令选择人物、工具、时间并提交。'},
 boss:{A:'听手动 B 报弱点后攻击；防御阶段把本端来袭方向报给 B。',B:'把本端弱点报给手动 A；听 A 报来袭方向后举盾。'}
};
const automatic={
 dial:'根据本端信号质量自动试探并微调自己的旋钮。',catch:'根据本端可见落物自动控制自己负责的方向。',beam:'根据本端可见货物位置自动抬起自己一端。',beat:'根据本端可见音符自动点击自己的节拍；紫色仍显示同步口令。',lockbox:'按本端机关状态自动执行自己的滑块、锁销、齿轮和拉盖动作。',silhouette:'B 按本端目标自动转物；A 通过口令接收灯光方向。',mirrors:'按本端光路轮换自己的镜片并正常检查。',shadow:'按本端可见布局自动完成自己的录影或取钥匙路线。',pwslide:'跟随人工端首条位置调整自己的奇偶条并确认。',lightsearch:'A 真实默数开灯；B 仅按自己已看见的地图探索和收集。'
};
const codeSymbolDescriptions=[
 '外环缺口在下，分叉向左，实心点在左，菱形内横线，底钩向左',
 '外环缺口在下，分叉向左，实心点在右，菱形内竖线，底钩向左',
 '外环缺口在下，分叉向右，实心点在左，菱形内竖线，底钩向左',
 '外环缺口在下，分叉向右，实心点在右，菱形内横线，底钩向左',
 '外环缺口在右，分叉向左，实心点在左，菱形内竖线，底钩向左',
 '外环缺口在右，分叉向左，实心点在右，菱形内横线，底钩向左',
 '外环缺口在右，分叉向右，实心点在左，菱形内横线，底钩向左',
 '外环缺口在右，分叉向右，实心点在右，菱形内竖线，底钩向左',
 '外环缺口在下，分叉向左，实心点在左，菱形内竖线，底钩向右',
 '外环缺口在右，分叉向左，实心点在左，菱形内横线，底钩向右'
];
function capability(mode,role){
 if(role==='manual')return {supported:true,kind:'manual',detail:'双端手动：两端均由你操作。'};
 if(guided[mode])return {supported:true,kind:'guided',detail:guided[mode][role]||guided[mode].A};
 if(automatic[mode])return {supported:true,kind:mode==='silhouette'&&role==='A'?'guided':'automatic',detail:mode==='silhouette'&&role==='A'?'听手动 B 报灯光方向后执行口令。':automatic[mode]};
 return {supported:false,kind:'unsupported',detail:'当前玩法没有托管适配器。'};
}
const byText=(w,text)=>Array.from(w.document.querySelectorAll('button')).find(b=>!b.disabled&&!b.hidden&&b.getClientRects().length&&b.textContent.trim().includes(text));
function create(mode,role,h){
 const w=h.window,local={last:0,dir:1,quality:null,held:false,index:0,phase:null,seen:new Map(),path:[],target:null};
 const buttons=list=>list.map(x=>({id:x[0],label:x[1]}));
 function visibleCommands(){
  const d=w.document,s=h.state();
  if(mode==='maze'&&role==='A')return d.querySelector('#maze-valve:not([hidden])')?buttons(Array.from(d.querySelectorAll('#maze-valve [data-valve]')).map((button,i)=>['valve:'+i,'选择'+button.textContent.trim()])):buttons([['key:ArrowUp','向上移动'],['key:ArrowDown','向下移动'],['key:ArrowLeft','向左移动'],['key:ArrowRight','向右移动']]);
  if(mode==='maze'&&role==='B')return buttons(Array.from(d.querySelectorAll('.mz-valve-grid span')).map((span,i)=>['say-valve:'+i,'告诉 A：'+span.textContent.trim()]));
  if(mode==='code'&&role==='A')return buttons(Array.from({length:10},(_,i)=>['code:'+i,'输入 '+i]));
  if(mode==='code'&&role==='B'&&Array.isArray(s?.maps))return buttons(s.maps.flatMap((map,book)=>map.map((value,symbol)=>['say-code:'+book+':'+symbol+':'+value,String.fromCharCode(65+book)+' 册 · 符号 '+(symbol+1)+' → '+value])));
  if(mode==='code'&&role==='B')return buttons(codeSymbolDescriptions.map((x,i)=>['say-code:0:'+i+':'+i,x]));
  if(mode==='wires'){if(s?.rescue&&role==='B')return buttons(['△','○','□'].map(x=>['symbol:'+x,'选择旁路 '+x]));if(role==='A')return buttons(Array.from({length:8},(_,i)=>['wire:'+(i+1),'剪第 '+(i+1)+' 根']));return buttons(Array.from({length:8},(_,i)=>['say-wire:'+(i+1),'告诉同伴：剪第 '+(i+1)+' 根']));}
  if(mode==='vault'&&role==='B'){
   if(!s||!['show','write'].includes(s.phase))return [];
   const out=Array.from(d.querySelectorAll('.vm-slot[data-i]')).map((x,i)=>['slot:'+i,(x.getAttribute('aria-pressed')==='true'?'当前：':'选择：')+'第 '+(i+1)+' 格']);
   Array.from(d.querySelectorAll('#vm-keys [data-char]')).filter(x=>!x.disabled&&x.getClientRects().length).forEach(x=>out.push(['char:'+x.dataset.char,'输入 '+x.dataset.char]));
   const active=d.querySelector('[data-keyboard][aria-pressed="true"]')?.dataset.keyboard;
   if(s.cfg?.kind==='mixed')out.push(['bank:'+(active==='letters'?'digits':'letters'),active==='letters'?'切换数字键盘':'切换字母键盘']);
   if(d.querySelector('#vm-delete'))out.push(['delete','删除当前格']);
   if(d.querySelector('#vm-next'))out.push(['next','下一格']);
   if(!d.querySelector('#vm-submit')?.disabled)out.push(['submit','提交记录']);return buttons(out);
  }
  if(mode==='vault'&&role==='A'&&s?.phase==='read'&&!local.vaultStarted)return buttons([['vault:start','让托管A开始扫描']]);
  if(mode==='pressure')return role==='A'?buttons([['pressure:up','持续加压'],['pressure:down','持续减压'],['release','松开调节']]):[];
  if(mode==='lookback')return role==='A'?buttons([['x:go','前进'],['x:stop','停步'],['x:hide','躲藏']]):buttons([['x:left','开左门'],['x:right','开右门'],['x:lure','放诱饵']]);
  if(mode==='caller')return role==='A'?buttons([['x:code','询问工号'],['x:task','询问任务'],['x:route','询问来路'],['x:admit','放行'],['x:reject','拒绝']]):buttons(Array.from(d.querySelectorAll('[data-person]')).map(b=>['person:'+b.dataset.person,'查看档案：'+b.textContent.trim()]).concat([['x:admit','放行'],['x:reject','拒绝']]));
  if(mode==='evidence')return buttons(Array.from(d.querySelectorAll('[data-note]')).filter(b=>!b.disabled).map(b=>['note:'+b.dataset.note,'选择：'+b.textContent.trim()]).concat(d.querySelector('#pp-submit:not(:disabled)')?[['click:#pp-submit','提交证物']]:[]));
  if(mode==='boss')return buttons(Array.from(d.querySelectorAll('[data-mb]')).filter(b=>!b.disabled).map(b=>['mb:'+b.dataset.mb,b.textContent.trim()]));
  if(mode==='silhouette'&&role==='A')return buttons([['click:#pp-left','灯向左'],['click:#pp-right','灯向右']].concat((s?.tier===5?s.rot||[]:[]).map((_,i)=>['click:#pp-flip-'+i,'翻转物件 '+(i+1)])));
  if(mode==='beat')return buttons([['click:#bt-tap','同步点击']]);
  if(mode==='beam'&&(Number(s?.tier)>=5||Number(s?.config?.maxActive)>=6))return buttons([['beam:lift','按住本端抬高'],['release','松开本端']]);
  return [];
 }
 function command(id){
  if(id==='release'){h.release();return true;}
  if(id.startsWith('key:')){h.key(id.slice(4));return true;}
  if(id.startsWith('click:'))return h.click(id.slice(6));
  if(id.startsWith('valve:'))return h.click('[data-valve="'+id.slice(6)+'"]');
  if(id.startsWith('say-valve:')){const span=w.document.querySelectorAll('.mz-valve-grid span')[+id.slice(10)];if(!span)return false;h.report('告诉手动 A：选择 '+span.textContent.trim());return true;}
  if(id.startsWith('code:')){const n=id.slice(5),b=Array.from(w.document.querySelectorAll('.code-keypad button')).find(x=>!x.disabled&&x.textContent.trim()===n);return b?h.clickElement(b):false;}
  if(id.startsWith('wire:')){const n=id.slice(5);return h.click('[data-wire="'+n+'"]')&&h.click('#wm-cut');}
  if(id.startsWith('say-code:')){const p=id.split(':');h.report('告诉手动 A：'+String.fromCharCode(65+Number(p[1]))+' 册符号 '+(Number(p[2])+1)+' 对应数字 '+p[3]);return true;}
  if(id.startsWith('say-wire:')){h.report('告诉手动 A：剪第 '+id.slice(9)+' 根');return true;}
  if(id.startsWith('symbol:'))return h.click('[data-symbol="'+id.slice(7)+'"]');
  if(id.startsWith('slot:'))return h.click('.vm-slot[data-i="'+id.slice(5)+'"]');
  if(id.startsWith('char:')){h.key(id.slice(5).toLowerCase());return true;}
  if(id.startsWith('bank:'))return h.click('[data-keyboard="'+id.slice(5)+'"]');
  if(id==='delete')return h.click('#vm-delete');
  if(id==='next')return h.click('#vm-next');
  if(id==='submit')return h.click('#vm-submit');
  if(id==='vault:start'){
   const s=h.state();
   if(mode!=='vault'||role!=='A'||s?.phase!=='read'||local.vaultStarted)return false;
   local.vaultStarted=true;
   return h.click('#vm-start');
  }
  if(id.startsWith('x:'))return h.click('[data-x="'+id.slice(2)+'"]');
  if(id.startsWith('note:'))return h.click('[data-note="'+id.slice(5)+'"]');
  if(id.startsWith('mb:'))return h.click('[data-mb="'+id.slice(3)+'"]');
  if(id.startsWith('person:'))return h.click('[data-person="'+id.slice(7)+'"]');
  if(id==='pressure:up')return h.press?h.press('#rt-up'):false;
  if(id==='pressure:down')return h.press?h.press('#rt-down'):false;
  if(id==='beam:lift')return h.press?h.press('#bm-lift'):false;
  return false;
 }
 function pulse(selector,ms=240){if(local.held)return;local.held=true;h.hold(selector,ms).finally(()=>local.held=false);}
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 function beamPick(state){
  const bricks=Array.isArray(state.bricks)?state.bricks:[];
  const on=bricks.filter(brick=>brick&&typeof brick.id==='string'&&brick.phase==='on');
  const extreme=Number(state.tier)>=5||Number(state.config?.maxActive)>=6,near=extreme?22:18,ttl=extreme ? 0.15 : 0.2;
  const bankable=on.find(brick=>Math.abs((Number(brick.x)||170)-170)<=near);
  const urgent=on.filter(brick=>{const x=Number(brick.x)||170,vx=Number(brick.vx)||0,velocity=x<170?-vx:vx,distance=x<170?x-30:310-x;return velocity>2&&distance/velocity<ttl;}).sort((a,b)=>Math.min(Number(a.x)||170,340-(Number(a.x)||170))-Math.min(Number(b.x)||170,340-(Number(b.x)||170)))[0];
  return bankable||urgent||on[0]||null;
 }
 function beamSetTarget(id,phase){if(local.target!==id||local.phase!==phase){h.release();local.target=id;local.phase=phase;}}
 function tick(){
  const now=performance.now(),s=h.state();h.commands(visibleCommands());
  if(mode==='maze'&&role==='B'){
   const path=w.MazeMobile?.scenario?.()?.map?.path?.[0]||[];if(path.length){const directions=[];for(let i=1;i<path.length;i++){const a=path[i-1].split(',').map(Number),b=path[i].split(',').map(Number);directions.push(b[0]<a[0]?'↑':b[0]>a[0]?'↓':b[1]<a[1]?'←':'→');}h.report('安全路线：'+directions.join(' ')+'；遇关卡点让 A 报标记，再选下方对照');}else h.report('等待本端完整地图');return;
  }
  if(mode==='code'&&role==='B'){h.report('听手动 A 报册号和符号编号，再从本端密码本选择对应口令');return;}
  if(!s)return h.report('等待本端玩法状态');
  if(s.done)return h.stop(s.win?'本关成功，托管已停止':'本关失败，托管已停止');
  if(mode==='lightsearch'&&role==='B'){
   if(!s.started)return;for(const c of s.cells||[])local.seen.set(c.x+','+c.y,!c.wall);
   if(s.near?.type==='item'||s.near?.type==='exit'&&s.collected===s.required){h.click('#ls-interact');return h.report('操作本端附近的 '+s.near.label);}
   if(now-local.last<430)return;local.last=now;const start=s.player,key=p=>p.x+','+p.y,walk=[...local.seen].filter(x=>x[1]).map(x=>x[0]),walkSet=new Set(walk),objects=(s.objects||[]).filter(o=>!o.collected&&(o.type==='item'||o.type==='exit'&&s.collected===s.required));
   let goals=new Set(objects.map(key));if(!goals.size)for(const k of walk){const [x,y]=k.split(',').map(Number);if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!local.seen.has((x+dx)+','+(y+dy))))goals.add(k);}
   const q=[{x:start.x,y:start.y,first:null}],seen=new Set([key(start)]);let found=null;for(let i=0;i<q.length;i++){const p=q[i];if(goals.has(key(p))&&p.first){found=p;break;}for(const [name,dx,dy] of [['right',1,0],['left',-1,0],['down',0,1],['up',0,-1]]){const n={x:p.x+dx,y:p.y+dy,first:p.first||name};if(walkSet.has(key(n))&&!seen.has(key(n))){seen.add(key(n));q.push(n);}}}
   if(found){pulse('[data-ls-dir="'+found.first+'"]',300);return h.report('只沿本端已看见的通道探索');}return h.report('等待下一次亮灯看清新通道');
  }
  if(guided[mode]){
   if(mode==='wires'&&role==='B'){h.report((s.rules||[]).join(' '));return;}
   if(mode==='vault'&&role==='A'){
    if(s.phase!=='read')local.vaultSawAway=true;
    else if(local.vaultSawAway){local.vaultStarted=false;local.vaultSawAway=false;}
    if(s.phase==='read')h.report(local.vaultStarted?'扫描启动中，请等待':'准备好后点击“让托管A开始扫描”');
    else if(s.phase==='show'&&s.clue!==undefined)h.report('告诉手动 B：第 '+(s.index+1)+' 位是 '+s.clue);
    return;
   }
   if(mode==='pressure'&&role==='B'){
    const shouldRelease=s.requireRelease||s.phase!=='stable'||s.feedback==='outside'||s.feedback==='damage'||Number(s.heatB)>=82||Number(s.cooldown)>0;
    if(shouldRelease)h.release();else(h.press?h.press('#rt-action'):pulse('#rt-action',650));
    if(Number.isFinite(s.lo))h.report('告诉手动 A：安全区间 '+Math.round(s.lo)+'—'+Math.round(s.hi)+(shouldRelease?'；阀门已松开':'；正在校准'));
    else h.report('区间迁移中，阀门已松开');
    return;
   }
   else if(mode==='lookback'&&role==='B'&&['warning','danger'].includes(s.phase)){const word=s.decoy?'前进':s.paired?'躲藏':{ears:'停步',eyes:'前进',nose:'躲藏'}[s.monster];if(word)h.report('告诉手动 A：第 '+(Number(s.threatIndex)+1)+' / '+(Number(s.threatCount)||1)+' 段 '+word);}
   else if(mode==='caller'&&role==='B'&&s.checks){const selected=w.document.querySelector('.caller-people .selected')?.textContent.trim(),versions=Array.from(w.document.querySelectorAll('.x-roster .caller-version')).map(x=>x.textContent.trim().replace(/\s+/g,' '));h.report('告诉手动 A：本轮核验 '+s.checks.map(x=>({code:'工号',task:'任务',route:'来路'})[x]).join('＋')+(selected&&versions.length?'；'+selected+'：'+versions.join('；'):''));}
   else if(mode==='evidence'&&s.clues)h.report('向手动端读出本端证据：'+s.clues.join('；'));
   else h.report(capability(mode,role).detail);return;
  }
  if(mode==='dial'){
   if(now-local.last<330)return;local.last=now;
   if(s.quality>.86){h.release();local.quality=s.quality;return h.report('本端已对准，保持');}
   if(local.quality!==null&&s.quality<local.quality-.015)local.dir*=-1;local.quality=s.quality;pulse(local.dir>0?'#radio-plus':'#radio-minus',260);return h.report('按本端波形试探 '+(local.dir>0?'增加':'降低'));
  }
  if(mode==='lockbox'){
   if(s.stage===0){if(role===s.observer)(h.maintain?h.maintain('#pp-hold'):h.press?h.press('#pp-hold'):pulse('#pp-hold',500));else{h.release();if(role===s.operator&&s.holds?.[s.observer])h.click('#pp-slide');}}
   else if(s.stage===1){if(role===s.observer){h.release();if(s.aligned)h.click('#pp-latch');}else if(role===s.operator){if(s.braceRequired&&now-local.last<1050)(h.maintain?h.maintain('#pp-hold'):h.press('#pp-hold'));else if(now-local.last>=1050){h.release();local.last=now;h.click('#pp-gear');}}else h.release();}
   else(h.maintain?h.maintain('#pp-hold'):h.press?h.press('#pp-hold'):pulse('#pp-hold',Math.ceil((Number(s.pullGoal)||2)*1000)+800));return h.report(s.stage===2?'持续拉住本端把手，等待同伴共同保持 '+s.pullGoal+' 秒':'按本端公开机关反馈配合');
  }
  if(mode==='silhouette'&&role==='B'){
   for(let i=0;i<s.rot.length;i++)if(s.rot[i]!==s.targetRot[i]){local.silCheckSig=null;h.click('#pp-rot-'+i);return h.report('旋转本端第 '+(i+1)+' 件物体');}
   if(s.targetFlips&&s.flips?.some((v,i)=>v!==s.targetFlips[i])){local.silCheckSig=null;return h.report('转向已对齐；请 A 按目标轮廓翻转标记的物件');}
   if(s.lamp!==s.targetLamp){local.silCheckSig=null;return h.report('物体已对齐，等待 A 调整灯光');}
   const sig=[s.lamp,s.targetLamp,...s.rot,...s.targetRot].join(':');
   if(local.silCheckSig!==sig){local.silCheckSig=sig;h.click('#pp-check');}
   return h.report('轮廓已对齐，核对');
  }
  if(mode==='mirrors'){
   if(now-local.last<450)return;local.last=now;const own=s.mirrors.map((m,i)=>m.owner===role?i:-1).filter(i=>i>=0),other=s.mirrors.filter(m=>m.owner!==role).map(m=>m.rot).join('');if(!own.length)return;
   if(local.phase!==s.revision+':'+other){local.phase=s.revision+':'+other;local.index=0;}if(s.beam?.hit){h.click('#pp-check');return h.report('本端光路已接通，正常检查接收器');}
   if(local.index>=(1<<own.length))return h.report('本端组合已检查，等待手动端调整另一侧镜片');
   const goal=local.index++;for(let j=0;j<own.length;j++)if(s.mirrors[own[j]].rot!==((goal>>j)&1)){h.click('#pp-mirror-'+own[j]);return;}return h.report('轮换本端镜片，观察共享光路');
  }
  if(mode==='shadow'){
   const pos=s.positions[role],layout=s.layout,button=layout.button,exit=s.exit;
   const moveTo=target=>{if(pos===target)return false;const increase=pos<target,key=increase?(layout.mirror?'left':'right'):(layout.mirror?'right':'left');h.click('[data-x="'+key+'"]');return true;};
   if(role==='A'){
    if(['plan','retry','escape'].includes(s.phase))return void h.click('[data-x="record"]');
    if(s.phase==='record'){const holdRatio=layout.keyLatches===false ? 0.62 : 0.55,target=s.recordTime<s.recordLength*holdRatio?button:exit;moveTo(target);}
   }else{
    if(s.phase==='waiting')h.click('[data-x="replay"]');
    if(['replay','escape'].includes(s.phase)){const target=s.keyCollected?exit:6;moveTo(target);}
   }return h.report('按本端布局执行影子协作');
  }
  if(mode==='beam'){
   const bricks=Array.isArray(s.bricks)?s.bricks:[],rescueId=typeof s.rescue==='string'?s.rescue:s.rescue&&typeof s.rescue.brick==='string'?s.rescue.brick:null,rescue=rescueId?bricks.find(brick=>brick&&brick.id===rescueId&&brick.phase==='rescue'):null;
   if(rescue){beamSetTarget(rescue.id,'rescue');h.press?h.press('#bm-lift'):pulse('#bm-lift',680);return h.report('协助救援 '+rescue.id+'，等待另一端共同抬升');}
   const b=beamPick(s);
   const extreme=Number(s.tier)>=5||Number(s.config?.maxActive)>=6;
   if(extreme){h.release();return h.report('第五档使用协作口令：观察共享横梁后按住或松开本端，和人工端共同搬运');}
   const base=250,feed=0.24,near=18;
   if(!b){beamSetTarget(null,'level');const y=role==='A'?Number(s.yL):Number(s.yR),vy=role==='A'?Number(s.vyL):Number(s.vyR),want=y+vy*feed>base;if(want)(h.press?h.press('#bm-lift'):pulse('#bm-lift',220));else h.release();return h.report('暂无可操作货物，提前稳定落点');}
   beamSetTarget(b.id,b.phase);const x=Number(b.x)||170,vx=Number(b.vx)||0,dx=x-170,outward=(x<80&&vx<0)||(x>260&&vx>0),bankable=Math.abs(dx)<=near,glass=bricks.some(item=>item&&item.phase==='on'&&item.type===2);let desired=bankable?0:clamp(-dx*3-vx*6,glass?-55:-100,glass?55:100);const targetY=role==='A'?base-desired/2:base+desired/2,y=role==='A'?Number(s.yL):Number(s.yR),vy=role==='A'?Number(s.vyL):Number(s.vyR),want=y+vy*feed>targetY;if(want)(h.press?h.press('#bm-lift'):pulse('#bm-lift',250));else h.release();return h.report('跟踪 '+b.id+'：'+(outward?'提前阻止外滑':bankable?'稳定入库':'持续搬运'));
  }
  if(mode==='catch'){
   const v=w.RoomDirectCore?.catchState?.()||(role==='A'?w._hostState?.():w._guestState?.()),items=Array.isArray(v?.items)?v.items:[],px=v?.px;if(!Number.isFinite(px))return;const projected=item=>(Number(item.x)||0)+(Number(item.vx)||0)*Math.max(0,(390-(Number(item.y)||0))/Math.max(20,Number(item.vy)||20)),good=items.filter(x=>x.type!=='bad').sort((a,b)=>(Number(b.y)||0)-(Number(a.y)||0))[0],bad=items.filter(x=>x.type==='bad'&&(Number(x.y)||0)>285&&Math.abs(projected(x)-px)<42)[0],targetX=good?projected(good):px,want=bad?(role==='A'?projected(bad)>=px:projected(bad)<px):good?(role==='A'?targetX<px:targetX>px):false;if(want)pulse('#ct-tap',260);else h.release();return h.report('根据本端公开落点'+(want?'移动':'等待'));
  }
  if(mode==='beat'){
   const v=role==='A'?w._host:(w._guestState&&w._guestState()),notes=v?.notes||[];const note=notes.find(n=>!n.hit&&n.x>=48&&n.x<=92&&(n.type===role||n.type==='AB'));if(note){h.click('#bt-tap');if(note.type==='AB')h.commands(buttons([['click:#bt-tap','告诉同伴：现在同步按']]));}return h.report(note?.type==='AB'?'紫色音符：请手动端同步按':'读取本端音符');
  }
  h.report(capability(mode,role).detail);
 }
 return {tick,command,commands:visibleCommands,dispose(){h.release();}};
}
g.DevConsoleBotAdapters=Object.freeze({capability,create,modes:Object.freeze([...Object.keys(guided),...Object.keys(automatic)])});
})(window);
