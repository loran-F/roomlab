/* RoomLab expansion: isolated game engines and UI. No dependencies beyond the host bridge. */
(function (g) {
  'use strict';
  const IDS=['lookback','caller','shadow'];
  const META={
    lookback:{name:'你别回头',tag:'追逃',time:85,a:'你看前路：报门上的箭头，听 B 指挥前进、停步或躲藏。',b:'你看监控：辨认怪物，指挥 A 应对；听 A 报箭头开启对应门。'},
    caller:{name:'真假接线员',tag:'判断',time:110,a:'你接来电：询问工号和任务，把回答告诉 B，然后提出放行或拒绝。',b:'你查值班表：核对 A 报来的身份和任务，独立投票；两票一致才执行。'},
    shadow:{name:'影子替身',tag:'接力',time:100,a:'第一轮录影：听 B 报六个踏板位置。回放时你报出口，B 跟影子过门。',b:'第一轮导航：把六个踏板位置报给 A；回放时听 A 报出口。第二轮交换职责。'}
  };
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const laneName=n=>['左','中','右'][n];
  function message(s,text){s.message=text;s.messageSeq++;}
  function finish(s,win,text){s.done=true;s.win=win;message(s,text);}
  function damage(s,text){s.hp--;message(s,text+' · 配合机会 −1');if(s.hp<=0)finish(s,false,text+'，机会用尽。');}
  const PEOPLE=[
    {name:'林小满',job:'维修员',code:'413',task:'更换东侧保险丝'},
    {name:'周阿岚',job:'配送员',code:'728',task:'把药箱送到值班室'},
    {name:'顾南星',job:'巡逻员',code:'265',task:'检查三楼应急灯'},
    {name:'许小树',job:'清洁员',code:'591',task:'清理西侧储藏间'},
    {name:'陈小雨',job:'技术员',code:'836',task:'校对监控时间'},
    {name:'唐可可',job:'厨师',code:'157',task:'送夜班员工餐'}
  ];
  function encounter(s){s.phase='travel';s.phaseTime=0;s.travel=0;s.action='stop';s.door=pick(['left','right']);s.openDoor='';s.monster=pick(['ears','eyes','nose']);s.bad=0;s.rescue=false;s.round++;}
  function callCase(s){
    const roster=PEOPLE.map(x=>({...x,code:String(Math.floor(100+Math.random()*900))}));
    const person=pick(roster),kind=pick(['real','real','code','task']);
    s.roster=roster;s.claim={...person};
    if(kind==='code')s.claim.code=String((+person.code+137)%900+100);
    if(kind==='task')s.claim.task=pick(roster.filter(x=>x.name!==person.name)).task;
    s.real=kind==='real';s.questions=[];s.votes={A:null,B:null};s.phase='call';s.phaseTime=0;s.round++;
  }
  function shadowRound(s){
    s.recorder=s.completed%2===0?'A':'B';s.runner=s.recorder==='A'?'B':'A';
    s.plates=Array.from({length:6},()=>pick([0,1,2]));s.gates=Array.from({length:6},()=>pick([0,1,2]));
    s.tape=[];s.lanes={A:1,B:1};s.slot=0;s.beat=0;s.phase='plan';s.phaseTime=0;s.agree={A:false,B:false};s.round++;
  }
  function create(mode){
    const s={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),mode,time:META[mode].time,elapsed:0,ready:{A:false,B:false},cd:3,done:false,win:false,hp:3,completed:0,round:0,phase:'brief',message:'先试一次按钮，再点准备。双方准备后开始。',messageSeq:0,seq:{A:-1,B:-1},seen:{A:0,B:0}};
    if(mode==='lookback'){s.lures=1;encounter(s);}if(mode==='caller')callCase(s);if(mode==='shadow')shadowRound(s);
    return s;
  }
  function input(s,who,d){
    if(!s||s.done||d.id!==s.id||d.mode!==s.mode||!Number.isInteger(d.seq)||d.seq<=s.seq[who])return false;
    s.seq[who]=d.seq;
    if(d.key==='ready'){s.ready[who]=true;return true;}
    if(!s.ready.A||!s.ready.B||s.cd>0||d.round!==s.round||d.phase!==s.phase)return false;
    s.seen[who]=s.elapsed;
    if(s.mode==='lookback'){
      if(who==='A'&&['go','stop','hide'].includes(d.key))s.action=d.key;
      if(who==='B'&&['left','right'].includes(d.key))s.openDoor=d.key;
      if(who==='B'&&d.key==='lure'&&s.phase==='danger'&&!s.rescue&&s.lures>0){s.lures--;s.rescue=true;s.bad=0;message(s,'B 打开诱饵灯，暂时吸引了怪物！本局诱饵已用完。');}
    }else if(s.mode==='caller'&&s.phase==='call'){
      if(who==='A'&&['code','task'].includes(d.key)&&!s.questions.includes(d.key))s.questions.push(d.key);
      if(['admit','reject'].includes(d.key)&&s.questions.length===2){
        s.votes[who]=d.key;
        if(s.votes.A&&s.votes.B){
          if(s.votes.A!==s.votes.B){message(s,'意见不同，先交换证据。任一人改票即可。');return true;}
          const correct=(d.key==='admit')===s.real;
          if(!correct)damage(s,s.real?'误拒了真正的值班人员':'冒充者混进来了');
          else message(s,s.real?'核验通过，值班人员安全进入。':'发现矛盾，成功拦下冒充者。');
          s.completed++;s.phase='verdict';s.phaseTime=0;
          s.explanation=s.real?'工号与任务均和值班表一致。':s.claim.code!==s.roster.find(x=>x.name===s.claim.name).code?'工号不符合值班表。':'任务不符合值班表。';
          if(s.completed>=5&&!s.done)finish(s,true,'五通来电处理完毕，值班室安全！');
        }
      }
    }else if(s.mode==='shadow'){
      if(d.key==='continue'&&s.phase==='plan'){s.agree[who]=true;if(s.agree.A&&s.agree.B){s.phase='record';s.slot=0;s.beat=0;message(s,s.recorder+' 开始录影，'+s.runner+' 报踏板顺序。');}}
      if(/^lane[012]$/.test(d.key))s.lanes[who]=+d.key.slice(-1);
    }
    return true;
  }
  function step(s,dt){
    if(s.done||!s.ready.A||!s.ready.B)return;
    if(s.cd>0){s.cd=Math.max(0,s.cd-dt);if(s.cd===0)message(s,s.mode==='lookback'?'行动开始：先报门向，再一起穿过走廊。':s.mode==='caller'?'第一通来电接通，询问并交换证据。':'先交流踏板路线，双方确认后开始录影。');return;}
    s.time=Math.max(0,s.time-dt);s.elapsed+=dt;s.phaseTime+=dt;
    if(s.mode==='lookback'){
      if(s.elapsed-s.seen.A>.9)s.action='stop';
      if(s.phase==='travel'){
        if(s.action==='go'&&s.openDoor===s.door)s.travel+=dt;
        if(s.travel>=2){s.phase='warning';s.phaseTime=0;message(s,'监控发现动静！B 快告诉 A 怎么应对。');}
      }else if(s.phase==='warning'&&s.phaseTime>=3.2){s.phase='danger';s.phaseTime=0;s.bad=0;}
      else if(s.phase==='danger'){
        const required={ears:'stop',eyes:'go',nose:'hide'}[s.monster];
        if(s.action!==required&&!s.rescue)s.bad+=dt;
        if(s.bad>.65){damage(s,'被怪物发现了');s.phase='safe';s.phaseTime=0;}
        else if(s.phaseTime>=1.8){s.completed++;message(s,'安全通过第 '+s.completed+' 段走廊。');s.phase='safe';s.phaseTime=0;}
      }else if(s.phase==='safe'&&s.phaseTime>=1.3){if(s.completed>=5)finish(s,true,'出口就在眼前，两人平安撤离！');else encounter(s);}
    }else if(s.mode==='caller'){
      if(s.phase==='verdict'&&s.phaseTime>=2.6&&!s.done)callCase(s);
    }else if(s.mode==='shadow'){
      if(s.phase==='record'||s.phase==='replay'){
        s.beat+=dt;
        if(s.beat>=1.8){
          s.beat-=1.8;
          if(s.phase==='record')s.tape.push(s.lanes[s.recorder]);
          else if(s.tape[s.slot]!==s.plates[s.slot]||s.lanes[s.runner]!==s.gates[s.slot]){
            const why=s.tape[s.slot]!==s.plates[s.slot]?'影子踩错了第 '+(s.slot+1)+' 个踏板':'跑者走错了第 '+(s.slot+1)+' 扇门';
            damage(s,why);s.phase='retry';s.phaseTime=0;return;
          }
          s.slot++;
          if(s.slot>=6){
            if(s.phase==='record'){s.phase='handoff';s.phaseTime=0;message(s,'录影完成！现在录影者报出口，跑者准备接力。');}
            else{s.completed++;if(s.completed===2)finish(s,true,'两轮影子接力完成，默契逃出机关！');else{s.phase='swap';s.phaseTime=0;message(s,'第一轮通过！现在交换职责。');}}
          }
        }
      }else if(s.phase==='handoff'&&s.phaseTime>=3){s.phase='replay';s.slot=0;s.beat=0;}
      else if((s.phase==='retry'||s.phase==='swap')&&s.phaseTime>=2.5)shadowRound(s);
    }
    if(s.time<=0&&!s.done)finish(s,false,'时间用尽，先和搭档复盘，再挑战一次。');
  }
  function snapshot(s,role){
    const v={id:s.id,mode:s.mode,time:s.time,elapsed:s.elapsed,ready:{...s.ready},cd:s.cd,done:s.done,win:s.win,hp:s.hp,completed:s.completed,round:s.round,phase:s.phase,phaseTime:s.phaseTime,message:s.message,messageSeq:s.messageSeq};
    if(s.mode==='lookback'){
      Object.assign(v,{travel:s.travel,action:s.action,rescue:s.rescue,openDoor:s.openDoor,lures:s.lures});
      if(role==='A')v.door=s.door;else v.monster=s.monster;
    }else if(s.mode==='caller'){
      Object.assign(v,{questions:[...s.questions],votes:{...s.votes}});
      if(role==='A')v.claim={name:s.claim.name,job:s.claim.job,code:s.questions.includes('code')?s.claim.code:null,task:s.questions.includes('task')?s.claim.task:null};
      else v.roster=s.roster.map(x=>({...x}));
      if(s.phase==='verdict'||s.done)v.explanation=s.explanation;
    }else{
      Object.assign(v,{recorder:s.recorder,runner:s.runner,slot:s.slot,beat:s.beat,tape:[...s.tape],lanes:{...s.lanes},agree:{...s.agree}});
      if(['plan','record'].includes(s.phase)&&role===s.runner)v.plates=[...s.plates];
      if(!['plan','record'].includes(s.phase)&&role===s.recorder)v.gates=[...s.gates];
    }
    return v;
  }
  const API={ids:IDS,meta:META,core:{create,input,step,snapshot}};
  g.RoomLabExpansion=API;
  if(typeof PLAYGROUNDS==='undefined')return;
  let active=null,view=null,dispose=null,serial=0,practice=false,localAction='stop',guestConn=null,lobbyTicket=0;
  const el=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=id=>'<img class="x-icon" src="assets/map-icons/'+id+'.svg" alt="">';
  const button=(key,text,extra='')=>'<button class="x-btn '+extra+'" data-x="'+key+'">'+text+'</button>';
  function shell(mode,role){
    clearNetZones();window.onkeydown=null;window.onkeyup=null;window._keys={};
    const m=META[mode];practice=false;localAction='stop';
    el('app').innerHTML='<main class="x-shell"><header class="x-top"><button class="x-back" id="back" aria-label="返回">‹</button><span>双人合作 · '+esc(PEER.room)+'</span><b id="x-time">准备中</b></header><div class="x-heading">'+icon(mode)+'<h1>'+m.name+'</h1></div><div class="x-role '+(role==='B'?'is-b':'')+'"><b>'+role+'</b><span id="x-duty">'+esc(m[role.toLowerCase()])+'</span></div><section class="x-paper"><div class="x-stats"><span id="x-health">配合机会 ●●●</span><b id="x-progress"></b></div><div id="x-stage" class="x-stage"></div><div class="x-meter"><i id="x-meter"></i></div><p id="x-hint" class="x-hint"></p><div id="x-actions" class="x-actions"></div><div id="x-message" class="x-message" role="status" aria-live="polite"></div></section><section id="x-brief" class="x-brief"><b>先试一下，再出发</b><p>'+esc(m[role.toLowerCase()])+'</p><div id="x-practice"></div><button id="x-ready" class="x-btn primary" disabled>先完成上面的小练习</button></section><div id="x-result" class="x-result" hidden></div></main>';
    el('back').onclick=()=>{if(window._dungeon)dungeonAbort();else{netSend({t:'bye'});clearTimers();closePeer();location.search='';}};
    const demo=mode==='lookback'?(role==='A'?'听到「躲起来」时，点这里躲藏':'练习：长耳朵怪物靠听觉追踪，该喊什么？'):mode==='caller'?(role==='A'?'练习：询问来电者的工号':'练习：工号不符，该怎么投票？'):'练习：搭档喊「左」，点这里移动到左边';
    el('x-practice').innerHTML='<p>'+demo+'</p>'+button('practice',mode==='lookback'?(role==='A'?'躲藏':'停步'):mode==='caller'?(role==='A'?'请报工号':'拒绝'):'← 左');
    el('x-practice').onclick=e=>{if(!e.target.closest('[data-x]'))return;practice=true;el('x-practice').innerHTML='<p class="x-practiced">✓ 练习完成。正式行动要听搭档的情报。</p>';el('x-ready').disabled=false;el('x-ready').textContent='我准备好了';};
    el('x-ready').onclick=()=>{if(practice)send('ready',role);};
    el('x-actions').onclick=e=>{const b=e.target.closest('[data-x]');if(!b||b.disabled)return;const k=b.dataset.x;if(['go','stop','hide'].includes(k))localAction=k;send(k,role);};
    function release(){localAction='stop';if(mode==='lookback'&&role==='A')send('stop',role);}
    function key(e){if(/INPUT|TEXTAREA/.test(e.target.tagName))return;const maps=mode==='lookback'?(role==='A'?{ArrowUp:'go',Space:'stop',ArrowDown:'hide'}:{ArrowLeft:'left',ArrowRight:'right',Space:'lure'}):mode==='shadow'?{ArrowLeft:'lane0',ArrowDown:'lane1',ArrowRight:'lane2'}:{};if(maps[e.code]&&!e.repeat){e.preventDefault();const b=document.querySelector('[data-x="'+maps[e.code]+'"]');if(b&&!b.disabled)b.click();}}
    window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);window.addEventListener('keydown',key);
    const conn=PEER.conn;
    function disconnect(){clearTimers();window._dead=true;const m=el('x-message');if(m)m.textContent='同伴已断线，行动暂停。请返回重新建房。';document.querySelectorAll('.x-btn').forEach(b=>b.disabled=true);}
    if(conn)conn.on('close',disconnect);
    const heart=setInterval(()=>{if(mode==='lookback'&&role==='A'&&view&&!view.done)send(localAction,role);},180);
    dispose=()=>{clearInterval(heart);window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',release);window.removeEventListener('keydown',key);if(conn&&conn.off)conn.off('close',disconnect);};
  }
  function send(key,role){
    const s=role==='A'?active:view;if(!s)return;
    const d={t:'xInput',id:s.id,mode:s.mode,seq:++serial,round:s.round,phase:s.phase,key};
    if(role==='A')input(active,'A',d);else netSend(d);
  }
  function actions(html){if(el('x-actions').dataset.mark!==html){el('x-actions').innerHTML=html;el('x-actions').dataset.mark=html;}}
  function draw(s,role){
    if(!el('x-stage'))return;
    view=s;API.view=s;const wait=!s.ready.A||!s.ready.B||s.cd>0;
    el('x-time').textContent=!s.ready.A||!s.ready.B?'准备中':s.cd>0?Math.ceil(s.cd):Math.ceil(s.time)+'s';
    el('x-health').textContent='配合机会 '+'●'.repeat(Math.max(0,s.hp))+'○'.repeat(Math.max(0,3-s.hp));
    el('x-progress').textContent=s.completed+' / '+(s.mode==='shadow'?2:5);
    el('x-message').textContent=s.message;
    el('x-brief').hidden=s.ready.A&&s.ready.B;
    if(s.ready[role]){el('x-ready').disabled=true;el('x-ready').textContent='已准备 · 等待搭档';}
    let html='',hint='',meter=0;
    if(s.mode==='lookback'){
      const danger=s.phase==='danger',warn=s.phase==='warning';
      const monsters={ears:['听声怪','停步','长耳朵会听脚步声'],eyes:['凝视怪','前进','盯着静止的人追'],nose:['嗅探怪','躲藏','躲进柜子遮住气味']};
      if(role==='A'){
        html='<div class="x-corridor '+(danger?'danger':'')+'"><div class="x-door"><span>告诉 B 开哪扇门</span><strong>'+(s.door==='left'?'← 左门':'右门 →')+'</strong><i class="'+(s.openDoor===s.door?'open':'')+'">'+(s.openDoor===s.door?'门已打开':'等待 B 开门')+'</i></div><div class="x-agent '+s.action+'"><span>A</span></div><div class="x-cupboard">躲藏柜</div><div class="x-floor"></div></div>';
        actions(button('go','↑ 前进')+button('stop','■ 停步')+button('hide','↓ 躲藏'));
        hint=warn?'身后有动静！听 B 报怪物，再选择动作。':danger?'怪物经过！保持 B 指定的动作。':s.phase==='safe'?'暂时安全，准备下一段。':'把门上方向报给 B，开门后点前进。';
      }else{
        const m=monsters[s.monster];
        html='<div class="x-monitor '+(danger?'danger':'')+'"><div class="x-monitor-label">后方监控 · '+(warn?'发现目标':danger?'接近中':'巡查中')+'</div><div class="x-monster '+s.monster+'"><i></i><i></i><b></b></div><h2>'+(warn||danger?m[0]:'走廊暂时安全')+'</h2><p>'+(warn||danger?m[2]+' · 喊「'+m[1]+'」':'听 A 报方向，打开对应的门')+'</p></div>';
        actions(button('left','← 开左门')+button('right','开右门 →')+button('lure',s.lures?'应急诱饵 · 本局 1 次':'诱饵已用完','wide'));
        hint=warn?'还有 '+Math.max(0,3.2-s.phaseTime).toFixed(1)+' 秒，告诉 A 应对方式。':danger?'来不及应对时可以救场：整局只有一次应急诱饵。':'开门只看 A 报的方向，两扇门可以随时切换。';
      }
      meter=s.phase==='travel'?s.travel/2:warn?s.phaseTime/3.2:danger?s.phaseTime/1.8:1;
    }else if(s.mode==='caller'){
      if(role==='A'){
        const c=s.claim;
        html='<div class="x-call-head">'+icon('caller')+'<span>线路 0'+(s.completed+(s.phase==='call'?1:0))+' · 来电接通</span></div><div class="x-speech"><b>“我是'+esc(c.name)+'，'+esc(c.job)+'。请开门。”</b><p>工号：'+esc(c.code||'还没问到')+'</p><p>任务：'+esc(c.task||'还没问到')+'</p></div><p class="x-small">把这些话报给 B；你手里没有值班表。</p>';
        actions(button('code','询问工号')+button('task','询问任务')+button('admit','放行','primary')+button('reject','拒绝'));
      }else{
        html='<div class="x-file-title">夜班值班表 <small>仅你可见</small></div><div class="x-roster">'+s.roster.map(p=>'<article><b>'+esc(p.name)+' <small>'+esc(p.job)+'</small></b><strong>'+p.code+'</strong><p>'+esc(p.task)+'</p></article>').join('')+'</div>';
        actions(button('admit','核对无误 · 放行','primary')+button('reject','发现矛盾 · 拒绝'));
      }
      hint=s.phase==='verdict'?s.explanation:s.votes.A&&s.votes.B&&s.votes.A!==s.votes.B?'你们意见不同。交流证据后，可点按钮改票。':'先问完工号和任务；两个人的决定一致才执行。';
      meter=s.questions.length/2;
    }else{
      const rec=role===s.recorder,recording=['plan','record'].includes(s.phase);
      el('x-duty').textContent=rec?(recording?'你录影 · 听搭档报踏板位置，逐拍选左、中、右。':'你指挥 · 把出口顺序报给搭档，影子会自动重播。'):(recording?'你导航 · 把六个踏板按顺序报给录影者。':'你跑关 · 听搭档报出口，逐拍选左、中、右。');
      const sequence=s.plates||s.gates;
      html='<div class="x-file-title">第 '+(s.completed+1)+' 轮 · '+({plan:'商量路线',record:'录下影子',handoff:'准备回放',replay:'跟影子过门',retry:'重新规划',swap:'交换职责'}[s.phase]||'完成')+'</div><div class="x-shadow-scene"><div class="x-lanes">'+[0,1,2].map(n=>'<div><span>'+laneName(n)+'</span>'+(s.lanes[role]===n?'<b class="x-pawn">'+role+'</b>':'')+(!recording&&s.tape[Math.min(s.slot,5)]===n?'<b class="x-ghost">影</b>':'')+'</div>').join('')+'</div></div><div class="x-sequence-label">'+(sequence?(s.plates?'把踏板顺序报给搭档':'把出口顺序报给搭档'):'这份路线在搭档那边 · 听对方报位')+'</div><div class="x-sequence">'+Array.from({length:6},(_,i)=>'<span class="'+(i===s.slot?'now':'')+'"><small>'+(i+1)+'</small>'+(sequence?laneName(sequence[i]):'？')+'</span>').join('')+'</div><div class="x-tape">已录：'+(s.tape.length?s.tape.map(laneName).join(' · '):'等待开始')+'</div>';
      actions(button('lane0','← 左')+button('lane1','↓ 中')+button('lane2','右 →')+(s.phase==='plan'?button('continue',s.agree[role]?'等搭档确认':'路线说好了 · 开始录影','wide primary'):''));
      hint=s.phase==='plan'?'先一起看清分工，再分别确认。每拍 1.8 秒，倒计时结束记录当前位置。':s.phase==='record'?'第 '+(Math.min(s.slot,5)+1)+' / 6 拍 · '+s.recorder+' 录影，'+s.runner+' 报踏板。':s.phase==='replay'?'第 '+(Math.min(s.slot,5)+1)+' / 6 扇门 · '+s.recorder+' 报出口，'+s.runner+' 移动。':s.message;
      meter=s.beat/1.8;
    }
    // Keep controls stable during state broadcasts; only the scene is redrawn.
    el('x-stage').innerHTML=html;el('x-hint').textContent=wait?(s.ready.A&&s.ready.B?'双方就绪，倒计时后开始。':'完成小练习，然后准备。'):hint;el('x-meter').style.width=clamp(meter*100,0,100)+'%';
    document.querySelectorAll('#x-actions [data-x]').forEach(b=>{
      const k=b.dataset.x;
      b.disabled=wait||s.done;
      if(s.mode==='lookback'){if(k==='lure')b.disabled=b.disabled||s.phase!=='danger'||s.rescue||!s.lures;b.classList.toggle('selected',k===s.action||k===s.openDoor);}
      if(s.mode==='caller'){b.disabled=b.disabled||s.phase!=='call'||(['admit','reject'].includes(k)&&s.questions.length<2);b.classList.toggle('selected',s.votes[role]===k||s.questions.includes(k));}
      if(s.mode==='shadow'){if(k.startsWith('lane'))b.disabled=b.disabled||(s.phase!=='plan'&&(s.phase!=='record'||role!==s.recorder)&&(s.phase!=='replay'||role!==s.runner));if(k==='continue')b.disabled=b.disabled||s.agree[role];b.classList.toggle('selected',k==='lane'+s.lanes[role]);}
    });
    if(s.done&&!window._dungeon)result(s,role);
  }
  function result(s,role){
    const r=el('x-result');if(!r||r.dataset.id===s.id)return;
    r.dataset.id=s.id;r.hidden=false;r.innerHTML='<h2>'+(s.win?'配合成功！':'再试一次？')+'</h2><p>'+esc(s.message)+'</p>'+button('restart','我准备再来一局','primary');
    r.onclick=e=>{if(!e.target.closest('button'))return;e.target.disabled=true;e.target.textContent='等待搭档准备';if(role==='A'){active.restart.A=true;restartCheck();}else netSend({t:'xRestart',id:s.id});};
  }
  function cleanup(){if(dispose){const f=dispose;dispose=null;f();}active=null;view=null;API.state=null;API.view=null;}
  function restartCheck(){if(active&&active.restart.A&&active.restart.B)host(active.mode);}
  function host(mode){
    clearTimers();closeFB();S.mod=mode;window._dead=false;serial=0;
    active=create(mode);if(window._dungeon&&typeof window.coopTime==='function')active.time=window.coopTime(active.time);active.restart={A:false,B:false};API.state=active;shell(mode,'A');
    const s=active;let last=performance.now(),next=0,endAt=null;
    function tick(){
      if(active!==s)return;
      const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;step(s,dt);
      if(now>=next){draw(snapshot(s,'A'),'A');netSend({t:'xState',state:snapshot(s,'B')});next=now+80;}
      if(s.done){window._dead=true;if(endAt===null)endAt=now+1600;if(window._dungeon&&now>=endAt){const won=s.win;clearTimers();dungeonEnd(won);}}
    }
    timers.push(setInterval(tick,20));tick();
  }
  function guest(mode){clearTimers();closeFB();S.mod=mode;serial=0;window._dead=false;shell(mode,'B');
    if(!window._dungeon&&PEER.conn!==guestConn){guestConn=PEER.conn;guestConn.on('data',d=>dgGuestOnData(d));}
  }
  function incoming(d){
    if(d&&d.t==='xWelcome'&&IDS.includes(d.mode)&&!window._dungeon){guest(d.mode);return true;}
    if(!d)return false;
    if(d.t!=='xState'||!d.state||!IDS.includes(d.state.mode))return false;
    const s=d.state;if(S.mod!==s.mode)return true;
    if(!el('x-stage')||!view||view.id!==s.id){if(!el('x-stage')||view&&view.id!==s.id)guest(s.mode);}
    draw(s,'B');return true;
  }
  function wrap(name,fn){const old=g[name];g[name]=function(...args){return fn.call(this,old,args);};}
  function lobby(mode,role){
    clearTimers();closePeer();clearNetZones();window._dungeon=false;window._netMode=role==='A'?'host':'guest';
    const ticket=++lobbyTicket,m=META[mode];
    el('app').innerHTML='<main class="x-shell"><header class="x-top"><button class="x-back" id="back">‹</button><span>双人合作 · 开语音交流</span></header><div class="x-heading">'+icon(mode)+'<h1>'+m.name+'</h1></div><section class="x-paper"><h2>角色 '+role+' · '+(role==='A'?'创建房间':'加入房间')+'</h2><p class="x-hint">'+esc(m[role.toLowerCase()])+'</p>'+(role==='B'?'<label for="rc">输入搭档的四位房间码</label><input id="rc" class="x-code-input" maxlength="4" inputmode="numeric" autocomplete="off"><button id="joing" class="x-btn primary">加入房间</button>':'')+'<div id="x-lobby-status" class="x-message">'+(role==='A'?'正在连接服务…':'让搭档先创建房间。')+'</div></section></main>';
    el('back').onclick=()=>{lobbyTicket++;clearTimers();closePeer();location.search='';};
    function status(t){if(ticket===lobbyTicket&&el('x-lobby-status'))el('x-lobby-status').textContent=t;}
    function connect(code){
      loadPeerLib(P=>{
        if(ticket!==lobbyTicket)return;if(!P){status('联网组件加载失败，请返回重试。');return;}
        const p=newPeerId(role==='A'?'room'+code:null,peerOpts());PEER.peer=p;PEER.room=code;PEER.isHost=role==='A';
        let connected=false;
        const timeout=setTimeout(()=>{if(!connected){status('连接超时，请返回重新建房。');p.destroy();}},18000);timers.push(timeout);
        p.on('error',e=>{clearTimeout(timeout);status('连接失败：'+e.type+'。请返回重试。');});
        function opened(conn){
          if(ticket!==lobbyTicket){conn.close();return;}connected=true;clearTimeout(timeout);PEER.conn=conn;
          if(role==='A'){
            conn.on('data',d=>dgHostOnData(d));netSend({t:'xWelcome',mode});host(mode);
          }else guest(mode);
        }
        p.on('open',()=>{
          if(role==='A'){
            clearTimeout(timeout);status('房间码：'+code+' · 等待搭档加入');
            const b=document.createElement('button');b.className='x-btn';b.textContent='复制房间码';b.onclick=()=>{if(navigator.clipboard)navigator.clipboard.writeText(String(code)).then(()=>b.textContent='已复制',()=>b.textContent='请手动告诉搭档：'+code);};el('x-lobby-status').appendChild(b);
          }else{const conn=p.connect('room'+code,{reliable:true});conn.on('open',()=>opened(conn));conn.on('error',()=>status('加入失败，请返回重试。'));}
        });
        if(role==='A')p.on('connection',conn=>{if(connected){conn.close();return;}conn.on('open',()=>opened(conn));});
      });
    }
    if(role==='A')connect(Math.floor(1000+Math.random()*9000));
    else{el('rc').oninput=function(){this.value=this.value.replace(/\D/g,'');};el('joing').onclick=()=>{const code=el('rc').value;if(!/^\d{4}$/.test(code)){status('请输入四位数字房间码。');return;}el('joing').disabled=true;status('正在连接房间 '+code+'…');connect(code);};}
  }
  function choose(mode){
    const m=META[mode];el('app').innerHTML='<main class="x-shell"><div class="x-heading">'+icon(mode)+'<h1>'+m.name+'</h1></div><section class="x-paper"><p class="x-hint">两台设备，一人创建，一人加入。打开语音，把你看到的情报告诉搭档。</p><div class="x-role"><b>A</b><span>'+esc(m.a)+'</span></div>'+button('host','角色 A · 创建房间','primary')+'<div class="x-role is-b"><b>B</b><span>'+esc(m.b)+'</span></div>'+button('join','角色 B · 加入房间')+'</section></main>';
    document.querySelector('[data-x="host"]').onclick=()=>setRole('A');document.querySelector('[data-x="join"]').onclick=()=>setRole('B');
  }
  function install(){
    IDS.forEach(id=>{if(!PLAYGROUNDS.some(p=>p.id===id))PLAYGROUNDS.push({id,icon:icon(id),...META[id]});if(!EV_POOL_NET.includes(id))EV_POOL_NET.push(id);});
    wrap('clearTimers',(old,args)=>{cleanup();return old(...args);});
    wrap('render',(old,args)=>{if(!IDS.includes(S.mod))return old(...args);if(!S.role)return choose(S.mod);return lobby(S.mod,S.role);});
    wrap('startHostGame',(old,args)=>IDS.includes(S.mod)?host(S.mod):old(...args));
    wrap('renderGuestUI',(old,args)=>IDS.includes(S.mod)?guest(S.mod):old(...args));
    wrap('renderPlayDungeonHost',(old,args)=>IDS.includes(S.mod)?host(S.mod):old(...args));
    wrap('renderManual',(old,args)=>IDS.includes(S.mod)?guest(S.mod):old(...args));
    wrap('dgHostOnData',(old,args)=>{const d=args[0];if(d&&d.t==='xInput'){input(active,'B',d);return;}if(d&&d.t==='xRestart'){if(active&&active.done&&active.id===d.id){active.restart.B=true;restartCheck();}return;}return old(...args);});
    wrap('dgGuestOnData',(old,args)=>incoming(args[0])?undefined:old(...args));
    API.startHost=host;API.startGuest=guest;
  }
  install();
})(typeof window==='undefined'?globalThis:window);
