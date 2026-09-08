# 四个合作解谜原型

新增 lockbox 机关盒、silhouette 影子拼图、evidence 证物还原、mirrors 镜面引光。保留独立玩法入口，另通过 RoomGameAdapters 接入密室。是否抽取与解锁由 room-progression 统一管理，模块不自行修改 EV_POOL_NET。

- 机关盒：B按住锁销，A推进滑块；A转齿轮，B看背面校准窗确认卡扣；双方按住把手1秒开盒。按住事件带心跳，650ms无更新释放。
- 影子拼图：A控制灯光造成的投影倾斜，B旋转3个物件并对照私有目标；完成3组投影。目标灯光/旋转配置不发送A。
- 证物还原：3个固定编写的案件。A现场物证，B人物/工具/时间记录；双方各选人物、工具与时间，结论一致且符合证据才过关。错误或意见不一致可继续修改，不扣血。
- 镜面引光：3层光路，4/6/6面镜片，A/B轮流归属；按网格追踪直线光线，斜镜按真实方向反射，越界或循环停止。光线到右侧接收器后才能进入下一层。

所有玩法不限时，双方阅读后准备，双端权威同步、自由重试、双方确认重开、断线停止；ppInput按局id/角色/序号/关卡revision过滤，旧消息不重复执行。代码位于puzzle-pack.js/.css，HTML在render前加载。

验证：qa_puzzle_pack.cjs实际A/B完成4种玩法全部关卡、双端重开、3视口及断线；qa_puzzle_rules.cjs验证300张光路可解、权限、按住失效、私有目标/证据与错误结论重试。截图在release-staging/puzzle-*.png。

这是第一版可玩原型：影子用简化几何投影，证物为3个固定案件；暂未包含音频或自由3D视角；密室解锁系统由 room-progression 管理。


## 密室适配（本地待总对话统一发布）

实现 `RoomGameAdapters[lockbox/silhouette/evidence/mirrors].host(ctx)/guest(ctx)`，遵守 ROOM_GAME_ADAPTERS.md。只复用现有 PEER.peer/conn，绝不进入独立 lobby。进入时清旧玩法，B 不额外安装 data listener；通过原 dgHostOnData/dgGuestOnData 链处理 ppInput/ppState/ppPulse。密室包带 roomSession，状态增加 frame，拒绝其他进入次数、旧帧和旧游戏 ID。双方7秒无心跳停用，hold仍有650ms租期。

主机成功展示700ms结果后，仅调用捕获的 ctx.finish(true) 一次；回调检查原状态与 ctx.isActive。B 不结算，只等地图 dgEnd。密室无“再来一局”按钮。返回调用 ctx.abort，断线清理状态/监听并停用按钮。独立模式仍使用双方重开，独立 guest 的 data listener 现在也在清理时解绑。

主题仅在指定房间与对应玩法同时匹配时生效：

- room-5 机关盒：封印盒封条、印记、铜环与背面分工。
- room-14 影子拼图：帽子、衣裙、衣架的实际多边形投影，保留灯光倾斜与旋转规则。
- room-19 镜面引光：剑座与封印接收器，保留真实反射光路。
- room-22 证物还原：宫廷玉玺、诏书、珠钗三案；物证、人物口供、工具、时辰全部独立配置，答案判定跟随宫廷案件。不会污染独立入口原案件。

教学节点：机关盒2次推动、合力0.8秒；其余各1组。进阶tier2：机关盒4次推动、1.5秒合力，其余2组；tier3/4最多3组，机关盒最多5次推动、1.75秒合力。镜面进阶由6面镜片起，不再从4面开始。三组与上述上限是本版复杂度上限，不承诺无限增难。

验收：`release-staging/qa_room_puzzle_adapters.cjs` 五种原生玩法的真实地图连接、退出重进、实际按钮教学/进阶通关、双端回图、旧包拒绝、结算次数、原Peer/conn身份和data监听数不变、断线停用以及320/390/720截图。机关盒与密码推条额外验证通关动画内退出后旧结算不影响新进入。第二个进阶节点使用同地图代表性节点fixture；完整随机路线由目录任务验收。结果及截图：`release-staging/room-puzzle-adapters-qa/`。独立 `qa_puzzle_pack.cjs` 四玩法全流程和 `qa_puzzle_rules.cjs` 均再次通过。
