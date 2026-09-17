(function(g){'use strict';
// One native text input owns selection, deletion, paste and IME composition.
// The boxes only mirror committed characters and never steal focus.
function mount(root,{length,onSubmit,inputId}){
 if(!Number.isInteger(length)||length<1||length>12)throw Error('Invalid answer length');
 root.replaceChildren();const form=document.createElement('form'),label=document.createElement('label'),field=document.createElement('div'),boxes=document.createElement('div'),input=document.createElement('input'),hint=document.createElement('p'),submit=document.createElement('button');
 const id=inputId||'fixed-answer-'+Math.random().toString(36).slice(2);let composing=false,committed='',locked=false;
 if(inputId){form.id='guess-form';submit.id='propose';}
 form.className='fixed-answer';label.htmlFor=id;label.textContent='你觉得是什么？';field.className='answer-field';boxes.className='answer-boxes';boxes.setAttribute('aria-hidden','true');boxes.style.setProperty('--letters',length);
 for(let i=0;i<length;i++)boxes.append(document.createElement('span'));
 input.id=id;input.type='text';input.autocomplete='off';input.spellcheck=false;input.className='answer-native';input.setAttribute('aria-describedby',id+'-hint');input.setAttribute('aria-label','物品名称，共'+length+'字');
 hint.id=id+'-hint';hint.className='answer-help';hint.setAttribute('aria-live','polite');submit.type='submit';submit.className='primary';submit.textContent='请同伴确认';
 function paint(){input.readOnly=locked&&!composing;const chars=Array.from(committed);Array.from(boxes.children).forEach((box,i)=>{box.textContent=chars[i]||'';box.classList.toggle('filled',i<chars.length);});hint.textContent=composing?'正在输入，选好汉字后会填入空框':'共 '+length+' 字 · 已填 '+chars.length+' 字';submit.disabled=locked||composing||chars.length!==length;}
 function settle(){if(composing)return;const before=input.value,pos=input.selectionStart??before.length;committed=Array.from(before.normalize('NFC').replace(/\s/gu,'')).slice(0,length).join('');if(input.value!==committed){input.value=committed;const at=Math.min(pos,committed.length);input.setSelectionRange(at,at);}paint();}
 input.addEventListener('compositionstart',()=>{composing=true;paint();});input.addEventListener('compositionend',()=>{composing=false;settle();});input.addEventListener('input',e=>{if(composing||e.isComposing)return;settle();});
 form.addEventListener('submit',e=>{e.preventDefault();if(composing||locked)return;settle();if(Array.from(committed).length===length)onSubmit(committed);});
 field.append(boxes,input);form.append(label,field,hint,submit);root.append(form);paint();
 return {value:()=>committed,clear(){input.value='';committed='';paint();},lock(value){locked=!!value;paint();},focus(){input.focus();}};
}
g.PictureAnswerInput={mount};
})(window);
