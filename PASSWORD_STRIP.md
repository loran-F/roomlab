# 密码推条：共享切片拼图（pwslide）

本轮按用户的同图横切参考重做。本地待总控验收发布，未提交、未升级 APP_VER。

## 玩法

两端看到同一幅四位数字图形，横向切成 6 或 8 条并左右错位。A 只能移动第 1、3、5（7）条；B 只能移动第 2、4、6（8）条。基础教学为 6 条、数字 1234；进阶为 8 条、随机不重复的四位数字。独立入口两轮，密室教学/进阶各一轮。没有逐位输入、互看不同密码、纵向条带或答案底图。

双方读规则并手动准备后开始，不限时。直接拖动己方切片，数字跟手，移动过程实时发给同伴；下方 48px 条号按钮可选择细条，60px 拖动区和左右微调按钮提供替代。方向键移动所选己方条。指针松开、取消或失焦只就近停到 4 单位档位，不自动寻找答案。移动范围为 ±64 SVG 单位，界面不显示偏移或目标数值。

完成要求是所有切片处于同一水平偏移，并且整图处于外框内（保守完整范围 ±44）；可在 +8、+12、-12 等位置拼成完整数字，不要求隐藏的零点。拼齐后两人各点一次“拼好了 · 确认”，没有额外密码输入。任何条片继续移动都会撤销双方确认。错位/裁切时确认只提示继续观察，不扣机会。

## 图形与布局

沿用紫色页面、奶油卡片，中心白板配大灰数字。一个 SVG defs 字形源被 6/8 个相邻且不重叠的 y 区间引用；没有未切割的可见答案图层。源图字体 Arial 128、总字宽 270，切片范围 y36–132，总高96，切片 DOM 与 viewBox 同比例。白板上下留白独立于切片，不纵向拉长字形。不同角色只有操作归属/所选条号不同，数字图形位置完全共享。按钮为单层平面，没有嵌套色底。

## 文件与共享边界

本轮产品改动只有 password-strip.js、password-strip.css、本文档，以及总控授权的 record.js 两个 pwslide hunk（进度文字与 drivePWSlide）。不改 HTML、Loading、lightsearch、vault 或其他玩法。原 room-progression 文案由目录负责人另行更新。

保留 MODE=pwslide、独立 role=A/B 大厅、RoomGameAdapters.pwslide.host(ctx)/guest(ctx)、clearTimers 包装、ctx.isActive/abort/finish。密室复用原 Peer/conn 和数据分发，不新增 data listener。成功或机会耗尽后700ms调用捕获 ctx.finish(win) 一次；清理会取消心跳、指针/键盘监听、连接监听和未执行结算。

独立协议升级为 password-slices/2，metadata 和握手均要求新版。输入、快照及密室心跳附 proto，旧版包不生效。密室继续校验 roomSession/match/frame，输入继续校验 id/round/递增 seq。角色由连接确定，主机拒绝越权条号、非整数/越界偏移、过期对局/轮次。

独立250ms、密室150ms更新/心跳保持。拖动本地即时预览并最多约25次/秒发送，松手强制发最后一帧；主机输入后立即广播，B以 ack 序号确认本地预览，避免旧快照覆盖正在拖动的位置。play 内只更新 transform/按钮状态，不重建指针目标。关闭连接或七秒无响应后停止操作。

## 测试接口

PasswordStrip.create(ctx)/input(state,message,role)/snapshot(state,role)/state() 保留。

共享快照：win/remaining/maxMistakes/startRound/endRound/id/round/phase/ready/again/confirmed/notice/picture/rows/ack。rows 为 {owner,offset}；无旧 own/observed/target/locked 字段。phase 为 ready/play/between/done。

DOM：.ps-board、[data-ps-row="全局零基序号"]、[data-ps-band="序号"]；己方 [data-ps-select="序号"]；#ps-minus/#ps-plus、.ps-touch、#ps-confirm；原 #ps-ready/#ps-again/#ps-back 和大厅选择器保留。record 自动驱动取共享第1条可见偏移作为相对拼合位置，再点击所属按钮，不直接改状态。

## 本轮验证

主脚本 G:/hh/coc2/qa/tools/qa_password_slices.cjs；证据 G:/hh/coc2/qa/reports/evidence/password-slices/results.json 和同目录真实截图。

覆盖200个随机双轮规则案例，双方准备/确认、奇偶权限、越界输入、过期ID、共同非零位置成功、完整范围外失败、移动撤销确认；真实 A 拖动未松手时 B 同步且 DOM 不重建、B 浏览器触控、A 键盘、按钮微调；320/390/720无横向溢出且按钮至少48px；独立两轮完成及双方重开、真实关闭A页面后B停止；真实密室教学/进阶完整通关、每次唯一结算、Peer/conn与单data listener保留；结算延迟内退出后重进，旧回调/输入/快照不影响新局。

旧 release-staging 中针对“私有密码窗口/横竖两带”的脚本与报告是历史版本证据，不适用于本次重定义。总控维护的新 GP09 与本脚本为当前验收入口。

限制：本机 Edge/WebRTC 与浏览器模拟触控；尚未进行实体手机、公网中继/高延迟、长时间压力测试。完整随机密室路线由总控组合验收，本模块用真实节点入口验证教学和进阶。细切片提供大操作区替代，不能将每条图像本身等同48px按钮。


## 2026-09-09 有限确认机会与随机变化（本地待发布）

独立两轮共用5次错误确认机会；密室教学5次、进阶4次。没有倒计时。拖动或微调不扣机会，未拼成完整数字时正式确认扣1次；双方500ms内对同一排列重复确认只扣一次，同一错误500ms后再次确认仍扣机会。实际改变排列后可立即计入新一次确认。按住Enter/空格的键盘自动重复不触发连续确认。

机会耗尽进入done且win=false，双方显示失败，密室仅调用一次ctx.finish(false)；成功为done且win=true。外部托管、录制、统计不得仅凭done判断通关。双方重新开局重置机会，新id隔离旧包。独立第一轮结束不补充机会。

随机初始化保证各角色的条片至少有两种偏移，并避免同档紧邻重开生成完全相同题面与偏移；进阶仍是8条和随机4个不重复数字。选定教学或进阶不会因重开自动升档。使用sessionStorage保存最近题面，存储不可用时退回内存。

本增量产品文件只有password-strip.js与本文档；password-strip.css沿用已验收样式。不修改record、托管或共享入口。托管继续只读rows/confirmed、点击己方选择/微调/确认按钮，并在done时停止、区分win。

补充验证入口：qa/tools/qa_password_limits_rules.cjs（200组扣次边界与终态隔离），qa/tools/qa_password_limits_final.cjs（真实双端同错去重、耗尽失败、重开、地图唯一失败结算，以及完整原回归）。证据位于qa/reports/evidence/password-limits-final。公网延迟、实体手机仍未验证；去重是主机接收时间500ms窗口，超过该窗口的确认按新尝试处理。
