# 按密室配置生成随机路线

本地开发完成后，由总对话统一决定发布批次与版本。本模块不自行上传。

## 配置怎样影响地图

沿用 ROOM_CATALOG 的 minutes / difficulty，不更改现有密室名字与图片。

| 预计时长 | 普通路线层数（不含首领） |
|---|---|
| 6 分钟及以内 | 4 |
| 7–9 分钟 | 每局随机 4 或 5 |
| 10 分钟及以上 | 每局随机 5 或 6 |

简单密室在上述挑战层外另加一个必经安全屋；中等密室放置一个可选安全屋，经过它的路线少玩一关；困难密室只有 45% 的地图放可选补给，优先形成连续挑战。时长是顺利通关的预估，并非总倒计时保证；玩家交流、练习、失败和重试会延长实际时长。各玩法自身的计时仍使用原引擎。

简单密室最多两条分支；中等/困难可出现三分支。难度通过现有 coopDifficulty / coopTime 接口生效：简单起始限时系数 1.08、中等 1、困难 0.92，并随深入再缩短至该值的 93%。关卡 tier 由密室难度与层数决定，取其与既有连续同玩法 tier 的较大值；保留原有重复惩罚与主题加成。尚未使用这些公共接口的旧玩法仍保留其自身数值，补给和路线长度对所有玩法有效。

## 三种结构

- 分叉汇合：两三条分支在中途经过必经节点，再次展开。
- 双线并行：两条独立路线从入口分开，最后汇合到首领。
- 中段交汇：前后提供三路选择，中段汇合，允许在汇合点换支。

每层在固定的左/中/右安全范围内小幅偏移。相邻层使用单调连接，保证每个节点有入路和出路，所有节点可从入口到达并能继续到首领；连线不交叉。宽度不超过三节点，沿用卷轴纵向滚动与至少 52px 的节点点击区域。

地图总节点数量与一局经过的节点数量不同：每层选一条路，进入后锁定同层其他分支，保留已有推进规则。未配置密室策略时保留旧 EV_POOL_NET 加权抽取；配置策略后按下述主玩法规则生成，复习层仍通过加权抽取减少相邻重复。

## 17 间密室的主玩法策略（v2）

`DungeonRoutes.generate(room,pool,seed,layout,families,options)` 新增可选第六参，直接接收 `RoomProgression.getRoutePolicy(room)` 的 `{primary,pool,firstVisit,boss,title,roomId}`。五参调用保持兼容。每次房主新建时动态读取策略，因此 room-progression 可在本模块之后加载。

- 首挑战层所有分支均为主玩法，并标记 `roomTutorial:true`；每局保留基础首关，固定 tier 1、timeScale 1，不受困难密室及连续同玩法惩罚影响。
- 最后挑战层所有分支均为主玩法，标记 `roomAdvanced:true`，tier 至少为 2。
- 中段主玩法与复习/奖励层交替；主玩法至少占每条路径事件节点的一半。可选安全屋不得绕过唯一复习层。
- pool 由匹配层提供，仅含本室主玩法、已解锁且主题相符的辅助玩法、基础奖励 beat。生成器校验 PLAYGROUNDS 注册及可执行入口；新六种 lockbox / silhouette / evidence / mirrors / pwslide / lightsearch 必须同时存在 host/guest adapter，不能只加进 EV_POOL 就视为可运行。缺主玩法入口直接拒绝生成，不替换成别的玩法。
- 非工业终点为主玩法 event，标记 `roomFinale:true` 和 `roomAdvanced:true`；工业策略保留 boss，标记 roomFinale。DUNGEON.boss 始终指向终点 ID，供拓扑接口使用。
- 节点显示“入门 / 进阶 / 终章”，路线摘要区分终章与首领。主玩法标题由匹配层包装的 dgPG / dgNodeLabel 提供。
- 最终结算、完成记录及解锁持久化由 room-progression 负责；地图不重复调用胜利或写存档。`firstVisit` 随策略同步，用于其他模块判断首次体验。

详细入口契约见 ROOM_GAME_ADAPTERS.md。六种新节点使用 assets/map-icons 下同名 SVG，沿用现有 64×64 viewBox、深紫描边、奶油黄/紫/青配色；现有按 mode 拼路径的绘制入口无需修改。

## 生成、同步与重试

- 只有房主新建一局时生成随机种子和完整图。
- 版本 2 的 route 快照包含种子、布局、层数、补给配置、ending、完整节点（类型、层数、位置、前后连线、玩法、三类阶段标记）和 progression（roomId / primary / pool / firstVisit / boss / title）。接收端兼容版本 1。
- B 直接接收 A 的图，不使用本地随机结果拼节点。旧版无 route 的快照仍走旧逻辑。
- 返回地图、失败、重试与成功推进均保留拓扑和种子；新开一局才重新生成，并将画面定位到角色所在的入口。
- 视口高度不同会改变显示坐标的归一化 y 值，但层级、横向位置与前后连接保持一致，适配各设备的纵向卷轴。

## 文件与加载

新增 dungeon-routes.js、dungeon-routes.css、本文档；共享 HTML 由集成任务维护。需在 expansion / coop / fullscreen-map 后加载；所有玩法适配器与最后的 room-progression 必须在 render() 和建房之前加载完成。

包装 newDungeon、dgSnapshot、applyDungeon、coopDifficulty、dgDrawMap、renderDungeonMenu、renderDungeonMapShell。构造器先调用旧包装链完成其他模块的会话清理，再替换为新图；原玩法和主题准备入口不变。选择页显示预计关数/补给，地图顶部显示预计分钟、难度、结构与路线层数。未修改 APP_VER，待总对话发布时统一递增。

## 验证记录

- release-staging/dungeon-routes-test.cjs：三档难度 × 三种结构 × 1000 种子，共 9000 图；无死路、无交叉、边双向一致、所有完整路径关数有效、新手必经安全屋、固定种子可复现。获得 8789 种位置/连线组合，相邻事件同玩法率约 0.40%。
- release-staging/dungeon-routes-browser.cjs：真实 PeerJS / WebRTC A/B 同步完整图，三种结构与三类密室，320×568 / 390×844 / 720×1280 无横向溢出、节点位于纸面内且点击尺寸合格；实际点节点与取消准备；失败保留地图，成功解锁下一层；B 从空状态恢复房主快照；新一局重新随机。无页面脚本异常。
- 浏览器结算边界使用直接调用失败/成功入口的测试场景，不作为小游戏真人通关记录。未进行真人节奏、实体手机或跨地域网络体验测试。
- 预览截图：release-staging/routes-qa/fork.png、parallel.png、crossroads.png。
- v2 新增 release-staging/dungeon-routes-policy-test.cjs：17 主玩法 × 3 难度 × 3 布局 × 100 种子 = 15,300 图、103,360 条完整路径；首尾必经主玩法、主玩法占比至少 50%、复习不被安全屋绕过、合法池、终点类型及缺失/不完整 adapter 拒绝均通过。
- v2 新增 release-staging/dungeon-routes-progression-browser.cjs：真实注册的 17 间密室全部 ready，A/B 地图与阶段标记一致；教学 tier/timeScale 为 1，进阶至少 tier 2；三结构 × 三视口无溢出；实际点节点/取消准备、失败图保留、普通成功不解锁、空 B 恢复快照、非工业终章与工业 Boss 最终入口结算、双方解锁及刷新持久化均通过。终态使用入口测试场景，不能替代各玩法负责人真人通关与 adapter 输入验证。
- v2 截图目录：release-staging/routes-progression-qa/。
- release-staging/dungeon-routes-icons-browser.cjs：六个新玩法实际节点图片加载成功，可经浏览器 drawImage 栅格化（与录制修复的图标处理兼容）；64px / 30px 图标及实际卷轴截图已检查。没有修改 record.js。
