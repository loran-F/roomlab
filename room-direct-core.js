(function(g){
'use strict';
let game=null;
function screen(ctx,config){
 const ui=catchDirectMount(ctx,config),button=ui.button;
 const state={ctx,config,ui,held:false,done:false,win:false,ready:{A:false,B:false},cd:3,canvas:ui.canvas};game=state;
 function input(value){state.held=value;if(ctx.role==='B'&&ctx.isActive())ctx.send({t:'directCatchInput',held:value});button.setAttribute('aria-pressed',String(value));}
 button.onpointerdown=e=>{if(button.disabled)return;e.preventDefault();try{button.setPointerCapture(e.pointerId);}catch(_){}input(true);};button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>input(false);
 ui.ready.onclick=()=>{state.ready[ctx.role]=true;ui.ready.disabled=true;if(ctx.role==='B')ctx.send({t:'directCatchReady'});};ui.back.onclick=ctx.abort;
 const release=()=>input(false);window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);const observer=new MutationObserver(()=>{if(!state.canvas.isConnected){window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',release);observer.disconnect();}});observer.observe(document.getElementById('app'),{childList:true,subtree:true});
 return state;
}
function snapshot(s){return {id:s.ctx.runId,tier:s.ctx.tier,roomId:s.ctx.roomId,px:s.px,pv:s.pv,items:(s.items||[]).map(x=>({...x})),score:s.score,goal:s.config.goal,time:s.time,ready:{...s.ready},cd:s.cd,done:s.done,win:s.win};}
function catchState(){if(!game||!game.ctx.isActive())return null;return JSON.parse(JSON.stringify(game.ctx.role==='B'?game.last||snapshot(game):snapshot(game)));}
function draw(s,v){if(!s.ctx.isActive()||!s.canvas.isConnected)return;s.ui.ready.hidden=!!(v.ready.A&&v.ready.B);catchMobileDraw(s.canvas.getContext('2d'),v.px,v.items);s.ui.status.textContent=!v.ready.A||!v.ready.B?'双方读完规则后准备':v.cd>0?'即将开始 · '+Math.ceil(v.cd):v.done?'本局结束':'配合移动，接住花盆';s.ui.count.textContent=v.cd>0?'准备中':Math.ceil(v.time)+' 秒';s.ui.goal.textContent=v.score+' / '+v.goal;s.ui.button.disabled=v.done||v.cd>0||!v.ready.A||!v.ready.B;}
function catchHost(ctx,config){
 const s=screen(ctx,config),generator=CatchVariation.create(ctx,config);Object.assign(s,{px:170,pv:0,score:0,time:config.timeLimit,elapsed:0,next:400,items:[],right:false,accumulator:0});let last=performance.now(),broadcast=0;
 function finish(win){if(s.done||!ctx.isActive())return;s.done=true;s.win=win;const final=snapshot(s);draw(s,final);ctx.send({t:'directCatchState',state:final});ctx.finish({win,reasonCode:win?'completed':'timeout',metrics:{durationMs:s.elapsed,timeLeftMs:Math.max(0,s.time*1000),completed:s.score,goal:config.goal}});}
 function tick(){if(!ctx.isActive()||s.done){clearInterval(timer);return;}const now=performance.now();s.accumulator+=Math.min(100,now-last);last=now;
 while(s.accumulator>=16&&!s.done){s.accumulator-=16;if(!s.ready.A||!s.ready.B)continue;if(s.cd>0){s.cd=Math.max(0,s.cd-.016);continue;}s.elapsed+=16;s.time=Math.max(0,s.time-.016);s.next-=16;if(s.next<=0&&s.items.length<config.maxActive){const it=generator.spawn(s.score);s.items.push({...it,y:-18});s.next=it.delay;}
 const direction=Number(s.right)-Number(s.held);s.pv=(s.pv+direction*config.moveAccelerationPerTick)*config.moveRetention;s.px=Math.max(config.receiverWidth/2,Math.min(340-config.receiverWidth/2,s.px+s.pv));const wind=(Math.sin(s.elapsed*.0011)*.5+Math.sin(s.elapsed*.00047+1.3)*.4)*config.windScale;
 for(let i=s.items.length-1;i>=0;i--){const it=s.items[i];it.vy+=config.gravityPerTick;it.x=Math.max(4,Math.min(336,it.x+wind+(it.vx||0)));it.y+=it.vy;if(it.y>=360){if(Math.abs(it.x-s.px)<=config.receiverWidth/2+8){if(it.type==='bad')s.time=Math.max(0,s.time-config.badPenalty);else s.score+=it.type==='gold'?2:1;}s.items.splice(i,1);}}
 if(s.score>=config.goal)finish(true);else if(s.time<=0)finish(false);}
 if(s.done)return;const frame=snapshot(s);draw(s,frame);if(now-broadcast>=66){broadcast=now;ctx.send({t:'directCatchState',state:frame});}}
 const timer=setInterval(tick,16);timers.push(timer);g._hostState=catchState;draw(s,snapshot(s));
}
function catchGuest(ctx,config){screen(ctx,config);g._guestState=catchState;}
const host=dgHostOnData;dgHostOnData=function(d){if(d?.t==='directCatchReady'){if(game?.ctx.role==='A'&&game.ctx.isActive())game.ready.B=true;return;}if(d?.t==='directCatchInput'){if(game?.ctx.role==='A'&&game.ctx.isActive()&&!game.done)game.right=d.held===true;return;}return host.apply(this,arguments);};
const guest=dgGuestOnData;dgGuestOnData=function(d){if(d?.t==='directCatchState'){if(game?.ctx.role==='B'&&game.ctx.isActive()&&d.state?.id===game.ctx.runId){game.last=d.state;draw(game,d.state);}return;}return guest.apply(this,arguments);};
g.RoomDirectCore=Object.freeze({catchHost,catchGuest,catchState});
})(window);
