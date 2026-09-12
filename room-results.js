(function(g){
'use strict';
let session=null;const feedbackResults=new Set();
const metricKeys=['durationMs','timeLeftMs','completed','goal','mistakesRemaining','maxMistakes','hp','rescueUsed','rescueSucceeded'];
const reasonCodes=['completed','timeout','attempts_exhausted','objective_failed','health_exhausted','pressure_overflow','cargo_lost','incorrect_answer','disconnected'];
const reasonText={timeout:'时间用尽，重新商量一下配合节奏。',attempts_exhausted:'本局尝试机会已用尽。',health_exhausted:'设备耐久已耗尽。',pressure_overflow:'压力超出设备承受范围。',cargo_lost:'货物损坏或滑落次数已用尽。',incorrect_answer:'提交结果未通过核对。',objective_failed:'本次目标未完成，和同伴再试一次。'};
function send(s,p){if(session===s&&s.connection&&s.connection.open)s.connection.send(p);}
function packet(s,t,extra){return Object.assign({t,protocol:1,runId:s.runId},extra);}
function remove(){const el=document.getElementById('room-result');if(el){(el._motionTimers||[]).forEach(clearTimeout);el.remove();}const app=document.getElementById('app');if(app)app.inert=false;}
function close(){const s=session;session=null;if(s){clearInterval(s.retry);if(s.connection&&s.connection.off){s.connection.off('close',s.disconnect);s.connection.off('error',s.disconnect);}}remove();}
function begin(options){
 if(!options||!options.runId||!['A','B'].includes(options.role))throw Error('RoomResults requires runId and role');
 if(session&&session.runId===options.runId&&session.connection===options.connection)return;
 close();const s=session=Object.assign({},options,{ratingExcluded:!!options.developer||!!options.practice||!!options.tutorial||!!(options.dungeon&&g.DUNGEON?.nodes?.find(n=>n.id===options.dungeon.nodeId)?.roomTutorial)||g.RoomProgression?.progress().accessMode==='developer',result:null,acked:!options.connection,advanced:false,disconnected:false});
 s.disconnect=()=>{if(session!==s)return;s.disconnected=true;clearInterval(s.retry);if(s.result)draw(s);};
 if(s.connection){s.connection.on('close',s.disconnect);s.connection.on('error',s.disconnect);}
}
function feedback(s){if(s.feedbackSent||feedbackResults.has(s.result?.resultId)||s.disconnected||!s.result||typeof s.result.win!=='boolean')return;s.feedbackSent=true;feedbackResults.add(s.result.resultId);try{g.GameFeedback?.emit(s.result.win?'success':'fail',{source:'result:'+s.result.resultId});}catch(_){}}
function metrics(input){const out={};for(const k of metricKeys)if(input&&Number.isFinite(input[k])&&input[k]>=0)out[k]=input[k];return out;}
function report(data){
 const s=session;if(!s||s.role!=='A'||s.result||s.advanced||s.disconnected)return false;
 if(!data||typeof data.win!=='boolean')throw Error('Result requires explicit win');
 // Claim the terminal before applying existing accounting: reentrant callbacks cannot settle twice.
 s.result={pending:true};let d=s.dungeon?Object.assign({},s.dungeon):null;
 try{if(s.apply){const state=s.apply(data);if(state)d=Object.assign(d||{},state);}}
 catch(error){s.disconnected=true;s.result={stage:'interrupted',gameId:s.gameId,metrics:{},reason:'结果处理未完成，请返回。'};draw(s);throw error;}
 if(session!==s)return false;
 const stage=d&&data.win&&d.final?'room-complete':d&&d.over&&!data.win?'room-fail':data.win?'game-success':'game-fail';
 const reasonCode=reasonCodes.includes(data.reasonCode)?data.reasonCode:data.win?'completed':'objective_failed';
 const rating=g.CooperationRating?.score({gameId:s.gameId,win:data.win,stage,reasonCode,metrics:metrics(data.metrics)},s.ratingConfig||{});
 s.result=Object.freeze({rating:rating||null,resultId:s.runId+':result',gameId:s.gameId,win:data.win,stage,reasonCode,reason:typeof data.reason==='string'?data.reason.slice(0,160):reasonText[reasonCode]||'',metrics:Object.freeze(metrics(data.metrics)),dungeon:d&&Object.freeze(d)});
 try{g.CooperationRating?.record(s.result,s.result.rating,{role:s.role,excluded:s.ratingExcluded});}catch(_){}
 feedback(s);draw(s);send(s,packet(s,'roomResult',{result:s.result}));
 if(s.connection)s.retry=setInterval(()=>{if(session!==s||s.acked||s.disconnected){clearInterval(s.retry);return;}send(s,packet(s,'roomResult',{result:s.result}));},500);
 return true;
}
function consume(p,connection){
 if(!p||!['roomResult','roomResultAck','roomResultAdvance'].includes(p.t))return false;
 const s=session;if(!s||s.disconnected||s.connection!==connection||p.protocol!==1||p.runId!==s.runId)return true;
 if(p.t==='roomResult'&&s.role==='B'){
  const r=p.result;if(!r||r.resultId!==s.runId+':result'||r.gameId!==s.gameId||typeof r.win!=='boolean'||!['game-success','game-fail','room-complete','room-fail'].includes(r.stage))return true;
  if(s.advanced)return true;
  if(!s.result){s.result=Object.freeze(Object.assign({},r,{metrics:Object.freeze(metrics(r.metrics))}));s.acked=true;if(s.onResult)s.onResult(s.result);feedback(s);draw(s);}
  send(s,packet(s,'roomResultAck',{resultId:s.result.resultId}));
 }else if(p.t==='roomResultAck'&&s.role==='A'&&s.result&&p.resultId===s.result.resultId){const fresh=!s.acked;s.acked=true;clearInterval(s.retry);if(fresh){const root=document.getElementById('room-result');if(root){root.querySelector('.rr-note').textContent='两端已同步本次结果。';root.querySelector('.rr-primary').disabled=false;}}}
 else if(p.t==='roomResultAdvance'&&s.role==='B'&&s.result&&p.resultId===s.result.resultId&&!s.advanced){s.advanced=true;remove();if(s.onContinue)s.onContinue(s.result);}
 return true;
}
function advance(){const s=session;if(!s||s.role!=='A'||!s.result||!s.acked||s.advanced||s.disconnected)return false;s.advanced=true;send(s,packet(s,'roomResultAdvance',{resultId:s.result.resultId}));remove();if(s.onContinue)s.onContinue(s.result);return true;}
function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el;}
function draw(s){
 if(session!==s)return;remove();const r=s.result,root=node('section','rr-screen');root.id='room-result';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','rr-title');
 const app=document.getElementById('app');if(app)app.inert=true;root.dataset.stage=r.stage;
 root.onkeydown=e=>{if(e.key!=='Tab')return;const buttons=Array.from(root.querySelectorAll('button:not(:disabled)'));if(!buttons.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};
 const top=node('div','rr-top','ROOMLAB · 双人行动');top.append(node('span','', '你是 '+s.role));root.append(top);
 root.append(node('p','rr-name',r.stage==='room-complete'||r.stage==='room-fail'?s.roomTitle||s.title||s.gameId:s.title||s.gameId));const title=node('h1','',s.disconnected?'连接已中断':r.stage==='room-complete'?'恭喜，密室通关！':r.stage==='room-fail'?'这次，先休息一下':r.win?'这次，配合上了！':'差一点，再配合一次');title.id='rr-title';root.append(title);
 if(r.stage==='room-complete'&&s.art){const cover=node('img','rr-room-cover');cover.src=s.dungeon&&s.dungeon.roomId?'assets/rooms/webp/'+encodeURIComponent(s.dungeon.roomId)+'.webp':s.art;cover.alt='本次密室封面';cover.onerror=()=>{if(cover.dataset.fallback){cover.remove();return;}cover.dataset.fallback='true';cover.src=s.art;};root.querySelector('.rr-name').prepend(cover);}
 const art=node('div','rr-art');const img=node('img');const fallback='assets/result-ui/'+(r.stage==='room-complete'?'room-complete':r.win?'game-success':'game-fail')+'.webp';img.src=fallback;img.alt=r.stage==='room-complete'?'两位同伴一起走出密室':r.win?'两位同伴一起庆祝':'两位同伴一起调整配合';img.onerror=()=>{img.remove();art.append(node('p','','A 与 B · 双人行动'));};art.append(img);root.append(art);
 root.append(node('strong','rr-together',r.win?'A 与 B 共同完成':'A 与 B 一起再试一次'));if(r.reason)root.append(node('p','rr-reason',r.reason));
 const stats=node('div','rr-stats'),m=r.metrics||{};function stat(label,value){const x=node('div');x.append(node('small','',label),node('b','',value));stats.append(x);}
 if(m.durationMs!=null)stat('本局用时',Math.floor(m.durationMs/60000)+':'+String(Math.floor(m.durationMs/1000)%60).padStart(2,'0'));
 if(m.completed!=null&&m.goal!=null)stat('完成进度',m.completed+' / '+m.goal);
 if(r.dungeon&&r.dungeon.hpAfter!=null&&!r.win)stat('队伍剩余机会',String(r.dungeon.hpAfter));if(stats.childNodes.length)root.append(stats);
 if(!s.disconnected)g.CooperationRating?.decorate(root,r,r.rating);
 const footer=node('div','rr-bottom');footer.append(node('p','rr-note',s.disconnected?'请返回重新连接。':!s.acked?'等待同伴确认结果…':s.role==='B'?'等待同伴继续':'两端已同步本次结果。'));
 const actions=node('div','rr-actions'),exit=node('button','','返回'+(s.roomSession?'难度选择':s.dungeon?'密室选择':'玩法选择')),next=node('button','rr-primary',s.role==='B'?'等待同伴继续':s.roomSession?'返回难度选择':s.dungeon?r.stage==='room-fail'?'重新挑战':r.stage==='room-complete'?'再来一局':'返回地图':'再来一局');
 exit.onclick=()=>{close();if(s.onExit)s.onExit();};next.disabled=s.role==='B'||!s.acked||s.disconnected;next.onclick=advance;actions.append(exit,next);footer.append(actions);root.append(footer);document.body.append(root);(next.disabled?exit:next).focus({preventScroll:true});
 const reduced=g.matchMedia&&g.matchMedia('(prefers-reduced-motion: reduce)').matches;
 root.dataset.motion='hold';if(!reduced&&!s.disconnected){const final=r.stage==='room-complete',entry=final?280:180,end=final?900:r.win?600:500;root.dataset.motion='entry';if(final)title.textContent='最后一道门，开了';const skip=node('button','rr-skip','跳过动效');skip.type='button';top.append(skip);const hold=()=>{root.dataset.motion='hold';if(final)title.textContent='恭喜，密室通关！';skip.remove();};skip.onclick=()=>{(root._motionTimers||[]).forEach(clearTimeout);hold();};root._motionTimers=[setTimeout(()=>{if(root.isConnected){root.dataset.motion='emphasis';if(final)title.textContent='恭喜，密室通关！';}},entry),setTimeout(hold,end)];}
}
g.RoomResults={begin,report,consume,advance,close,status(){const s=session;return s?{runId:s.runId,resultId:s.result&&!s.result.pending?s.result.resultId:null,stage:s.disconnected?'interrupted':s.advanced?'advanced':s.result&&!s.result.pending?s.result.stage:'playing',outcome:s.result&&typeof s.result.win==='boolean'?(s.result.win?'success':'fail'):null,acked:s.acked}:null;}};
})(window);

