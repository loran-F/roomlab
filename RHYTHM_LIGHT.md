# 默数开灯（lightsearch）— 手动计时与分支收集

2026-09-09 本地改版，待总控组合验收与发布。未修改 APP_VER、HTML、Loading 或 room-progression，也未自行提交。本文描述当前规则，旧起拍/灯绳/总闸直达规则已替换。

## A：隐藏计时挑战

双方准备后仍停在 idle。单个挑战开关第一次按下才从零开始隐藏计时，第二次按下停止，显示真实用时 xx.xx 秒及早了/晚了/成功。每次后续挑战仍需主动开始；经过目标窗口不会自动结算、反馈、起拍或重启。

所有难度统一：真实用时满10秒、未满11秒（10000 ≤ elapsed < 11000毫秒）成功。不足10秒为早了，达到11秒为晚了。判定使用原始值；结果显示向下截断到百分秒，因此9.999秒显示9.99，10.999秒显示10.99，不会因四舍五入产生矛盾。成功使B全景亮10秒，失败熄灯。进行中清除上次成绩，A不随B灯灭改变文案或外观。

## B：道具收集后离开

11×15墙体分支地图，入口为蓝色「入」，出口为绿色箭头。独立收集电池，room-2幽宅收集符纸；tier1/2/3/4分别需3/4/5/5份。道具在不同分支，近身（曼哈顿距离≤1）明确点击收集，集齐不会自动胜利，还需到出口点击离开。未集齐可查看出口，但不能通关。黑暗中也能凭记忆移动、拾取。

亮时260ms/格，暗时340ms/格。方向变化和松开再按均不重置移动冷却，租约650ms、失焦释放。整关限时按 tier 为180/210/240/240秒，从双方准备完成开始。B的原HUD显示准确剩余秒数，A只显示静态时限规则；无怪物或强制等待。弱光半径1.7格，地图与方向键/交互按钮在同一视口；物品计数持续可见。

12个预验证布局（3/4/5道具各4张）加水平/垂直镜像；开局直接选模板，不实时反复筛图。基础最短完整收集+出口路线≥90格，进阶≥110格。最短路采用BFS(x,y,mask)，自动计入邻接拾取机会和邻接出口，未把走到物件中心当作必需距离。当前64难度/变体组合最短与存储距离一致；即使不计交互时间、第一步立即移动，也显著大于10秒。

## 接口与生命周期

- `RhythmLight.create(now,round,tier,roomId)`；其余model `input/step/snapshot` 保留。`buildMap(tier,seed)`、`shortestCollection(map,start,items,exit)`供可达性验证。
- 独立ls metadata、握手与快照协议升为2。旧版本明确拒绝，提示刷新双方；不与旧计时状态混连。
- 独立复用本模块原data listener，每秒发送绑定局id的lsPing，8秒失联停止按键/计时更新/移动。真实关闭任一标签页均验证约8秒停止。迟包不能复活已停止局。
- 密室仍是 `RoomGameAdapters.lightsearch.host/guest(ctx)`，ctx协议1，复用PEER.conn并透传dg数据链；不安装第二个data listener，不新增Loading接口。密室连接生命周期由现有流程处理。
- 成功只由主机调用一次ctx.finish；退出ctx.abort；clearTimers移除本模块interval、键盘/失焦/连接监听，不关闭密室连接。
- A快照没有lit/地图/坐标/道具；计时中也无anchor/elapsed。B没有challenge/result/successWindow/挑战计时反馈；仅B拿到可见地图、收集信息和整关remainingMs倒计时。A有静态timeLimit，没有deadline/remainingMs。

## 录制工具改动边界

record.js仅三处区域：countdown的lightsearch分支固定「—」；readProg的lightsearch分支改B收集进度；lsBFS与driveLightSearch改双击计时、从B已揭示快照记图、实际方向输入/收集/出口。删旧倒数字幕与总闸逻辑，B寻路不扩张未知格；保留vault及其他录制功能/渲染修复。

## 验证与证据

见 `../release-staging/lightsearch-challenge/`：
- model.cjs / model-results.json：64模板变体精确邻接最短路，原始容差、无自动提示、A/B私密、道具/出口门槛、重复拾取、方向切换限速/租约。
- live.cjs / live-results.json：真实双页WebRTC，B从首次亮灯快照规划，再实际按键走115格、收集3份后主动离开；5次实际约10秒挑战，A计时中文字不变化。这是已揭示信息自动操作，不是真人盲玩。
- close.cjs / close-results.json：真实关闭A或B页面，另一端约8秒停止。
- protocol.cjs：旧v1 metadata不占用房间、随后v2可加入，旧v1 welcome被拒绝并提示刷新，跨玩法码/主动离开正常。
- record.cjs：实际自动录制通关，真实A/B合成无渲染错误，顶栏固定「—」。QA以本地缓存的同版html2canvas路由注入，未改产品CDN。
- dungeon.cjs / dungeon-results.json：实际密室符纸收集、出口回图、单data监听、下节点旧session拒绝、退出不扣血（以对应结果文件为最终完成证据）。

游戏截图：A-result.png、B-lit.png、B-dark-{320,390,720}.png、record.png。旧release-staging/lightsearch/测试针对旧规则，不作为本版通过证据。发布仍由总控核对线上基线、版本和共享组合结果。


## 成功区间修正（2026-09-09）

A快照移除旧tolerance，改successWindow={min:10,maxExclusive:11}；result保留原始elapsed秒，新增displayElapsed截断字符串。独立ls协议仍2，ctx仍1。record该玩法以10.4秒为自动停止目标，成绩读取displayElapsed；验收台由原负责人同步。之前±容差边界用例和9.9秒成功脚本属于旧规则，不应作为当前判定证据。新区间验证见 ../release-staging/lightsearch-window/。

整关限时复用权威step循环和单deadline，不新增计时器；输入先校验截止，截止时出口也判失败；结束锁定一次并冻结remainingAtEnd。独立重开生成新deadline，准备前不走时；密室通过ctx.finish(win)回图。新区间测试model.cjs覆盖24判定边界及4档截止/出口竞态；live.cjs是真实约10.7秒成功亮灯、提前失败熄灯及B倒计时；timeout-fixture.cjs仅QA路由将时限缩为3秒验证实际双端超时/重试和密室单次扣血，产品时长未缩短。
