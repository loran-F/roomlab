# 密室玩法集成契约 v1（本地开发）

归属：room-progression.js/.css、ROOM_CATALOG 及本文件由匹配任务维护；各玩法模块由原负责人修改。无发布授权传递。

## 注册与入口

每个新增独立玩法注册 `window.RoomGameAdapters = window.RoomGameAdapters || {}`，并写入 `RoomGameAdapters[mode] = {host(ctx), guest(ctx)}`。本批 mode 为 lockbox / silhouette / evidence / mirrors / pwslide / lightsearch。

room-progression 最后加载，负责拦截这些模式的密室节点进入：设置 `_dungeon=true`、`_dgNode=node.id`、`S.mod=mode`，锁定同层其他分支，广播地图和 `{t:'enter',node,mode}`，再调用 host。B 的既有 enter 分发落到 renderManual，由集成包装调用 guest。独立试玩入口不变。原生规则/双方准备由 adapter 保留，集成不再给这六种模式叠加旧 coop 的通用长按练习。

ctx 是当前进入次数的只读上下文：

```js
{ protocol:1, sessionId, roomId, nodeId, mode, role:'A'|'B',
  tutorial:boolean, finale:boolean, tier:number, theme:{title,brief,...},
  finish(win), abort(), isActive() }
```

host/guest 必须复用已有 `PEER.conn/PEER.peer`，不得调用独立 lobby、closePeer 或另建 peer。进入时可 clearTimers 清理旧玩法，但不能清掉地图对象。ctx.finish 只供主机终态调用一次；B 等待主机 dgEnd，不能自己扣地图生命或返回。ctx.abort 调用既有 dungeonAbort。finish/abort 会拒绝已失效的 sessionId。模块原有延迟结算应在调度前捕获 ctx，不要在回调执行时读取“当前新局”的上下文。

## 消息与清理

使用自身消息前缀并包装 dgHostOnData/dgGuestOnData 链，非自身消息必须透传。密室连接已安装 data listener，不得重复安装。游戏局 ID / revision / seq 仍由模块自身校验；传输中不要下发角色私有答案。B 先 enter 后接受状态；主机应重复广播或提供请求重发，避免首包先于界面。

每个 adapter 的 clearTimers 清理链要取消 timers、DOM/键盘/指针/连接监听及旧状态，但保留 PEER 连接与地图。离开/取消/断线后，旧输入和延迟 finish 均无效。模块不得既调用 ctx.finish 又调用 dungeonEnd，也不得使用独立试玩的“双方再来一局”代替地图终态。

## 地图负责人对接

RoomProgression.getPlan(roomOrId) 返回 `{roomId, primary, title, brief, supports, boss, order}`；RoomProgression.getRoutePolicy(roomOrId) 返回 `{primary, pool, firstVisit, boss, title}`。pool 包含本室试学 primary、已通关解锁且主题相关的辅助玩法，以及基础奖励玩法 beat；不能抽取其他未解锁玩法。

地图初次生成时首个挑战层所有可选节点都为 primary，标 `roomTutorial:true`；最后挑战层为 primary 进阶节点，标 `roomAdvanced:true`。中段主打/复习交替，避免一局只有同一个游戏。非工业主题末节点改 `type:'event',mode:primary,roomFinale:true`；boss 仍指向该终点 ID，工业主题可保留 Boss，终点也标 roomFinale。每条有效路径必须经过主打教学与进阶。重试保留节点与标记，不因失败重新生成。

上述标记及 `DUNGEON.progression` 必须进入 route 快照。难度：roomTutorial 节点固定 tier1/timeScale1；roomAdvanced 至少 tier2，其余沿用现有层深/连续同玩法规则。第一次见到主打不能直接以困难密室tier开局。最终成功由 room-progression 统一转换成整室胜利，记录解锁；普通节点成功不解锁，失败/退出不解锁。

## 验收

各模式测试复用房间进入、真实双方完成、一次结算、退出无扣血、断线停局、旧包/旧回调拒绝。最终集成测试还会检查17间唯一主玩法、仅抽已解锁辅助、首尾必经、刷新持久化、B跟随主机图与通关记录、三个手机视口。
