/* RoomLab expansion: isolated game engines and UI. No dependencies beyond the host bridge. */
(function (g) {
  'use strict';
  // Pure seeded plans. Host owns creation; state snapshots carry the resulting plan.
  function variationPlan(mode,tier,seed){
    let value=(seed>>>0)||1;const random=()=>{value^=value<<13;value^=value>>>17;value^=value<<5;return(value>>>0)/4294967296;};
    const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
    const choose=a=>a[Math.floor(random()*a.length)];let plan={tier,seed:seed>>>0};
    if(mode==='beam'){
      const types=tier===1?[0,1,2,3,1,2]:shuffle([0,1,2,3,1,2]);
      const sides=tier===1?[0,1,0,1,0,1]:shuffle([0,0,0,1,1,1]);
      plan.cargo=types.map((type,i)=>({type,x:tier===1?(sides[i]?265:75):sides[i]?choose(tier>=4?[205,215,230]:tier>=3?[215,230,245]:[255,275]):choose(tier>=4?[110,125,135]:tier>=3?[95,110,125]:[65,85])}));
    }else if(mode==='shadow'){
      plan.layout={button:tier===1?2:choose([1,2]),mirror:tier>=3?choose([false,true]):false,recordLength:tier>=4?choose([6,7,8]):8};
    }else if(mode==='lookback'){
      let last=null;plan.encounters=[];for(let i=0;i<24;i++){let options=[];for(const door of ['left','right'])for(const monster of ['ears','eyes','nose'])if(door+monster!==last)options.push({door,monster});const c=choose(options);last=c.door+c.monster;plan.encounters.push({...c,travel:tier===1?2:choose([1.6,2,2.4]),warning:tier<3?3.2:choose([2.8,3.2,3.6]),danger:tier<4?1.8:choose([1.5,1.8,2.1])});}
    }else if(mode==='caller'){
      let prior='';plan.cases=[];for(let i=0;i<5;i++){const checks=shuffle(choose([['code','task'],['code','route'],['task','route']]));const faults=['real','real',...checks];let fault=choose(faults),person=Math.floor(random()*6);if(person+fault===prior)person=(person+1+Math.floor(random()*5))%6;prior=person+fault;plan.cases.push({person,checks,fault,closed:Math.floor(random()*3),codes:shuffle(Array.from({length:900},(_,j)=>j+100)).slice(0,6),tasks:shuffle([0,1,2,3,4,5]),route:Math.floor(random()*2),falseTask:1+Math.floor(random()*5)});}
    }else if(mode==='catch'){
      plan.waves=Array.from({length:24},()=>({side:choose([-1,1]),gap:choose([.95,1,1.1])}));
      for(let i=2;i<plan.waves.length;i++)if(plan.waves[i].side===plan.waves[i-1].side&&plan.waves[i].side===plan.waves[i-2].side)plan.waves[i].side*=-1;
    }else if(mode==='beat'){
      plan.phrases=Array.from({length:30},()=>({types:shuffle(['A','B','AB']),beats:tier===1?[2,2,2]:choose([[1,2,3],[2,1,3],[3,1,2]])}));
    }
    return plan;
  }
  const variationMemory={};
  function variationStart(mode){
    const key='roomlab-variation-v1:'+mode;let saved=variationMemory[key]||{};try{saved=JSON.parse(localStorage.getItem(key)||'null')||saved;}catch(_){}
    const tier=typeof coopDifficulty==='function'?Math.max(1,Math.min(4,coopDifficulty().tier||1)):1;
    let plan,fingerprint,seed=Math.floor(Math.random()*4294967295)+1;if(seed===saved.seed)seed++;
    for(let tries=0;tries<64;tries++){plan=variationPlan(mode,tier,seed+tries*(mode==='shadow'?2654435761:1));const first=mode==='beam'?plan.cargo.slice(0,2).map(x=>[x.type,x.x<170]):mode==='caller'?{checks:plan.cases[0].checks,fault:plan.cases[0].fault}:mode==='lookback'?plan.encounters[0]:mode==='catch'?plan.waves[0]:mode==='shadow'?plan.layout:plan.phrases&&plan.phrases[0];fingerprint=JSON.stringify(first);if(tier===1||fingerprint!==saved.fingerprint)break;}
    saved={fingerprint,seed:plan.seed};variationMemory[key]=saved;try{localStorage.setItem(key,JSON.stringify(saved));}catch(_){}return plan;
  }
  g.RoomVariation={generate:variationPlan,start:variationStart};
  const IDS=['lookback','caller','shadow'];
  const META={
    lookback:{name:'你别回头',tag:'追逃',time:85,a:'你看前路：报门上的箭头，听 B 指挥前进、停步或躲藏。',b:'你看监控：辨认怪物，指挥 A 应对；听 A 报箭头开启对应门。'},
    caller:{name:'真假接线员',tag:'判断',time:110,a:'先听 B 指定今日核验项，再从工号、任务、来路中选择两个问题。交换证据后投票。',b:'先报今日核验项，再听名字点档案。注意封闭通道与来路证词的矛盾，独立投票。'},
    shadow:{name:'影子替身',tag:'机关',time:100,a:'你录下走动：踩按钮留足时间，再走到门禁前的集合出口等待 B。',b:'你取钥匙再集合：播放 A 的轨迹，穿过门禁拿钥匙，再回集合出口。'}
  };
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const laneName=n=>['左','中','右'][n];
  const ROOM_THEMES={caller:'room-12',shadow:'room-4',lookback:'room-17'};
  const themed=s=>s&&s.roomId===ROOM_THEMES[s.mode];
  const roomThemeId=()=>g._dungeon&&typeof DUNGEON!=='undefined'&&DUNGEON?DUNGEON.roomId:null;
  const themeName=s=>({caller:'员工身份核验',shadow:'双胞胎的影子',lookback:'观察者停走'}[s.mode]);
  function themeText(s,text){if(!themed(s))return text;let t=String(text);if(s.mode==='caller')t=t.replace(/值班室/g,'夜班公司').replace(/值班人员/g,'夜班员工').replace(/工号/g,'员工编号').replace(/来电/g,'门禁呼叫');if(s.mode==='lookback')t=t.replace(/怪物/g,'观察者').replace(/诱饵灯/g,'干扰灯').replace(/走廊/g,'游戏场').replace(/柜子/g,'掩体');return t;}
  function message(s,text){s.message=text;s.messageSeq++;}
  function finish(s,win,text,reasonCode){if(s.done)return;s.done=true;s.win=win;s.reasonCode=reasonCode||(win?'objective_complete':'objective_failed');message(s,text);}
  function damage(s,text){s.hp--;message(s,text+' · 配合机会 −1');if(s.hp<=0)finish(s,false,text+'，机会用尽。','attempts_exhausted');}
  const PEOPLE=[
    {name:'林小满',job:'维修员',code:'413',task:'更换东侧保险丝'},
    {name:'周阿岚',job:'配送员',code:'728',task:'把药箱送到值班室'},
    {name:'顾南星',job:'巡逻员',code:'265',task:'检查三楼应急灯'},
    {name:'许小树',job:'清洁员',code:'591',task:'清理西侧储藏间'},
    {name:'陈小雨',job:'技术员',code:'836',task:'校对监控时间'},
    {name:'唐可可',job:'厨师',code:'157',task:'送夜班员工餐'}
  ];
  const EMPLOYEES=[
    {name:'梁小序',job:'行政专员',code:'413',task:'领取夜班门禁卡'},
    {name:'何一宁',job:'IT 值班',code:'728',task:'重启三层打印服务器'},
    {name:'杜禾',job:'档案专员',code:'265',task:'归档已签字的会议纪要'},
    {name:'程末',job:'财务专员',code:'591',task:'封存报销原始凭证'},
    {name:'沈知夏',job:'设施维护',code:'836',task:'检修茶水间照明'},
    {name:'陆言',job:'前台值守',code:'157',task:'核对访客离楼记录'}
  ];
  function encounter(s){const item=s.variation.encounters[s.round%s.variation.encounters.length];s.phase='travel';s.phaseTime=0;s.travel=0;s.action='stop';s.door=item.door;s.openDoor='';s.monster=item.monster;s.travelLimit=item.travel;s.warningLimit=item.warning;s.dangerLimit=item.danger;s.bad=0;s.rescue=false;s.round++;}
  function callCase(s){
    const item=s.variation.cases[s.completed],people=themed(s)?EMPLOYEES:PEOPLE;
    const roster=people.map((x,i)=>({...x,task:people[item.tasks[i]].task,code:String(item.codes[i])}));
    const person=roster[item.person];s.checks=item.checks.slice();
    const routes=themed(s)?['员工闸机','档案层楼梯','后勤电梯']:['东门','西楼梯','货梯'];
    s.closed=routes[item.closed];const kind=item.fault;
    s.roster=roster;s.claim={...person,route:routes.filter(x=>x!==s.closed)[item.route]+'，我直接过来的，没有绕路。'};
    if(kind==='code')s.claim.code=String((+person.code+137)%900+100);
    if(kind==='task')s.claim.task=roster[(item.person+item.falseTask)%6].task;
    if(kind==='route')s.claim.route=s.closed+'，我刚刚直接过来的，畅通无阻。';
    s.real=kind==='real';s.fault=kind;s.questions=[];s.extra=false;s.votes={A:null,B:null};s.phase='call';s.phaseTime=0;s.round++;
  }
  function shadowRound(s){
    s.positions={A:0,B:0};s.tape=[];s.ghost=0;s.doorOpen=false;s.keyCollected=false;s.exit=3;s.recordTime=0;s.playTime=0;s.recordLength=s.layout.recordLength;s.moves={A:-1,B:-1};s.phase='plan';s.phaseTime=0;s.attempts=s.attempts||0;s.round++;
  }
  function shadowExit(s){if(!s.done&&['replay','escape'].includes(s.phase)&&s.keyCollected&&s.ghost===s.exit&&s.positions.B===s.exit){s.completed=1;finish(s,true,'钥匙和两人都已到出口，成功撤离！');}}
  function create(mode){
    const s={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),mode,time:META[mode].time,elapsed:0,ready:{A:false,B:false},cd:3,done:false,win:false,hp:3,completed:0,round:0,phase:'brief',message:'先试一次按钮，再点准备。双方准备后开始。',messageSeq:0,seq:{A:-1,B:-1},seen:{A:0,B:0}};
    s.roomId=roomThemeId();s.variation=variationStart(mode);s.tier=s.variation.tier;if(mode==='shadow')s.layout={...s.variation.layout};
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
      if(who==='A'&&d.key==='extra'&&s.questions.length===2&&!s.extra){s.extra=true;s.time=Math.max(0,s.time-8);s.votes={A:null,B:null};message(s,'追加一次追问，行动时间 −8 秒。');}
      if(who==='A'&&['code','task','route'].includes(d.key)&&!s.questions.includes(d.key)&&s.questions.length<(s.extra?3:2)){s.questions.push(d.key);s.votes={A:null,B:null};}
      if(['admit','reject'].includes(d.key)&&s.questions.length>=2){
        s.votes[who]=d.key;
        if(s.votes.A&&s.votes.B){
          if(s.votes.A!==s.votes.B){message(s,'意见不同，先交换证据。任一人改票即可。');return true;}
          const correct=(d.key==='admit')===s.real;
          if(!correct)damage(s,s.real?'误拒了真正的值班人员':'冒充者混进来了');
          else message(s,s.real?'核验通过，值班人员安全进入。':'发现矛盾，成功拦下冒充者。');
          s.completed++;s.phase='verdict';s.phaseTime=0;
          s.explanation=s.real?'今日要求核验的证据没有矛盾，是真正的值班人员。':s.fault==='route'?'他说刚经过'+s.closed+'，但该通道整晚封闭，行程自相矛盾。':s.fault==='code'?'工号与档案不符。':'任务与档案不符。';
          if(s.completed>=5&&!s.done)finish(s,true,'五通来电处理完毕，值班室安全！');
        }
      }
    }else if(s.mode==='shadow'){
      if(who==='A'&&d.key==='record'&&['plan','waiting','retry','escape'].includes(s.phase)){shadowRound(s);s.phase='record';s.attempts++;message(s,'A 踩按钮留足通行时间，再走到门禁前的集合出口等待。');}
      if(who==='B'&&d.key==='replay'&&['waiting','retry','escape'].includes(s.phase)&&s.tape.length){s.phase='replay';s.phaseTime=0;s.playTime=0;s.positions.B=0;s.ghost=s.tape[0].x;s.keyCollected=false;s.doorOpen=s.ghost===s.layout.button;s.round++;message(s,'B 趁门禁打开去拿钥匙，再回集合出口与 A 会合。');}
      if(['left','right'].includes(d.key)&&s.elapsed-s.moves[who]>=.12){
        const allowed=who==='A'?s.phase==='record':['replay','escape'].includes(s.phase);
        if(allowed){
          let next=clamp(s.positions[who]+(d.key==='right'?1:-1)*(s.layout.mirror?-1:1),0,6);s.moves[who]=s.elapsed;
          if(who==='A'&&next>=4)next=3;
          if(who==='B'&&((s.positions.B===3&&next===4)||(s.positions.B===4&&next===3))&&!s.doorOpen){message(s,'门还关着，等影子踩到黄色按钮。');return true;}
          s.positions[who]=next;
          if(who==='A'){s.doorOpen=next===s.layout.button;s.tape.push({t:s.recordTime,x:next});message(s,next===s.layout.button?'按钮已压下。留几秒给 B 过门，再向'+(s.layout.mirror?'左':'右')+'走到集合出口。':next===s.exit?'A 已到集合出口，保持这里直到录影结束。':'A 离开按钮，门禁就会关上。');}
          if(who==='B'&&next===6&&!s.keyCollected){s.keyCollected=true;s.doorOpen=true;message(s,'钥匙已开门，回出口集合！A、B 都到集合出口才算成功。');}
          shadowExit(s);
        }
      }
    }
    return true;
  }
  function step(s,dt){
    if(s.done||!s.ready.A||!s.ready.B)return;
    if(s.cd>0){s.cd=Math.max(0,s.cd-dt);if(s.cd===0)message(s,s.mode==='lookback'?'行动开始：先报门向，再一起穿过走廊。':s.mode==='caller'?'第一通来电接通，询问并交换证据。':'A 先录影：踩按钮留几秒，再走到集合出口。');return;}
    s.time=Math.max(0,s.time-dt);s.elapsed+=dt;s.phaseTime+=dt;
    if(s.mode==='lookback'){
      if(s.elapsed-s.seen.A>.9)s.action='stop';
      if(s.phase==='travel'){
        if(s.action==='go'&&s.openDoor===s.door)s.travel+=dt;
        if(s.travel>=s.travelLimit){s.phase='warning';s.phaseTime=0;message(s,'监控发现动静！B 快告诉 A 怎么应对。');}
      }else if(s.phase==='warning'&&s.phaseTime>=s.warningLimit){s.phase='danger';s.phaseTime=0;s.bad=0;}
      else if(s.phase==='danger'){
        const required={ears:'stop',eyes:'go',nose:'hide'}[s.monster];
        if(s.action!==required&&!s.rescue)s.bad+=dt;
        if(s.bad>.65){damage(s,'被怪物发现了');s.phase='safe';s.phaseTime=0;}
        else if(s.phaseTime>=s.dangerLimit){s.completed++;message(s,'安全通过第 '+s.completed+' 段走廊。');s.phase='safe';s.phaseTime=0;}
      }else if(s.phase==='safe'&&s.phaseTime>=1.3){if(s.completed>=5)finish(s,true,'出口就在眼前，两人平安撤离！');else encounter(s);}
    }else if(s.mode==='caller'){
      if(s.phase==='verdict'&&s.phaseTime>=2.6&&!s.done)callCase(s);
    }else if(s.mode==='shadow'){
      if(s.phase==='record'){
        if(!s.tape.length)s.tape.push({t:0,x:0});
        s.recordTime=Math.min(s.recordLength,s.recordTime+dt);
        if(s.recordTime>=s.recordLength){s.phase='waiting';s.doorOpen=false;message(s,'录影完成。B 播放后拿钥匙再返回集合出口；A 也可以重录。');}
      }else if(s.phase==='replay'){
        s.playTime=Math.min(s.recordLength,s.playTime+dt);
        s.ghost=s.tape.filter(p=>p.t<=s.playTime).slice(-1)[0].x;s.doorOpen=s.keyCollected||s.ghost===s.layout.button;
        if(s.playTime>=s.recordLength){s.phase='escape';message(s,s.ghost===s.exit?'A 的回声已在出口等候，B 拿钥匙后回来集合。':'A 的回声没有停在出口。请重录：踩按钮后走到集合出口等待。');}
        shadowExit(s);
      }
    }
    if(s.time<=0&&!s.done)finish(s,false,'时间用尽，先和搭档复盘，再挑战一次。','time_expired');
  }
  function snapshot(s,role){
    const v={id:s.id,mode:s.mode,time:s.time,elapsed:s.elapsed,ready:{...s.ready},cd:s.cd,done:s.done,win:s.win,hp:s.hp,completed:s.completed,round:s.round,phase:s.phase,phaseTime:s.phaseTime,message:s.message,messageSeq:s.messageSeq,reasonCode:s.reasonCode};
    v.roomId=s.roomId;v.tier=s.tier;
    if(s.mode==='lookback'){
      Object.assign(v,{travel:s.travel,travelLimit:s.travelLimit,warningLimit:s.warningLimit,dangerLimit:s.dangerLimit,action:s.action,rescue:s.rescue,openDoor:s.openDoor,lures:s.lures});
      if(role==='A')v.door=s.door;else v.monster=s.monster;
    }else if(s.mode==='caller'){
      Object.assign(v,{questions:[...s.questions],extra:s.extra,votes:{...s.votes}});
      if(role==='A')v.claim={name:s.claim.name,job:s.claim.job,code:s.questions.includes('code')?s.claim.code:null,task:s.questions.includes('task')?s.claim.task:null,route:s.questions.includes('route')?s.claim.route:null};
      else {v.roster=s.roster.map(x=>({...x}));v.checks=[...s.checks];v.closed=s.closed;}
      if(s.phase==='verdict'||s.done)v.explanation=s.explanation;
    }else{
      Object.assign(v,{layout:{...s.layout},positions:{...s.positions},ghost:s.ghost,doorOpen:s.doorOpen,keyCollected:s.keyCollected,exit:s.exit,recordTime:s.recordTime,playTime:s.playTime,recordLength:s.recordLength,attempts:s.attempts,tape:s.tape.map(p=>({...p}))});
    }
    return v;
  }
  const API={ids:IDS,meta:META,core:{create,input,step,snapshot}};
  g.RoomLabExpansion=API;
  if(typeof PLAYGROUNDS==='undefined')return;
const shadowTrack=[26,69,112,167,231,271,309];
function shadowSVG(s){const x=n=>s.mirror?336-shadowTrack[n]:shadowTrack[n],gate=s.mirror?125:211,exit=x(3),bp=x(s.button),kx=x(6);const person=(n,runner=false)=>{const px=x(n),py=runner?202:146,echo=!runner&&s.echo,label=runner?'B':echo?'回声 A':'A',stroke=echo?'#f4e8ff':'#281f32',fill=runner?'#ffa650':echo?'#aa8dbb':'#54adc5';return `<g class="person" data-character="${runner?'B':'A'}" transform="translate(${px} ${py})"><circle cy="0" r="8" fill="${echo?'#baa3ce':'#ffcd9e'}" stroke="${stroke}" stroke-width="2" ${echo?'stroke-dasharray="3 2"':''}/><rect x="-11" y="9" width="22" height="30" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2" ${echo?'stroke-dasharray="4 2"':''}/><text x="0" y="29" fill="${echo?'#291e35':'#fff'}" text-anchor="middle" font-size="13" font-weight="bold">${runner?'B':echo?'▶':'A'}</text><text x="0" y="-16" text-anchor="middle" font-size="12" fill="#fff3dc" font-weight="bold">${echo?label:""}</text></g>`};return `<svg viewBox="0 0 336 280" aria-label="${s.mirror?'向左':'向右'}出发；集合出口在门禁入口侧"><rect x="1.5" y="1.5" width="333" height="277" rx="11" fill="#b39cb9" stroke="#281f32" stroke-width="3"/><path d="M3 3h330v190H3z" fill="#776087"/><path d="M3 193h330" stroke="#281f32" stroke-width="3"/><g stroke="#886d98" stroke-width="1"><path d="M3 48h330M3 96h330M3 144h330M48 3v190M96 3v190M144 3v190M192 3v190M240 3v190M288 3v190"/></g><rect x="${exit-21}" y="107" width="42" height="155" rx="8" fill="#b2d2bc" fill-opacity=".35" stroke="#d4edd6" stroke-width="2" stroke-dasharray="5 4"/><path d="M${exit} 52v51" stroke="#d4edd6" stroke-width="2" stroke-dasharray="3 4"/><rect x="${exit-38}" y="25" width="76" height="25" rx="5" fill="#d7e8c8" stroke="#281f32" stroke-width="2"/><text x="${exit}" y="42" text-anchor="middle" font-size="14" fill="#294b3a" font-weight="bold">集合出口</text><path d="M${exit-8} 260h16m-8 0v-10m-4 4 4-4 4 4" stroke="#e8f6dc" stroke-width="2" fill="none"/><path d="M${bp} 210H${gate}" stroke="${s.a===s.button&&s.phase!=='plan'?'#ffda65':'#736178'}" stroke-width="5"/><rect x="${gate-14}" y="105" width="28" height="149" rx="4" fill="#3e304a" stroke="#281f32" stroke-width="3"/><rect x="${gate-10}" y="109" width="20" height="${s.open?9:141}" fill="#54adc5"/><path d="M${gate-10} 113h20" stroke="#317e97" stroke-width="3"/><rect x="${gate-24}" y="72" width="48" height="24" rx="4" fill="${s.open?'#b7ddb9':'#fff0c5'}" stroke="#281f32" stroke-width="2"/><text x="${gate}" y="89" text-anchor="middle" font-size="14" fill="#281f32">门禁</text><rect x="${bp-14}" y="${s.a===s.button&&s.phase!=='plan'?199:193}" width="28" height="${s.a===s.button&&s.phase!=='plan'?7:13}" rx="4" fill="${s.a===s.button&&s.phase!=='plan'?'#9dcca5':'#ffda65'}" stroke="#281f32" stroke-width="2"/><text x="${bp}" y="271" text-anchor="middle" font-size="13" fill="#35273e">按钮</text><g opacity="${s.key?.3:1}" transform="translate(${kx} 159)"><circle cx="0" cy="0" r="8" fill="#ffda65" stroke="#281f32" stroke-width="2"/><circle cx="0" cy="0" r="3" fill="#776087"/><path d="M0 8v17h7m-7-6h5" stroke="#281f32" stroke-width="7" fill="none"/><path d="M0 8v17h7m-7-6h5" stroke="#ffda65" stroke-width="4" fill="none"/></g><text x="${Math.max(42,Math.min(294,kx))}" y="271" text-anchor="middle" font-size="13" fill="#35273e">${s.key?'已取钥匙':'钥匙'}</text>${person(s.a)}${person(s.b,true)}</svg>`}
  let callerFocus=0,callerRound='',resultConnection=null;const retiredRuns=new Set();
  let active=null,view=null,dispose=null,serial=0,practice=false,localAction='stop',guestConn=null,lobbyTicket=0;
  const el=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=id=>'<img class="x-icon" src="assets/map-icons/'+id+'.svg" alt="">';
  const button=(key,text,extra='')=>'<button class="x-btn '+extra+'" data-x="'+key+'">'+text+'</button>';
  function shell(mode,role){
    clearNetZones();window.onkeydown=null;window.onkeyup=null;window._keys={};
    const m=META[mode];practice=false;localAction='stop';
    el('app').innerHTML='<main class="x-shell"><header class="x-top"><button class="x-back" id="back" aria-label="返回">‹</button><span>双人合作 · '+esc(PEER.room)+'</span><b id="x-time">准备中</b></header><div class="x-heading">'+icon(mode)+'<h1>'+m.name+'</h1></div><div class="x-role '+(role==='B'?'is-b':'')+'"><b>'+role+'</b><span id="x-duty">'+esc(m[role.toLowerCase()])+'</span></div><section class="x-paper"><div class="x-stats"><span id="x-health">配合机会 ●●●</span><b id="x-progress"></b></div><div id="x-stage" class="x-stage"></div><div class="x-meter"><i id="x-meter"></i></div><p id="x-hint" class="x-hint"></p><div id="x-actions" class="x-actions"></div><div id="x-message" class="x-message" role="status" aria-live="polite"></div></section><section id="x-brief" class="x-brief"><b>先试一下，再出发</b><p>'+esc(m[role.toLowerCase()])+'</p><div id="x-practice"></div><button id="x-ready" class="x-btn primary" disabled>先完成上面的小练习</button></section><div id="x-result" class="x-result" hidden></div></main>';
    if(mode==='shadow')el('app').innerHTML='<main class="x-shell x-shadow-shell"><header class="x-top"><button class="x-back" id="back" aria-label="返回">‹</button><div class="x-heading"><h1>影子替身</h1></div><span id="shadow-tier"></span><b id="x-time">准备中</b></header><div class="x-role '+(role==='B'?'is-b':'')+'"><b>'+role+'</b><span id="x-duty"></span></div><section class="x-paper"><div id="x-health" hidden></div><div id="x-progress" hidden></div><div id="x-stage" class="x-stage"></div><div class="x-meter" hidden><i id="x-meter"></i></div></section><p id="x-hint" class="x-hint"></p><div id="x-actions" class="x-actions"></div><div id="x-message" class="x-message" role="status" aria-live="polite"></div><section id="x-brief" class="x-brief"><b>先试一下，再出发</b><p>'+esc(m[role.toLowerCase()])+'</p><div id="x-practice"></div><button id="x-ready" class="x-btn primary" disabled>先完成上面的小练习</button></section><div id="x-result" class="x-result" hidden></div></main>';
    el('back').onclick=()=>{if(window._dungeon)dungeonAbort();else{netSend({t:'bye'});clearTimers();closePeer();location.search='';}};
    const demo=mode==='lookback'?(role==='A'?'听到「躲起来」时，点这里躲藏':'练习：长耳朵怪物靠听觉追踪，该喊什么？'):mode==='caller'?(role==='A'?'练习：询问来电者的工号':'练习：工号不符，该怎么投票？'):(role==='A'?'练习：踩按钮留足过门时间，再走到集合出口。':'练习：拿到钥匙后返回出口，等 A 的回声一起撤离。');
    el('x-practice').innerHTML='<p>'+demo+'</p>'+button('practice',mode==='lookback'?(role==='A'?'躲藏':'停步'):mode==='caller'?(role==='A'?'请报工号':'拒绝'):(role==='A'?'踩按钮 → 出口等待':'取钥匙 → 回出口集合'));
    el('x-practice').onclick=e=>{if(!e.target.closest('[data-x]'))return;practice=true;el('x-practice').innerHTML='<p class="x-practiced">✓ 练习完成。正式行动要听搭档的情报。</p>';el('x-ready').disabled=false;el('x-ready').textContent='我准备好了';};
    el('x-ready').onclick=()=>{if(practice)send('ready',role);};
    el('x-actions').onclick=e=>{const b=e.target.closest('[data-x]');if(!b||b.disabled)return;const k=b.dataset.x;if(['go','stop','hide'].includes(k))localAction=k;send(k,role);};
    function release(){localAction='stop';if(mode==='lookback'&&role==='A')send('stop',role);}
    function key(e){if(/INPUT|TEXTAREA/.test(e.target.tagName))return;const maps=mode==='lookback'?(role==='A'?{ArrowUp:'go',Space:'stop',ArrowDown:'hide'}:{ArrowLeft:'left',ArrowRight:'right',Space:'lure'}):mode==='shadow'?{ArrowLeft:'left',ArrowRight:'right'}:{};if(maps[e.code]&&!e.repeat){e.preventDefault();const b=document.querySelector('[data-x="'+maps[e.code]+'"]');if(b&&!b.disabled)b.click();}}
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
    const isTheme=themed(s)&&s.mode!=='shadow',root=document.querySelector('.x-shell');root.dataset.roomTheme=isTheme?s.roomId:'';
    root.querySelector('.x-heading h1').textContent=isTheme?themeName(s):META[s.mode].name;
    el('x-time').textContent=!s.ready.A||!s.ready.B?'准备中':s.cd>0?Math.ceil(s.cd):Math.ceil(s.time)+'s';
    el('x-health').textContent='配合机会 '+'●'.repeat(Math.max(0,s.hp))+'○'.repeat(Math.max(0,3-s.hp));
    el('x-progress').textContent=s.completed+' / '+(s.mode==='shadow'?2:5);
    el('x-message').textContent=themeText(s,s.message);
    el('x-brief').hidden=s.ready.A&&s.ready.B;
    if(s.ready[role]){el('x-ready').disabled=true;el('x-ready').textContent='已准备 · 等待搭档';}
    let html='',hint='',meter=0;
    if(s.mode==='lookback'){
      const danger=s.phase==='danger',warn=s.phase==='warning';
      const monsters=isTheme?{ears:['红灯巡查','停步','红灯监听脚步，保持不动'],eyes:['绿灯放行','前进','绿灯检查通行，继续前进'],nose:['搜索扫描','躲藏','扫描正在靠近，藏进掩体']}:{ears:['听声怪','停步','长耳朵会听脚步声'],eyes:['凝视怪','前进','盯着静止的人追'],nose:['嗅探怪','躲藏','躲进柜子遮住气味']};
      if(role==='A'){
        html='<div class="x-corridor '+(danger?'danger':'')+'"><div class="x-door"><span>告诉 B 开哪扇门</span><strong>'+(s.door==='left'?'← 左门':'右门 →')+'</strong><i class="'+(s.openDoor===s.door?'open':'')+'">'+(s.openDoor===s.door?'门已打开':'等待 B 开门')+'</i></div><div class="x-agent '+s.action+'"><span>A</span></div><div class="x-cupboard">躲藏柜</div><div class="x-floor"></div></div>';
        actions(button('go','↑ 前进')+button('stop','■ 停步')+button('hide','↓ 躲藏'));
        hint=warn?'身后有动静！听 B 报怪物，再选择动作。':danger?'怪物经过！保持 B 指定的动作。':s.phase==='safe'?'暂时安全，准备下一段。':'把门上方向报给 B，开门后点前进。';
      }else{
        const m=monsters[s.monster];
        html='<div class="x-monitor '+(danger?'danger':'')+'"><div class="x-monitor-label">后方监控 · '+(warn?'发现目标':danger?'接近中':'巡查中')+'</div><div class="x-monster '+s.monster+'"><i></i><i></i><b></b></div><h2>'+(warn||danger?m[0]:'走廊暂时安全')+'</h2><p>'+(warn||danger?m[2]+' · 喊「'+m[1]+'」':'听 A 报方向，打开对应的门')+'</p></div>';
        actions(button('left','← 开左门')+button('right','开右门 →')+button('lure',s.lures?'应急诱饵 · 本局 1 次':'诱饵已用完','wide'));
        hint=warn?'还有 '+Math.max(0,s.warningLimit-s.phaseTime).toFixed(1)+' 秒，告诉 A 应对方式。':danger?'来不及应对时可以救场：整局只有一次应急诱饵。':'开门只看 A 报的方向，两扇门可以随时切换。';
      }
      meter=s.phase==='travel'?s.travel/s.travelLimit:warn?s.phaseTime/s.warningLimit:danger?s.phaseTime/s.dangerLimit:1;
    }else if(s.mode==='caller'){
      if(role==='A'){
        const c=s.claim;
        html='<div class="x-call-head">'+icon('caller')+'<span>线路 0'+(s.completed+(s.phase==='call'?1:0))+' · 来电接通</span></div><div class="x-speech"><b>“我是'+esc(c.name)+'，'+esc(c.job)+'。请开门。”</b><p>工号：'+esc(c.code||'还没问到')+'</p><p>任务：'+esc(c.task||'还没问到')+'</p><p>来路：'+esc(c.route||'还没问到')+'</p></div><p class="x-small">把这些话报给 B；今日任务按档案核对，不凭岗位猜。</p>';
        actions(button('code','询问工号')+button('task','询问任务')+button('route','追问来路')+button('extra','追加追问 −8秒')+button('admit','放行','primary')+button('reject','拒绝'));
      }else{
        const roundKey=s.id+':'+s.round;if(callerRound!==roundKey){callerRound=roundKey;callerFocus=0;}const p=s.roster[callerFocus]||s.roster[0];
        html='<div class="x-speech"><b>今日核验：'+s.checks.map(k=>({code:'工号',task:'任务',route:'来路'})[k]).join('＋')+'</b><p>先告诉 A 该问哪两项。任务以今日档案为准。'+(s.checks.includes('route')?s.closed+'整晚封闭，声称刚从这里直接经过的人在撒谎。':'')+'</p></div><div class="x-file-title">听名字，点开对应档案</div><div class="caller-people">'+s.roster.map((p,i)=>'<button data-person="'+i+'" class="'+(i===callerFocus?'selected':'')+'">'+esc(p.name)+'</button>').join('')+'</div><div class="x-roster"><article><b>'+esc(p.name)+' <small>'+esc(p.job)+'</small></b><strong>'+p.code+'</strong><p>'+esc(p.task)+'</p></article></div>';
        actions(button('admit','核对无误 · 放行','primary')+button('reject','发现矛盾 · 拒绝'));
      }
      hint=s.phase==='verdict'?s.explanation:s.votes.A&&s.votes.B&&s.votes.A!==s.votes.B?'你们意见不同。交流证据后，可点按钮改票。':(s.extra?'已追加追问 · 共问 '+s.questions.length+' / 3':'免费提问 '+s.questions.length+' / 2')+'；先听 B 指定核验内容，再询问。';
      meter=Math.min(1,s.questions.length/2);
    }else{
      const recording=s.phase==='record',replay=s.phase==='replay',echo=replay||s.phase==='escape';
      const actor=echo?s.ghost:s.positions.A,layout=s.layout,dir=layout.mirror?'左':'右',back=layout.mirror?'右':'左';
      const aAt=echo&&actor===s.exit,bAt=s.positions.B===s.exit,won=s.done&&s.win;
      el('shadow-tier').textContent=['','入门','进阶','挑战','极限'][s.tier||1];
      el('x-duty').textContent=role==='A'?'录下踩按钮，再走到集合出口等待。':'播放回声，拿钥匙后回集合出口。';
      const title=s.done?(s.win?'共同撤离成功':'时间用尽 · 撤离失败'):{plan:'先让 A 录下动作',record:'● A 正在录影',waiting:'录好了，轮到 B',replay:'▶ 回声正在回放',escape:aAt?'A 在出口等你':'回声没有到出口',retry:'重新配合，再试一次'}[s.phase];
      const status=s.keyCollected?'钥匙已开门禁 · 可以回来':s.doorOpen?'按钮被踩住 → 门禁打开':'按钮松开 → 门禁关闭';
      const timeline=s.done?(won?'两人一起离开密室':'本局已结束，重新开局再挑战'):recording?'录影剩余 '+Math.ceil(s.recordLength-s.recordTime)+' 秒':replay?'回放剩余 '+Math.ceil(s.recordLength-s.playTime)+' 秒':s.phase==='escape'?'回放已结束 · 回声保留末位':'本次录影 '+s.recordLength+' 秒';
      const check=(yes,text)=>'<span class="'+(yes?'yes':'no')+'">'+(yes?'✓':'○')+' '+text+'</span>';
      html='<div class="shadow-body"><h2>'+title+'</h2><div class="shadow-approved-scene">'+shadowSVG({phase:s.phase,button:layout.button,mirror:layout.mirror,a:actor,b:s.positions.B,echo,open:s.doorOpen,key:s.keyCollected})+'</div><div class="shadow-status">'+status+'</div><div class="shadow-clock">'+timeline+'</div><div class="shadow-checklist">'+check(s.keyCollected,'钥匙')+check(aAt,'A 回声到达')+check(bAt,'B 到达')+'</div></div>';
      actions(button('left','← 向左走')+button('right','向右走 →')+(role==='A'?button('record',s.done?(won?'共同撤离成功':'本局已结束'):s.attempts?'重新录一遍':'开始录影 · '+s.recordLength+' 秒','wide primary'):button('replay',s.done?(won?'共同撤离成功':'本局已结束'):s.phase==='escape'?'再放一次影子':'播放影子 · 出发','wide primary')));
      hint=s.done?s.message:s.phase==='plan'?'A 先向'+dir+'找按钮，踩住几秒，再到集合出口停下。':recording?(role==='A'?'先留足开门时间，再走到集合出口；录影结束前不要离开。':'观察 A 的轨迹；录完后由你播放回声。'):s.phase==='waiting'?(role==='A'?'录好了。等 B 播放，再提醒他何时过门。':'播放后向'+dir+'取钥匙，再向'+back+'回出口集合。'):s.phase==='escape'&&!aAt?(role==='A'?'回声没有停在出口。重新录：踩按钮后走到集合出口。':'回声没到出口。请 A 重新录好轨迹。'):s.keyCollected?(role==='A'?'提醒 B 回集合出口，等待回声一起撤离。':'钥匙已解开门禁。向'+back+'回集合出口，与 A 的回声会合。'):role==='A'?'现在踩按钮的是回声。提醒 B 趁门开时穿过。':'向'+dir+'穿门禁取钥匙，拿到后还要回集合出口。';
      if(s.message==='门还关着，等影子踩到黄色按钮。')hint=s.message;
    }
    // Keep controls stable during state broadcasts; only the scene is redrawn.
    const focusedPerson=document.activeElement&&document.activeElement.getAttribute('data-person');
    if(isTheme){
      if(s.mode==='caller')html='<div class="room-scene-label">夜班公司 · '+(role==='A'?'员工门禁对讲':'人事档案终端')+'</div>'+html.replace(/线路/g,'门禁线路').replace(/来电接通/g,'访客等候').replace(/工号/g,'员工编号').replace(/值班表/g,'员工名册');
      if(s.mode==='shadow')html='<div class="room-scene-label">旅馆 237 · 姐妹的回声</div>'+html.replace('shadow-wall"></div>','shadow-wall"><span>237</span></div>').replace('A 的影子','姐姐的回声').replace('>正在录<','>姐姐录影<').replace('>拿钥匙</small>','>妹妹取钥匙</small>');
      if(s.mode==='lookback'){
        html='<div class="room-scene-label">试炼游戏场 · '+(role==='A'?'参赛者通道':'观察者信号台')+'</div>'+html.replace(/躲藏柜/g,'掩体').replace(/后方监控/g,'观察台').replace('x-monster '+s.monster,'x-monster observer '+s.monster);
        if(!practice)el('x-practice').querySelector('p').textContent=role==='A'?'练习：听到「扫描」时，点躲藏。':'练习：观察台亮起红灯，应该喊什么？';
      }
    }
    // Broadcasts update the clock every 80 ms. Keep unchanged scene nodes alive
    // so a touch can finish on its original button and static icons do not reload.
    const stage=el('x-stage');
    if(stage._sceneHTML!==html){
    stage.innerHTML=html;stage._sceneHTML=html;
    stage.querySelectorAll('[data-person]').forEach(b=>{
      b.setAttribute('aria-pressed',String(+b.dataset.person===callerFocus));
      b.onclick=()=>{callerFocus=+b.dataset.person;draw(view,role);const selected=el('x-stage').querySelector('[data-person="'+callerFocus+'"]');if(selected)selected.focus({preventScroll:true});};
    });
    if(focusedPerson!==null){const restored=el('x-stage').querySelector('[data-person="'+focusedPerson+'"]');if(restored)restored.focus({preventScroll:true});}
    }
    el('x-hint').textContent=wait?(s.ready.A&&s.ready.B?'双方就绪，倒计时后开始。':'完成小练习，然后准备。'):themeText(s,hint);el('x-meter').style.width=clamp(meter*100,0,100)+'%';
    if(isTheme){const duties={caller:['你守门禁：按 B 指定的两项核验员工身份，交换证据后共同放行。','你查人事档案：报核验项、查员工编号与任务，留意封闭通道。'],shadow:['姐姐 A：录下踩按钮、走到集合出口等待的轨迹。','妹妹 B：播放回声，穿门取钥匙后回出口与姐姐集合。'],lookback:['你看前路：向 B 报门向；听信号选择前进、停步或躲藏。','你看观察台：红灯喊停、绿灯喊走、扫描喊躲；按 A 报的方向开门。']};el('x-duty').textContent=duties[s.mode][role==='A'?0:1];root.querySelector('#x-brief>p').textContent=el('x-duty').textContent;}
    document.querySelectorAll('#x-actions [data-x]').forEach(b=>{
      const k=b.dataset.x;
      b.disabled=wait||s.done;
      if(s.mode==='lookback'){if(k==='lure')b.disabled=b.disabled||s.phase!=='danger'||s.rescue||!s.lures;b.classList.toggle('selected',k===s.action||k===s.openDoor);}
      if(s.mode==='caller'){if(['code','task','route'].includes(k))b.disabled=b.disabled||s.questions.includes(k)||s.questions.length>=(s.extra?3:2);if(k==='extra')b.disabled=b.disabled||s.extra||s.questions.length!==2;b.disabled=b.disabled||s.phase!=='call'||(['admit','reject'].includes(k)&&s.questions.length<2);b.classList.toggle('selected',s.votes[role]===k||s.questions.includes(k));}
      if(s.mode==='shadow'){if(k==='left'||k==='right')b.disabled=b.disabled||(role==='A'?s.phase!=='record':!['replay','escape'].includes(s.phase));if(k==='record')b.disabled=b.disabled||!['plan','waiting','retry','escape'].includes(s.phase);if(k==='replay')b.disabled=b.disabled||!['waiting','retry','escape'].includes(s.phase)||!s.tape.length;}
      if(s.mode==='lookback'&&['go','stop','hide','left','right'].includes(k)||s.mode==='caller'&&['admit','reject'].includes(k))b.setAttribute('aria-pressed',String(b.classList.contains('selected')));
    });
    if(s.done&&!window._dungeon&&!g.RoomResults)result(s,role);
  }
  function result(s,role){
    const r=el('x-result');if(!r||r.dataset.id===s.id)return;
    r.dataset.id=s.id;r.hidden=false;r.innerHTML='<h2>'+(s.win?'配合成功！':'再试一次？')+'</h2><p>'+esc(s.message)+'</p>'+button('restart','我准备再来一局','primary');
    r.onclick=e=>{if(!e.target.closest('button'))return;e.target.disabled=true;e.target.textContent='等待搭档准备';if(role==='A'){active.restart.A=true;restartCheck();}else netSend({t:'xRestart',id:s.id});};
  }
  function beginResult(s,role){
    if(!g.RoomResults)return;
    if(!window._dungeon)g.RoomResults.begin({runId:s.id,role,connection:PEER.conn,gameId:s.mode,title:META[s.mode].name,dungeon:null,onContinue:()=>{if(role==='A')host(s.mode);},onExit:()=>{netSend({t:'bye'});clearTimers();closePeer();renderHall();}});
    s.resultRunId=g.RoomResults.status()?.runId;
    s.resultContext=window._dungeon?window._roomGameContext:null;
  }
  function reportResult(s){
    if(!g.RoomResults||s.resultReported)return;
    if(!s.resultRunId||g.RoomResults.status()?.runId!==s.resultRunId)return;
    const data={win:s.win,reasonCode:s.win?'completed':s.reasonCode==='time_expired'?'timeout':s.reasonCode||'objective_failed',reason:s.reasonCode==='time_expired'?'行动时间用尽。':s.reasonCode==='attempts_exhausted'?'配合机会已用尽。':s.win?'双方已完成本次目标。':'本次目标未完成。',metrics:{durationMs:Math.round(s.elapsed*1000),timeLeftMs:Math.max(0,Math.round(s.time*1000)),completed:s.completed,goal:s.mode==='shadow'?1:5}};
    if(s.mode!=='shadow')Object.assign(data.metrics,{hp:Math.max(0,s.hp),mistakesRemaining:Math.max(0,s.hp),maxMistakes:3});
    s.resultReported=s.resultContext?s.resultContext.finish(data):g.RoomResults.report(data);
  }
  function cleanup(){if(dispose){const f=dispose;dispose=null;f();}active=null;view=null;API.state=null;API.view=null;}
  function restartCheck(){if(active&&active.restart.A&&active.restart.B)host(active.mode);}
  function host(mode){
    clearTimers();closeFB();S.mod=mode;window._dead=false;serial=0;
    active=create(mode);if(window._dungeon&&typeof window.coopTime==='function')active.time=window.coopTime(active.time);active.restart={A:false,B:false};API.state=active;shell(mode,'A');
    const s=active;beginResult(s,'A');let last=performance.now(),next=0,endAt=null,loop;
    function tick(){
      if(active!==s)return;
      const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;step(s,dt);
      if(now>=next){draw(snapshot(s,'A'),'A');netSend({t:'xState',state:snapshot(s,'B')});next=now+80;}
      if(s.done&&g.RoomResults){draw(snapshot(s,'A'),'A');netSend({t:'xState',state:snapshot(s,'B')});window._dead=true;reportResult(s);if(s.resultReported)clearInterval(loop);return;}
      if(s.done){window._dead=true;if(endAt===null)endAt=now+1600;if(window._dungeon&&now>=endAt){const won=s.win;clearTimers();dungeonEnd(won);}}
    }
    loop=setInterval(tick,20);timers.push(loop);tick();
  }
  function guest(mode){clearTimers();closeFB();S.mod=mode;serial=0;window._dead=false;shell(mode,'B');
    if(!window._dungeon&&PEER.conn!==guestConn){guestConn=PEER.conn;const conn=guestConn;conn.on('data',d=>{if(g.RoomResults&&g.RoomResults.consume(d,conn))return;if(PEER.conn===conn)dgGuestOnData(d);});}
  }
  function incoming(d){
    if(d&&d.t==='xWelcome'&&IDS.includes(d.mode)&&!window._dungeon){guest(d.mode);return true;}
    if(!d)return false;
    if(d.t!=='xState'||!d.state||!IDS.includes(d.state.mode))return false;
    const s=d.state;if(S.mod!==s.mode)return true;
    if(resultConnection!==PEER.conn){resultConnection=PEER.conn;retiredRuns.clear();}
    if(retiredRuns.has(s.id))return true;
    if(view&&view.id!==s.id)retiredRuns.add(view.id);
    if(!el('x-stage')||!view||view.id!==s.id){if(!el('x-stage')||view&&view.id!==s.id)guest(s.mode);}
    beginResult(s,'B');draw(s,'B');return true;
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
            conn.on('data',d=>{if(g.RoomResults&&g.RoomResults.consume(d,conn))return;if(PEER.conn===conn)dgHostOnData(d);});netSend({t:'xWelcome',mode});host(mode);
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
    wrap('dgHostOnData',(old,args)=>{const d=args[0];if(g.RoomResults&&g.RoomResults.consume(d,PEER.conn))return;if(d&&d.t==='xInput'){input(active,'B',d);return;}if(d&&d.t==='xRestart'){if(g.RoomResults)return;if(active&&active.done&&active.id===d.id){active.restart.B=true;restartCheck();}return;}return old(...args);});
    wrap('dgGuestOnData',(old,args)=>g.RoomResults&&g.RoomResults.consume(args[0],PEER.conn)?undefined:incoming(args[0])?undefined:old(...args));
    API.startHost=host;API.startGuest=guest;
  }
  install();
})(typeof window==='undefined'?globalThis:window);
