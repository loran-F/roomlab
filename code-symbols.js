/* Ten related composite glyphs. No single detail identifies a digit. */
(function(){
'use strict';
var forms=[ [0,0,0,0,0],[0,0,1,1,0],[0,1,0,1,0],[0,1,1,0,0],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,1,1,1,0],[0,0,0,1,1],[1,0,0,0,1] ];
window.CODE_SYMBOL_FORMS=forms;
drawSymbol=function(c,id,x,y,size){
 var f=forms[id];if(!f)return;c.save();c.translate(x,y);c.scale(size,size);c.strokeStyle='#30253a';c.fillStyle='#30253a';c.lineWidth=.055;c.lineCap='round';c.lineJoin='round';
 function line(a,b,d,e){c.beginPath();c.moveTo(a,b);c.lineTo(d,e);c.stroke();}
 function dot(a,b,fill){c.beginPath();c.arc(a,b,.075,0,Math.PI*2);if(fill)c.fill();else c.stroke();}
 // Broken outer ring, with two short teeth bracketing the gap.
 var gap=f[0]?0:-Math.PI/2;c.beginPath();c.arc(0,-.08,.49,gap+.32,gap+Math.PI*2-.32);c.stroke();
 [gap+.32,gap-.32].forEach(function(a){line(Math.cos(a)*.43,-.08+Math.sin(a)*.43,Math.cos(a)*.58,-.08+Math.sin(a)*.58);});
 // Shared diamond: interior stroke orientation must be described separately.
 c.beginPath();c.moveTo(0,-.34);c.lineTo(.23,-.08);c.lineTo(0,.18);c.lineTo(-.23,-.08);c.closePath();c.stroke();
 if(f[3])line(0,-.24,0,.08);else line(-.13,-.08,.13,-.08);
 // Forked diagonal stem, paired satellites, and a hooked tail.
 var side=f[1]?1:-1;line(side*.15,-.23,side*.56,-.61);line(side*.4,-.46,side*.36,-.65);line(side*.4,-.46,side*.64,-.44);
 var dots=f[2]?1:-1;dot(dots*.67,.03,true);dot(dots*.67,.27,false);
 line(0,.41,0,.7);line(0,.7,f[4]?.3:-.3,.7);line(f[4]?.3:-.3,.7,f[4]?.3:-.3,.56);
 line(f[4]?.13:-.13,.63,f[4]?.13:-.13,.77);c.restore();
};
})();
