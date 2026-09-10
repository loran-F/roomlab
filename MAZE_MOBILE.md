# 通风潜行：冷色双端界面与单局地图

状态：本地完成，待总控组合验收；未提交、推送或更新版本。

## 本次行为

- 按已确认 maze-cool-round-01 稿实现冷灰蓝/青绿。A 周围五格居中放大；B 同局全图，不提供 A 实时定位或现场符号。没有图号或切换页签。
- 提示为独立横条；底部方向键与机关三选项原位切换。旧移动提示在机关态隐藏，错误仍显示。按钮最小触控 44px；蓝/橙/绿阀名称与符号映射保持原规则。
- 房主生成一份 15×11 随机树形地图，安全路线、起终点和陷阱一并同步。生成有界（最多8次，始终保留可用结果），同设备连续完全重复时镜像避重；不使用美术稿 sample-map.json。
- 独立入口 A 建房/B 加入，双方明确准备后开始120秒。密室沿用原准备与120秒基础时间及连续难度缩放。
- 原同图缺陷已实证：A 留在原地图0而B切到随机地图。新局先应用房主场景再开局；过期/重复 enter 在任何进入副作用前被拒绝。

## 文件与共享接口

本人文件：maze-mobile.js、maze-mobile.css、MAZE_MOBILE.md。
共享 roomlab.html 仅由集成人员修改：host prepare并附mazeScenario；guest在enter副作用前mazeAcceptEnter；应用mazeApplyScenario；旧报图号提示改同图提示。

公开接口：mazePrepareHost()、mazeApplyScenario(s)、mazeAcceptEnter(d,conn)、MazeMobile.generate/validate/scenario。场景包含 schema=1、mapId、sessionId、generation、loadingAttempt、initialTime、map。B 公共地图无机关私密符号或 A 坐标。密室入口用已完成的 RoomLoading attemptId + 连接内 session 去重，未更改 Loading 协议。独立 mzOffer/mzReady/mzGo/mzClock/mzDone 消息受局号/连接隔离。

## 验证

../release-staging/maze-sync/：
- before-console.json / before-dungeon.json：真实旧版地图不一致证据。
- live.cjs / live-results.json：真实AB390/320窄屏，正确阀门/错误扣4秒、两次重入同图、无横溢出，按钮触控下限。
- standalone.cjs / standalone-results.json：200张地图合法且各不重复、安全路无陷阱；真实独立AB地图相同、单方ready不开局、B真实119秒。超时部分将QA页面S.time改1以验证失败，未修改产品默认120秒。
- outcomes.cjs / outcomes.json：实际方向移动打开三阀走到出口回图；下一局QA时间置1，超时回图仅扣1HP。
- stale.cjs：真实同连接旧局包、当前重复包、返回后的旧包不换图/不重开。
- 普通通风 standalone-A.png / standalone-valve.png / standalone-B.png；山径 mountain-A-0.png / mountain-valve-0.png / mountain-B-0.png。
- 美术验收：../art-review/maze-cool-round-01/LIVE_REVIEW.md，通过已确认稿的实际样本视觉复核。

限制：自动测试使用真实输入入口和已知地图检查功能，不等于真人盲玩难度评测；未做跨公网移动网络压力测试。共享HTML与其他批次仍需总控组合验收。
