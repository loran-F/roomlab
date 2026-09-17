/* Functional layouts of the same historical picture, not three approved riddles. */
(function(g){'use strict';
const common={id:'narrow-stapler',image:'experiments/picture-strip/art/narrow-round-01/stapler-line.png',fixedAnswer:true,answerLength:3,durationMs:90000,moveLimit:108,fixture:true,contentVersion:'three-tier-1'};
const layouts={
1:{label:'入门',windowWidth:192,offsets:[-24,18,-18,24],brief:'每人两条，窗口较宽。先看清上下轮廓怎样接在一起。'},
2:{label:'普通',windowWidth:144,offsets:[-54,30,54,-36,-24,72],brief:'每人三条，通过相邻切片的线条关系一起判断物品。'},
3:{label:'困难',windowWidth:144,offsets:[-48,36,60,-54,-36,48,-24,66],brief:'每人四条，轮廓分散在更多切片。比较多处关系，再一起判断。'}
};
function get(difficulty){if(!Number.isInteger(difficulty)||!layouts[difficulty])throw Error('不支持的密码猜图难度');return {...common,...layouts[difficulty],difficulty,layoutId:'stapler-layout-'+difficulty,offsets:layouts[difficulty].offsets.slice()};}
g.PictureGuessDeck=Object.freeze({get});if(typeof module!=='undefined')module.exports=g.PictureGuessDeck;
})(typeof window==='undefined'?globalThis:window);
