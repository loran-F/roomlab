/* Per-mode companion adapters. Each adapter receives one role window only. */
(function(g){
'use strict';
const guided={
 maze:{A:'听手动 B 指路后执行方向或阀门口令。',B:'读取自己的完整地图，向手动 A 给出路线；B 无正式操作。'},
 code:{A:'听手动 B 报数字后按本端数字键。',B:'查本端密码本，并把数字口述给手动 A。'},
 wires:{A:'听手动 B 报线号后在本端选线并确认。',B:'按本端规则给手动 A 报线号；救场时听符号选旁路。'},
 vault:{A:'本端自动开始扫描并把逐位内容口述给手动 B。',B:'听手动 A 报位序与内容后，在本端记录并提交。'},
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
  if(mode==='maze'&&role==='A')return d.querySelector('#maze-valve:not([hidden])')?buttons([['valve:0','选择蓝阀'],['valve:1','选择橙阀'],['valve:2','选择绿阀']]):buttons([['key:ArrowUp','向上移动'],['key:ArrowDown','向下移动'],['key:ArrowLeft','向左移动'],['key:ArrowRight','向右移动']]);
  if(mode==='maze'&&role==='B')return buttons([['say-valve:0','A 看到 ○ 或 ◇'],['say-valve:1','A 看到 △ 或 ☆'],['say-valve:2','A 看到 □ 或 ⊕']]);
  if(mode==='code'&&role==='A')return buttons(Array.from({length:10},(_,i)=>['code:'+i,'输入 '+i]));
  if(mode==='code'&&role==='B')return buttons(codeSymbolDescriptions.map((x,i)=>['say-code:'+i,x]));
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
  if(mode==='pressure')return role==='A'?buttons([['key:ArrowUp','加压'],['key:ArrowDown','减压'],['release','松手']]):buttons([['key:Space','开阀'],['release','关阀']]);
  if(mode==='lookback')return role==='A'?buttons([['x:go','前进'],['x:stop','停步'],['x:hide','躲藏']]):buttons([['x:left','开左门'],['x:right','开右门'],['x:lure','放诱饵']]);
  if(mode==='caller')return role==='A'?buttons([['x:code','询问工号'],['x:task','询问任务'],['x:route','询问来路'],['x:admit','放行'],['x:reject','拒绝']]):buttons([['x:admit','放行'],['x:reject','拒绝']]);
  if(mode==='evidence')return buttons(Array.from(d.querySelectorAll('[data-note]')).filter(b=>!b.disabled).map(b=>['note:'+b.dataset.note,'选择：'+b.textContent.trim()]).concat(d.querySelector('#pp-submit:not(:disabled)')?[['click:#pp-submit','提交证物']]:[]));
  if(mode==='boss')return buttons(Array.from(d.querySelectorAll('[data-mb]')).filter(b=>!b.disabled).map(b=>['mb:'+b.dataset.mb,b.textContent.trim()]));
  if(mode==='silhouette'&&role==='A')return buttons([['click:#pp-left','灯向左'],['click:#pp-right','灯向右']]);
  if(mode==='beat')return buttons([['click:#bt-tap','同步点击']]);
  return [];
 }
 function command(id){
  if(id==='release'){h.release();return true;}
  if(id.startsWith('key:')){h.key(id.slice(4));return true;}
  if(id.startsWith('click:'))return h.click(id.slice(6));
  if(id.startsWith('valve:'))return h.click('[data-valve="'+id.slice(6)+'"]');
  if(id.startsWith('say-valve:')){h.report('告诉手动 A：选择 '+['蓝阀','橙阀','绿阀'][+id.slice(10)]);return true;}
  if(id.startsWith('code:')){const n=id.slice(5),b=Array.from(w.document.querySelectorAll('.code-keypad button')).find(x=>!x.disabled&&x.textContent.trim()===n);return b?h.clickElement(b):false;}
  if(id.startsWith('wire:')){const n=id.slice(5);return h.click('[data-wire="'+n+'"]')&&h.click('#wm-cut');}
  if(id.startsWith('say-code:')){h.report('告诉手动 A：输入数字 '+id.slice(9));return true;}
  if(id.startsWith('say-wire:')){h.report('告诉手动 A：剪第 '+id.slice(9)+' 根');return true;}
  if(id.startsWith('symbol:'))return h.click('[data-symbol="'+id.slice(7)+'"]');
  if(id.startsWith('slot:'))return h.click('.vm-slot[data-i="'+id.slice(5)+'"]');
  if(id.startsWith('char:')){h.key(id.slice(5).toLowerCase());return true;}
  if(id.startsWith('bank:'))return h.click('[data-keyboard="'+id.slice(5)+'"]');
  if(id==='delete')return h.click('#vm-delete');
  if(id==='next')return h.click('#vm-next');
  if(id==='submit')return h.click('#vm-submit');
  if(id.startsWith('x:'))return h.click('[data-x="'+id.slice(2)+'"]');
  if(id.startsWith('note:'))return h.click('[data-note="'+id.slice(5)+'"]');
  if(id.startsWith('mb:'))return h.click('[data-mb="'+id.slice(3)+'"]');
  return false;
 }
 function pulse(selector,ms=240){if(local.held)return;local.held=true;h.hold(selector,ms).finally(()=>local.held=false);}
 function tick(){
  const now=performance.now(),s=h.state();h.commands(visibleCommands());
  if(mode==='maze'&&role==='B'){
   const path=w.MazeMobile?.scenario?.()?.map?.path?.[0]||[];if(path.length){const directions=[];for(let i=1;i<path.length;i++){const a=path[i-1].split(',').map(Number),b=path[i].split(',').map(Number);directions.push(b[0]<a[0]?'↑':b[0]>a[0]?'↓':b[1]<a[1]?'←':'→');}h.report('安全路线：'+directions.join(' ')+'；遇阀门让 A 报符号，再选下方对照');}else h.report('等待本端完整地图');return;
  }
  if(mode==='code'&&role==='B'){h.report('让手动 A 按外环缺口、分叉、实心点、内线、底钩描述符号，再选下方匹配项');return;}
  if(!s)return h.report('等待本端玩法状态');
  if(s.done)return h.stop(s.win?'本关成功，托管已停止':'本关失败，托管已停止');
  if(mode==='lightsearch'&&role==='B'){
   if(!s.started)return;for(const c of s.cells||[])local.seen.set(c.x+','+c.y,!c.wall);
   if(s.near?.type==='item'||s.near?.type==='exit'&&s.collected===s.required){h.click('#ls-interact');return h.report('操作本端附近的 '+s.near.label);}
   if(now-local.last<430)return;local.last=now;const start=s.player,key=p=>p.x+','+p.y,walk=[...local.seen].filter(x=>x[1]).map(x=>x[0]),walkSet=new Set(walk),objects=(s.objects||[]).filter(o=>!o.collected&&(o.type==='item'||o.type==='exit'&&s.collected===s.required));
   let goals=new Set(objects.map(key));if(!goals.size)for(const k of walk){const [x,y]=k.split(',').map(Number);if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!local.seen.has((x+dx)+','+(y+dy))))goals.add(k);}
   const q=[{x:start.x,y:start.y,first:null}],seen=new Set([key(start)]);let found=null;for(let i=0;i<q.length;i++){const p=q[i];if(goals.has(key(p))&&p.first){found=p;break;}for(const [name,dx,dy] of [['right',1,0],['left',-1,0],['down',0,1],['up',0,-1]]){const n={x:p.x+dx,y:p.y+dy,first:p.first||name};if(walkSet.has(key(n))&&!seen.has(key(n))){seen.add(key(n));q.push(n);}}}
   if(found){h.click('[data-ls-dir="'+found.first+'"]');return h.report('只沿本端已看见的通道探索');}return h.report('等待下一次亮灯看清新通道');
  }
  if(guided[mode]){
   if(mode==='wires'&&role==='B'){h.report((s.rules||[]).join(' '));return;}
   if(mode==='vault'&&role==='A'){if(s.phase==='read')h.click('#vm-start');else if(s.phase==='show'&&s.clue!==undefined)h.report('告诉手动 B：第 '+(s.index+1)+' 位是 '+s.clue);return;}
   if(mode==='pressure'&&role==='B'&&Number.isFinite(s.lo))h.report('告诉手动 A：安全区间 '+Math.round(s.lo)+'—'+Math.round(s.hi));
   else if(mode==='lookback'&&role==='B'&&['warning','danger'].includes(s.phase)){const word={ears:'停步',eyes:'前进',nose:'躲藏'}[s.monster];if(word)h.report('告诉手动 A：'+word);}
   else if(mode==='caller'&&role==='B'&&s.checks)h.report('告诉手动 A：本轮核验 '+s.checks.map(x=>({code:'工号',task:'任务',route:'来路'})[x]).join('＋'));
   else if(mode==='evidence'&&s.clues)h.report('向手动端读出本端证据：'+s.clues.join('；'));
   else h.report(capability(mode,role).detail);return;
  }
  if(mode==='dial'){
   if(now-local.last<330)return;local.last=now;
   if(s.quality>.86){h.release();local.quality=s.quality;return h.report('本端已对准，保持');}
   if(local.quality!==null&&s.quality<local.quality-.015)local.dir*=-1;local.quality=s.quality;pulse(local.dir>0?'#radio-plus':'#radio-minus',260);return h.report('按本端波形试探 '+(local.dir>0?'增加':'降低'));
  }
  if(mode==='lockbox'){
   if(s.stage===0){if(role==='A')h.click('#pp-slide');else pulse('#pp-hold',500);}
   else if(s.stage===1){if(role==='A'&&now-local.last>400){local.last=now;h.click('#pp-gear');}else if(role==='B'&&s.aligned)h.click('#pp-latch');}
   else pulse('#pp-hold',500);return h.report('按本端机关反馈配合');
  }
  if(mode==='silhouette'&&role==='B'){
   for(let i=0;i<3;i++)if(s.rot[i]!==s.targetRot[i]){h.click('#pp-rot-'+i);return h.report('旋转本端第 '+(i+1)+' 件物体');}
   h.click('#pp-check');return h.report(s.lamp===s.targetLamp?'轮廓已对齐，核对':'物体已对齐，告诉手动 A 调灯');
  }
  if(mode==='mirrors'){
   if(now-local.last<450)return;local.last=now;const own=s.mirrors.map((m,i)=>m.owner===role?i:-1).filter(i=>i>=0),other=s.mirrors.filter(m=>m.owner!==role).map(m=>m.rot).join('');if(!own.length)return;
   if(local.phase!==s.revision+':'+other){local.phase=s.revision+':'+other;local.index=0;}if(s.beam?.hit){h.click('#pp-check');return h.report('本端光路已接通，正常检查接收器');}
   if(local.index>=(1<<own.length))return h.report('本端组合已检查，等待手动端调整另一侧镜片');
   const goal=local.index++;for(let j=0;j<own.length;j++)if(s.mirrors[own[j]].rot!==((goal>>j)&1)){h.click('#pp-mirror-'+own[j]);return;}return h.report('轮换本端镜片，观察共享光路');
  }
  if(mode==='shadow'){
   const pos=s.positions[role],layout=s.layout,button=layout.button,exit=s.exit;
   if(role==='A'){
    if(['plan','retry','escape'].includes(s.phase))return void h.click('[data-x="record"]');
    if(s.phase==='record'){const target=s.recordTime<s.recordLength*.55?button:exit;if(pos<target)h.click('[data-x="right"]');else if(pos>target)h.click('[data-x="left"]');}
   }else{
    if(s.phase==='waiting')h.click('[data-x="replay"]');
    if(['replay','escape'].includes(s.phase)){const target=s.keyCollected?exit:(layout.mirror?-4:4);if(pos<target)h.click('[data-x="right"]');else if(pos>target)h.click('[data-x="left"]');}
   }return h.report('按本端布局执行影子协作');
  }
  if(mode==='beam'){
   const b=s.bricks?.find(x=>!x.resolved);if(s.rescue)return void pulse('#bm-lift',500);if(!b||!b.on)return void h.release();const dx=b.x-170,tilt=s.yR-s.yL,want=role==='A'?dx< -24&&tilt<80:dx>24&&tilt>-80;if(want)pulse('#bm-lift',260);else h.release();return h.report('根据本端货物位置调整本端高度');
  }
  if(mode==='catch'){
   const v=role==='A'?w._host:(w._guestState&&w._guestState()),items=v?.items||[],px=v?.px;if(!Number.isFinite(px))return;const good=items.filter(x=>x.type!=='bad').sort((a,b)=>b.y-a.y)[0],bad=items.filter(x=>x.type==='bad'&&x.y>300&&Math.abs(x.x-px)<45)[0];const want=bad?(role==='A'?bad.x>=px:bad.x<px):good?(role==='A'?good.x<px:good.x>px):false;if(want)pulse('#ct-tap',260);else h.release();return h.report('根据本端画面'+(want?'移动':'等待'));
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
