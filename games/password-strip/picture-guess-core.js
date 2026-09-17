(function(g){'use strict';
const normalize=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
const fixedText=x=>String(x||'').normalize('NFC').replace(/\s/gu,'');
const answerLength=card=>Array.from(fixedText(card.answer)).length;
function create(card,runId){if(!card||![4,6,8].includes(card.offsets?.length)||!card.offsets.every(x=>Number.isInteger(x)&&Math.abs(x)<=(card.moveLimit||108))||!Number.isFinite(card.durationMs)||card.durationMs<=0)throw Error('无效的猜图配置');return {runId,cardId:card.id,layoutId:card.layoutId||card.id,difficulty:card.difficulty||2,windowWidth:card.windowWidth||144,phase:'prepare',ready:{A:false,B:false},revealed:{A:false,B:false},offsets:card.offsets.slice(),seq:{A:0,B:0},proposal:null,proposalSerial:0,history:[],moves:{A:0,B:0},solvedBy:null,notice:'看同一幅图，各自移动一半条片；认出来随时提案。'};}
function tick(s,now=Date.now()){if(s&&['play','proposal'].includes(s.phase)&&Number.isFinite(s.deadline)&&now>=s.deadline){s.phase='failed';s.proposal=null;s.notice='时间到了，本题结束。';return true;}return false;}
function input(s,d,role,card,now=Date.now()){if(!s||!d||!['A','B'].includes(role)||d.runId!==s.runId||!Number.isSafeInteger(d.seq)||d.seq<=s.seq[role])return false;
 if(tick(s,now))return true;
 const own=i=>Number.isInteger(i)&&i>=0&&i<s.offsets.length&&i%2===(role==='A'?0:1);
 if(d.kind==='ready'&&s.phase==='prepare'){s.seq[role]=d.seq;s.ready[role]=true;if(s.ready.A&&s.ready.B){s.phase='play';if(Number.isFinite(card.durationMs)&&card.durationMs>0){s.startedAt=now;s.deadline=now+card.durationMs;}}return true;}
 if(d.kind==='reveal'&&['solved','failed'].includes(s.phase)){s.seq[role]=d.seq;s.revealed[role]=true;return true;}
 if(d.kind==='move'&&s.phase==='play'&&own(d.index)&&Number.isInteger(d.value)&&Math.abs(d.value)<=(card.moveLimit||72)){s.seq[role]=d.seq;if(s.offsets[d.index]!==d.value)s.moves[role]++;s.offsets[d.index]=d.value;return true;}
 if(d.kind==='propose'&&s.phase==='play'&&typeof d.text==='string'&&d.text.length<=64&&normalize(d.text)&&(!card.fixedAnswer||Array.from(fixedText(d.text)).length===answerLength(card))){s.seq[role]=d.seq;s.proposal={id:s.runId+':'+(++s.proposalSerial),by:role,text:fixedText(d.text)};s.phase='proposal';s.notice='先听同伴意见；双方同意才验证。';return true;}
 if(d.kind==='respond'&&s.phase==='proposal'&&s.proposal&&d.proposalId===s.proposal.id&&role!==s.proposal.by&&typeof d.accept==='boolean'){s.seq[role]=d.seq;const p=s.proposal,correct=d.accept&&(card.fixedAnswer?fixedText(p.text)===fixedText(card.answer):card.aliases.some(a=>normalize(a)===normalize(p.text)));s.history.push({text:p.text,by:p.by,accepted:d.accept,correct,offsets:s.offsets.slice(),moves:{...s.moves}});s.proposal=null;s.phase=correct?'solved':'play';s.notice=!d.accept?'先继续拼，找一处能说服同伴的特征。':correct?'猜对了！不必再拼齐剩余条片。':'还不是，再找一处特征。条片进度已保留。';if(correct)s.solvedBy=p.by;return true;}return false;
}
function snapshot(s,card){const v=JSON.parse(JSON.stringify(s));delete v.seq;if(card.fixedAnswer)v.answerLength=answerLength(card);if(['solved','failed'].includes(s.phase)){v.answer=card.answer;if(!card.fixedAnswer)v.aliases=card.aliases.slice();}return v;}
g.PictureCore={normalize,fixedText,create,input,snapshot,tick};if(typeof module!=='undefined')module.exports=g.PictureCore;
})(typeof window==='undefined'?globalThis:window);
