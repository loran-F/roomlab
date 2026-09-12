(function(g){'use strict';
const ROWS=[
 ['room-1','catch','接住小花盆','接住窗边落下的花盆，守护两个人的小家。',['beam','pwslide'],false],
 ['room-13','pwslide','出口密码锁','A 水平拖动奇数条，B 水平拖动偶数条，共同还原同一个四位密码。',['code','lockbox'],false],
 ['room-14','silhouette','衣帽间剪影','借灯光与服饰的影子，还原镜前的目标轮廓。',['mirrors','pwslide'],false],
 ['room-15','beam','鱼箱入库','两人托稳搬运梁，把鱼箱安全送进收货口。',['catch','pressure'],false],
 ['room-18','vault','旧照片里的秘密','记住一闪而过的旧档案，拼出他漫长的过去。',['evidence','code'],false],
 ['room-16','maze','山径迷踪','一人探路，一人看地图，打开岔路机关找到出口。',['evidence','lightsearch'],false],
 ['room-12','caller','夜班身份核验','查验公司来电的身份与任务，找出混进来的冒牌员工。',['vault','pwslide'],true],
 ['room-5','lockbox','神秘封印盒','听同伴描述盒子背面的变化，拆开留下的封印。',['code','shadow'],false],
 ['room-19','mirrors','引光解封','转动镜片，把光引向剑上的封印。',['silhouette','code'],false],
 ['room-2','lightsearch','暗房寻电','一人掌握亮灯时机，一人趁亮搜索房间。',['maze','shadow'],false],
 ['room-4','shadow','双胞胎的影子','录下另一个自己的行动，让影子替同伴打开门。',['silhouette','lockbox'],false],
 ['room-17','lookback','停走生存赛','观察者随时转身，两个人互报信号、停走过关。',['beat','maze'],false],
 ['room-8','pressure','收容舱稳压','盯住压力与安全区，让收容舱保持稳定。',['wires','dial'],true],
 ['room-3','wires','最后一道机关','逐步核对线索，剪断危险线路，失误时合作救场。',['pressure','code'],true],
 ['room-20','code','符咒辨认','描述符咒细节，找出能解除封印的暗号。',['lockbox','mirrors'],false],
 ['room-21','dial','深夜电台','两人调整频率与增益，从杂音里接回清晰信号。',['caller','beat'],false],
 ['room-22','evidence','宫廷疑案','对照物证与口供，查清人物、工具和时间。',['vault','code'],false]
];
const ROOM_ORDER=['room-1','room-13','room-15','room-14','room-18','room-16','room-20','room-19','room-21','room-17','room-4','room-22','room-3','room-12','room-5','room-2','room-8'];
const plans=ROWS.map(r=>({roomId:r[0],primary:r[1],title:r[2],brief:r[3],supports:r[4],boss:r[5],order:ROOM_ORDER.indexOf(r[0])+1})).sort((a,b)=>a.order-b.order);
g.RoomDirectory=Object.freeze({plans,getPlan:id=>plans.find(p=>p.roomId===(typeof id==='string'?id:id?.id))||null});})(window);
