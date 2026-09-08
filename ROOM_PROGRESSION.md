# 密室主玩法与解锁集成（本地待总验收）

本批把最新17室分配接入实际游戏。本文不代表已发布；APP_VER、资源发布缓存及正式提交由总对话统一处理。

## 当前分配

| 顺序 | 密室ID | 密室 | 主玩法ID | 关内主题 |
|---|---|---|---|---|
| 1 | room-1 | 这个老登很宠我 | catch | 接住小花盆 |
| 2 | room-13 | 谁家密室不包出啊 | pwslide | 出口密码锁 |
| 3 | room-14 | 你好骚 | silhouette | 衣帽间剪影 |
| 4 | room-15 | 强哥，收手吧 | beam | 鱼箱入库 |
| 5 | room-18 | 男朋友保质期有点长 | vault | 旧照片里的秘密 |
| 6 | room-16 | 爬吗？ | maze | 山径迷踪 |
| 7 | room-12 | 这公司活人感真低 | caller | 夜班身份核验 |
| 8 | room-5 | 这个老登缠上我了 | lockbox | 神秘封印盒 |
| 9 | room-19 | 拔剑吧男朋友 | mirrors | 引光解封 |
| 10 | room-2 | 这女鬼非要跟我面基 | lightsearch | 暗房寻电 |
| 11 | room-4 | 双胞胎邀我一起玩 | shadow | 双胞胎的影子 |
| 12 | room-17 | 玩命过家家 | lookback | 停走生存赛 |
| 13 | room-8 | 想养，看着不咬人 | pressure | 收容舱稳压 |
| 14 | room-3 | 这把输了真寄了 | wires | 最后一道机关 |
| 15 | room-20 | 蛇系女友 | code | 符咒辨认 |
| 16 | room-21 | 好男人就是我 | dial | 深夜电台 |
| 17 | room-22 | 贱人就是矫情 | evidence | 宫廷疑案 |

17个主玩法不重复。信号节拍beat是基础复习/奖励玩法；Boss另外保留，仅room-3、room-8、room-12使用机械Boss终章。其余密室以自己的主玩法作为终章。

## 玩家进度与抽取

- 所有密室都可选；在本室可试学尚未解锁的主玩法。独立试玩入口仍开放。
- 每局首挑战层为基础教学，tier固定1；后段必经主玩法进阶，tier至少2，其余沿用层深和重复玩法难度。
- 中段使用本室主玩法、主题相关且已通关解锁的辅助玩法、基础beat。未解锁辅助不会被抽到。具体主题相关列表见room-progression.js的ROWS，不是全玩法混抽。
- 普通节点、失败和退出都不解锁。完整通关终章后，A/B分别在自己设备保存本室主玩法解锁。再次通关不重复新增。
- 存储键roomlab-room-progress-v1，记录稳定roomId；切换封面或名字不会重置。进度按浏览器和网站来源保存，没有账号云同步。关闭存储时可在当前页面继续使用并显示保存限制。
- 路线由A按A的解锁进度生成，B接收同一图和阶段标记；不按B的本地记录重新抽图。

## 本任务文件归属

1. roomlab.html：ROOM_CATALOG按17室顺序重排且保留旧ID；新增room-20/21/22；六间旧占位的主题/推荐/标签替换为匹配内容；追加room-puzzle-themes与room-progression样式/脚本；两个catch局部msg接catchMobileText（host在_lastMsg赋值前）；通关/失败通用文字去除不适合其他题材的固定特工描述。未改APP_VER或既有发布缓存后缀。
2. room-progression.js：匹配表、路线policy、持久化解锁、六原生玩法入口适配、当前会话校验、终章结算与菜单/地图提示。
3. room-progression.css：解锁提示、菜单简短说明和终章标记样式。
4. ROOM_GAME_ADAPTERS.md：适配器协议与地图协作契约。
5. ROOM_PROGRESSION.md：本文。
6. assets/rooms/17_蛇系女友_390x486.png
7. assets/rooms/19_好男人就是我_390x486.png
8. assets/rooms/13_贱人就是矫情_390x486.png

三张图片来自图标/电视剧_Q萌版_V2，仅复制，不改变源图。没有删除现有图片或更换其他密室ID。

## 共享依赖

- dungeon-routes.js/.css及六张新地图SVG由地图任务维护，生成/同步roomTutorial、roomAdvanced、roomFinale及progression。
- puzzle-pack、password-strip、rhythm-light原负责人提供RoomGameAdapters的host/guest，复用原PEER连接。
- room-puzzle-themes由解谜任务维护，负责符咒/收容舱；其他场景主题由各原玩法任务维护。
- catch-mobile提供catchMobileText；HTML只在两个catch局部反馈函数调用，不影响其他玩法。
- 加载顺序为既有所有玩法/地图模块 → room-puzzle-themes → room-progression → render。若新增原生主玩法未提供适配器，创建按钮会禁用而不是悄悄进入其他游戏。
- 模块收到ctx.finish/abort/isActive；旧会话和重复终态拒绝。dgEnd/dgAbort/回地图会令上下文失效。完整协议见ROOM_GAME_ADAPTERS.md。

## 本任务验证

证据在仓库外release-staging/room-progression-qa，测试脚本不属于发布资源：

- qa.cjs / result.json：真实双页PeerJS，17室/17唯一主玩法；1530张policy地图合法且没有未解锁辅助；360/390/430宽布局；六种原生玩法都从地图进入，A/B会话ID一致且沿用原房间；tutorial tier1；退出不扣血、旧会话/重复结算拒绝；普通节点不解锁，终章后双方解锁并刷新保留；0页面异常。
- qa-narrow.cjs / narrow-assets-failure.json：320宽17间选择页无横向溢出；全部17张封面成功解码；17主玩法SVG请求200；失败扣一次机会但不解锁，重复失败不再扣。
- 选择页始终仅一个封面img；左右切换替换src，无背后叠多张封面。
- 截图含三新封面、六adapter的A/B准备页、双方解锁页及320宽界面。
- 终态测试使用ctx.finish注入，用于检验地图与解锁网关；不把它算作真实按键通关。各玩法规则/操作通关/题材视觉由原负责人另行验收，总对话统一组合验证。

## 边界

预计分钟数和难度标签为内容规划，不是用户平均实测。没有新增账号云同步。此批不重新制作所有密室封面，也不改变独立试玩的开放方式。文件处于本地待总对话正式验收和发布状态。
