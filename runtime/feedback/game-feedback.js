/* RoomLab semantic sound and haptic feedback. Standalone candidate; no game wiring yet. */
(function(g){
'use strict';
const VERSION='1.0',EVENTS=Object.freeze(['tap','reveal','correct','error','warning','tick','success','fail']),STORE='roomlab-feedback-v1';
const definitions=Object.freeze({
 tap:{tones:[[360,0,.035,.035,'square']],vibrate:10},
 reveal:{tones:[[330,0,.07,.045,'sine'],[495,.065,.08,.04,'sine']],vibrate:18},
 correct:{tones:[[440,0,.09,.05,'sine'],[660,.08,.13,.055,'sine']],vibrate:[20,24,30]},
 error:{tones:[[170,0,.16,.06,'sawtooth']],vibrate:[35,25,35]},
 warning:{tones:[[280,0,.06,.045,'square'],[220,.08,.08,.04,'square']],vibrate:20},
 tick:{tones:[[720,0,.025,.022,'sine']],vibrate:6},
 success:{tones:[[392,0,.1,.05,'sine'],[523,.09,.12,.055,'sine'],[784,.2,.19,.06,'sine']],vibrate:[25,30,55]},
 fail:{tones:[[294,0,.12,.055,'triangle'],[220,.1,.14,.055,'triangle'],[147,.22,.16,.06,'triangle']],vibrate:[45,35,70]}
});
// Optional material voices change sound only; event haptics and privacy gates remain authoritative.
const voice=(wave,hz,end,duration,gain,delay=0)=>({wave,hz,end,duration,gain,delay});
const noise=(filter,hz,q,duration,gain,delay=0)=>({wave:'noise',filter,hz,q,duration,gain,delay});
const profiles=Object.freeze({
 'cargo-wood':{event:'tap',voices:[voice('triangle',175,100,.09,.035),noise('bandpass',950,.8,.035,.020)]},
 'cargo-ice':{event:'tap',voices:[voice('sine',115,75,.11,.025),voice('sine',920,920,.045,.014,.012),voice('sine',1370,1370,.04,.010,.032),voice('sine',1810,1810,.035,.008,.053)]},
 'cargo-glass':{event:'tap',voices:[voice('sine',1450,1450,.09,.015),voice('sine',2180,2180,.065,.010),voice('sine',3370,3370,.04,.006),voice('sine',200,200,.045,.010)]},
 'cargo-barrel':{event:'tap',voices:[voice('triangle',140,85,.06,.030),voice('triangle',140,85,.065,.018,.045),noise('bandpass',600,.8,.03,.010)]},
 'cargo-barrel-roll':{event:'tick',voices:[noise('bandpass',450,.7,.03,.015),noise('bandpass',650,.7,.03,.012,.045),noise('bandpass',500,.7,.03,.010,.095),voice('triangle',100,100,.12,.012)]},
 'cargo-glass-crack':{event:'warning',voices:[noise('highpass',1800,.7,.012,.018),noise('highpass',1800,.7,.016,.020,.045),noise('highpass',1800,.7,.022,.022,.1),... [0,.045,.1].map(delay=>voice('sine',2300,2300,.025,.009,delay))]},
 'cargo-glass-break':{event:'error',voices:[noise('bandpass',2400,.6,.09,.035),voice('sine',1500,1500,.065,.010),voice('sine',2370,2370,.055,.008,.014),voice('sine',3610,3610,.035,.005,.030),noise('lowpass',650,.7,.14,.018,.05)]}
});
let context=null,unlocked=false,settings=load(),serial=0;
const active=new Set(),timers=new Set(),listeners=new Set(),silent=new Map(),installed=new WeakSet();
const reduceQuery=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
function load(){try{const x=JSON.parse(localStorage.getItem(STORE)||'{}');return{sound:x.sound!==false,haptics:x.haptics!==false};}catch(_){return{sound:true,haptics:true};}}
function save(){try{localStorage.setItem(STORE,JSON.stringify(settings));}catch(_){}}
function notify(kind,data){const entry={kind,time:Date.now(),...data};for(const fn of [...listeners])try{fn(Object.freeze({...entry}));}catch(_){}return entry;}
function audioClass(){return g.AudioContext||g.webkitAudioContext||null;}
async function unlock(){const C=audioClass();if(!C){notify('unlock',{ok:false,reason:'audio-unsupported'});return false;}try{if(!context||context.state==='closed')context=new C();if(context.state==='suspended')await context.resume();unlocked=context.state==='running';notify('unlock',{ok:unlocked,reason:unlocked?'ready':context.state});return unlocked;}catch(e){unlocked=false;notify('unlock',{ok:false,reason:e?.name||'audio-error'});return false;}}
function installUnlock(target=g.document){if(!target?.addEventListener||installed.has(target))return false;installed.add(target);const types=['pointerdown','touchend','keydown'];const handler=e=>{if(e.type==='keydown'&&(e.ctrlKey||e.metaKey||e.altKey))return;types.forEach(type=>target.removeEventListener(type,handler,true));unlock();};types.forEach(type=>target.addEventListener(type,handler,{capture:true,passive:true}));return true;}
function tone(spec){const [frequency,delay,duration,volume,type]=spec,at=context.currentTime+delay,osc=context.createOscillator(),gain=context.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,at);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.connect(gain);gain.connect(context.destination);active.add(osc);osc.onended=()=>{active.delete(osc);try{osc.disconnect();gain.disconnect();}catch(_){}};osc.start(at);osc.stop(at+duration+.012);}
function materialVoice(v,index){const at=context.currentTime+v.delay,source=v.wave==='noise'?context.createBufferSource():context.createOscillator(),gain=context.createGain();let filter=null;
 if(v.wave==='noise'){const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*v.duration),context.sampleRate),data=buffer.getChannelData(0);let seed=(0x51f15e+index*101)>>>0;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}source.buffer=buffer;filter=context.createBiquadFilter();filter.type=v.filter;filter.frequency.setValueAtTime(v.hz,at);filter.Q.setValueAtTime(v.q,at);source.connect(filter);filter.connect(gain);
 }else{source.type=v.wave;source.frequency.setValueAtTime(v.hz,at);if(v.end!==v.hz)source.frequency.exponentialRampToValueAtTime(v.end,at+v.duration);source.connect(gain);}
 gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(v.gain,at+.003);gain.gain.exponentialRampToValueAtTime(.0001,at+v.duration);gain.connect(context.destination);active.add(source);source.onended=()=>{active.delete(source);for(const node of [source,filter,gain])try{node?.disconnect();}catch(_){}};source.start(at);source.stop(at+v.duration+.008);
}
function haptic(pattern){if(!settings.haptics||typeof navigator?.vibrate!=='function')return false;try{return navigator.vibrate(pattern)!==false;}catch(_){return false;}}
function emit(type,options={}){if(!EVENTS.includes(type))throw new TypeError('Unknown feedback event: '+type);const profile=Object.prototype.hasOwnProperty.call(profiles,options.profile)&&profiles[options.profile].event===type?profiles[options.profile]:null;const hidden=options.privacy==='hidden-timer'||silent.size>0,soundAllowed=settings.sound&&options.sound!==false,hapticAllowed=settings.haptics&&options.haptic!==false;let played=false,vibrated=false,reason='played';if(hidden)reason='silent-window';else{if(soundAllowed&&unlocked&&context?.state==='running')try{if(profile)profile.voices.forEach(materialVoice);else definitions[type].tones.forEach(tone);played=true;}catch(_){reason='audio-error';}else if(soundAllowed)reason=audioClass()?'audio-locked':'audio-unsupported';if(hapticAllowed)vibrated=haptic(definitions[type].vibrate);}const result=Object.freeze({type,played,vibrated,suppressed:hidden,reason,source:String(options.source||''),...(profile?{profile:options.profile}:{})});notify('emit',result);return result;}
function stop(reason='manual'){for(const osc of [...active])try{osc.stop();}catch(_){}active.clear();for(const t of timers)clearTimeout(t);timers.clear();try{navigator?.vibrate?.(0);}catch(_){}notify('stop',{reason});}
function setSound(value){settings.sound=!!value;save();if(!settings.sound)stop('sound-disabled');notify('preference',{name:'sound',value:settings.sound});return settings.sound;}
function setHaptics(value){settings.haptics=!!value;save();if(!settings.haptics)try{navigator?.vibrate?.(0);}catch(_){}notify('preference',{name:'haptics',value:settings.haptics});return settings.haptics;}
function preferences(){return Object.freeze({sound:settings.sound,haptics:settings.haptics,unlocked,audioSupported:!!audioClass(),vibrateSupported:typeof navigator?.vibrate==='function',reducedMotion:!!reduceQuery?.matches,silent:silent.size>0,silentKeys:Object.freeze([...silent.keys()])});}
function beginSilentWindow(key='anonymous'){key=String(key);const token=++serial;silent.set(token,key);stop('silent-window');notify('silent',{active:true,key});let done=false;return function(){if(done)return false;done=true;silent.delete(token);notify('silent',{active:silent.size>0,key});return true;};}
function subscribe(listener){if(typeof listener!=='function')throw new TypeError('listener must be a function');listeners.add(listener);return()=>listeners.delete(listener);}
function lifecycle(){stop(document.hidden?'page-hidden':'page-leave');}
if(g.document){document.addEventListener('visibilitychange',()=>{if(document.hidden)lifecycle();});g.addEventListener('pagehide',lifecycle);g.addEventListener('beforeunload',lifecycle);}
g.GameFeedback=Object.freeze({VERSION,EVENTS,installUnlock,unlock,emit,setSound,setHaptics,preferences,beginSilentWindow,stop,subscribe});
function controls(){
 if(document.getElementById('game-feedback-settings'))return;
 installUnlock();const panel=document.createElement('details');panel.id='game-feedback-settings';panel.className='game-feedback-settings';
 const summary=document.createElement('summary');summary.textContent='声音与震动';panel.append(summary);
 const row=document.createElement('div');row.className='feedback-controls';
 for(const [key,label,set] of [['sound','声音',setSound],['haptics','震动',setHaptics]]){const button=document.createElement('button');button.type='button';button.className='feedback-toggle';function paint(){button.setAttribute('aria-pressed',String(settings[key]));button.textContent=label+'：'+(settings[key]?'开':'关');}button.onclick=()=>{set(!settings[key]);paint();};paint();row.append(button);}
 panel.append(row);document.body.append(panel);
 document.addEventListener('click',e=>{const b=e.target.closest?.('button');if(b&&['back','room-back','dm2','dm3','main-enter'].includes(b.id))emit('tap',{source:'navigation'});});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',controls,{once:true});else controls();
})(window);
