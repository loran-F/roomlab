# 密码推条（pwslide）

本地原型，未提交、未上传。保留独立大厅入口，新增 RoomGameAdapters 密室接入；抽取/解锁由目录模块控制，不修改 APP_VER。

## 玩法与分工

- A 只看见 B 的密码条，操作 A 自己的条带背面；B 相反。上方观察、下方操作，页面不会出现操作者自己的数字或目标位置。
- 首轮各一条水平带，共四位数字。双方准备后开始，不限时。观察者看纸条与固定窗口的边缘，口头指挥同伴向左或向右移动。
- 第二轮把密码分成横条前两位、竖条后两位；竖条自上而下读。轮间双方再次准备，避免自动跳到更复杂的操作。
- 每条带九个卡点。起点在两端随机选择，正确卡点独立随机为第 3–7 档，不是默认中心。背面仅显示当前位置及机械限位，不显示目标、高亮对齐或建议方向。
- 选择条带后，点击方向按钮、相应方向键或滑动背面控制区一次移动一格；指针位移不足 24px 不移动，取消/失焦取消本次滑动。到限位后方向按钮禁用。
- 观察窗实际裁切移动中的纸条。采用非线性视觉位移：离开目标第一格偏移 24 个 SVG 坐标，之后横向每格增 7、竖向增 4，避免差一格时四位数字仍完整；最远偏移仍保留部分可观察内容。未对齐时至少一个数字被窗口裁切，不能确认。对齐反馈只显示在观察者一端。
- 由观察者确认同伴密码，确认后同伴的条带锁定。两人的条带都被确认才过轮/成功；没有输入密码、自动归位或一键自动成功。
- 完成后双方点击重新开始，生成新的对局 ID 和随机密码，再回到准备页。

## 文件与接入

产品文件：`password-strip.js`、`password-strip.css`、本文档。

共享 `roomlab.html` 仅在最终 `render()` 之前增加引用。本轮协调后的末尾顺序是：

1. 原有 `puzzle-pack.css/js`
2. 原有 `dungeon-routes.css/js`
3. 新增 `password-strip.css/js`
4. 任务（6）的 `rhythm-light.css/js`
5. 原有最终 `render()`

未修改其他引用、缓存后缀和版本号。`rhythm-light` 文件由任务（6）负责，本任务只按总对话指令接入。

`password-strip.js` 向 `PLAYGROUNDS` 注册独立入口，包装 `render`（仅处理 `S.mod === 'pwslide'`）与 `clearTimers`（清理本模块定时器、输入事件和视图）。没有包装 `dgHostOnData` / `dgGuestOnData`，不改变 puzzle-pack 规则或消息。复用 `loadPeerLib`、`newPeerId`、`peerOpts`、`PEER`、`closePeer`、`clearNetZones`。

访问：`roomlab.html?m=pwslide&role=A` 创建，`roomlab.html?m=pwslide&role=B` 输入四位房间码加入；无 role 时显示角色选择页。

## 联网及隐私边界

- 独立 Peer ID 前缀 `pwstrip-`，不同玩法四位房间码不会串入。连接 metadata 和握手同时校验 `pwslide` / `password-strip/1`；额外连接拒绝，错 metadata 不占用房主位置。
- 房主保存权威完整状态，但绘制也使用 `snapshot(state, 'A')`。发给 B 的只可能是 `snapshot(state, 'B')`。
- `own` 字段严格只有 axis / pos / min / max，没有 digits / target；`observed` 只包含同伴的条带数据。确认完成状态属于双方可见进度。
- 输入由连接确定角色，不接受客户端指定角色；校验对局 ID、轮次、递增安全整数序号、输入种类、条带索引和 ±1 方向；准备、锁定、阶段与限位均在权威端检查。
- 快照包含连接 match 与单调 frame，B 忽略旧 match / 旧 frame；新局使用新 ID。双方重开不重置连接 frame。
- 连接关闭或错误时立即停止更新与输入；无响应超过七秒停用。退出调用既有清理及关闭连接。失败后保留退出按钮，提示返回重建。
- `PasswordStrip` 导出纯规则 create/input/snapshot 供回归；`state()` 只返回当前角色的视图，连 A 的调试入口也不返回权威完整状态。

## 本地验收

脚本：`G:/hh/coc2/release-staging/qa_password_strip.cjs`

运行：在 `G:/hh/coc2` 执行 `node release-staging/qa_password_strip.cjs`，要求 HTTP 8080 与 PeerJS 9000 服务已运行。

结果：`G:/hh/coc2/release-staging/password-strip-qa/results.json`。

- 500 个随机双轮案例：目标变化、隐私字段、双方准备、错误确认、条带锁定、索引/方向边界、限位、旧 ID / 轮次与重开投票。
- 真实 Edge A/B 页面：错玩法连接被拒且不占房；正确握手；双方准备；使用实际鼠标拖动、浏览器模拟触屏滑动、方向键和方向按钮完成横向/纵向两轮；由观察者确认；双方重开；旧局消息与旧快照回放无效；关闭连接后操作停用；无浏览器脚本异常。
- 320 / 390 / 720px，A/B 两端各轮检查无页面横向溢出、按钮至少 48×48、按钮无阴影及文字溢出，并保存整页截图。
- 图片目录同结果目录。`ready-A/B.png`、`round1/2-A/B-320/390/720.png`、`aligned-round1/2-A/B.png`、`done-A/B.png`、`disconnect-B.png` 均为真实页面截图；aligned 文件尾角色表示被观察/操作条带的拥有者。

追加边界验收：`release-staging/qa_password_strip_edges.cjs` 使用真实 A/B 逐格按钮操作，验证四位横条、两位横条、两位竖条的目标 ±1 / 最远 / 归位。偏离时至少一个数字字形边界被窗口裁切，最远仍有数字片段与窗口相交，归位时所有数字边界完整在窗内；12 张截图和机器结果位于 `release-staging/password-strip-qa/edges/`。入口标题已核对为“看同伴的密码，听同伴的指挥”。

限制：仅本机 Edge / WebRTC 信令实测，尚未验证公网中继和真实手机硬件；密室接入详见下节；保存进度由目录模块负责。无自动通关提示，但观察者可通过观察窗判断对齐，首轮有意保持简单。未正式发布。


## 出口密码锁密室适配（本地待统一发布）

`RoomGameAdapters.pwslide.host(ctx)/guest(ctx)` 复用既有房间连接，不进入独立 lobby，不安装 data listener。消息经原 dgHostOnData/dgGuestOnData 链，以 psRoomInput/psRoomState/psRoomPulse 单独前缀隔离；roomSession/match/frame 与原 id/round/seq 双层守卫。七秒无响应或连接关闭停用操作，clearTimers取消心跳、指针/键盘/连接监听和延迟结算。

教学只做一轮四位横条；进阶直接做横向前两位+竖向后两位，共一轮。独立入口仍保留从横向到横竖的两轮流程。进阶目前以加入纵向协作为复杂度上限，tier2以上不继续增加密码位数，始终保留四位密码、随机目标偏移与差一格裁切。

room-13 专属标题、门锁图标、出口联锁A/B状态与纸面窗口。联锁状态仅在观察者确认后改变，不泄露操作者自己的正确位置。其他房间复习此玩法时不套用出口主题。

成功后主机700ms再调用捕获的ctx.finish(true)一次，B等待dgEnd；密室不出现独立重开按钮。退出用ctx.abort，断线后允许返回重建。旧回调校验session对象、失败状态及ctx.isActive，无法结算新节点。

实际验收包含教学横条、进阶横竖条、AB原Peer/conn不变、没有重复data监听、旧进入消息/快照拒绝、通关动画内退出后再次进入不被旧回调结算，以及320/390/720截图。详见 `release-staging/qa_room_puzzle_adapters.cjs` 和 `release-staging/room-puzzle-adapters-qa/results.json`。独立 `qa_password_strip.cjs` 全流程再次通过。地图挑选与整室解锁由目录任务独立验收。
