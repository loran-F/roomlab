# 警报拆线：分步规则与手游操作

## 美术与结算修复（第二版）

- A 线板改成带端子、曲线缆、机壳、螺丝、倒计时窗与警示条的拆弹设备。条纹与圆点分别绘制，剪断后留真实空隙与铜色断头；点击范围仍是整行。
- B 为纸质拆弹手册，删除逐行按钮状卡片。
- 按钮 appearance 重置，移除厚底阴影；footer 无边框/背景/阴影。
- 结算隐藏旧职责/计时/提示，独立显示设备图标、结论和一个重开按钮。失败原因保留。
- qa_wires_art.cjs：完整双端通关/救场/重开回归，并在240、320、390宽度检查结算无溢出、按钮与内容不重叠、按钮高度≥48、无底影和footer外框。
- 本次仅改 wires-mobile.js/.css 与本文档，不改 HTML 或 coop-upgrade。

## 本版行为

- 独立试玩通过 A 建房、B 加房；密室复用现有连接。双方阅读职责、点击准备，3 秒后开始，基础 90 秒。
- A 点选线后用底部按钮确认剪断。线号始终固定，已剪线保留断口；颜色、文字、实线/条纹/圆点共同辨认。
- B 只显示当前刀的规则，拿不到线板、灯色、接头或答案。第一刀根据颜色数量，第二刀根据新亮的灯色和线纹理，第三刀根据新露出的接头和上一刀线色判断。没有候选线时的规则也有明确后备答案。
- 首次错剪触发 8 秒旁路救场（主倒计时暂停）。A 按住断路开关并报私有符号，B 选择对应符号；选择错误、救场超时或再次剪错均失败。救场成功不剪掉错误线，回到当前刀重新判断。
- 连续同玩法 1/2/3/4 档分别 6/7/8/8 根线，沿用 coopTime 时间缩放及原有节点重试等级。正常通关/失败走 dungeonEnd。
- 公开入口被 wires-mobile.js 覆盖，旧 runWires 和旧剪线救场函数保留但不走本版正常入口。

## 文件及集成

- wires-mobile.js / wires-mobile.css：独立引擎、双端界面、角色快照、重开、清理。
- roomlab.html：仅在 render() 前追加两个引用，位于 radio-mobile 后。
- coop-upgrade.js：仅改 wires 职责文案及旧练习描述，正确按钮仍为 2。
- 协议 wmState/wmReady/wmCut/wmHold/wmBypass/wmAgain，按局 id 和 round 验证；B 不能触发 A 的剪线。A 的 hold 有 180ms 心跳和 650ms 失效。
- 全局 WiresMobile 暴露 create/step/snapshot/target/input/state 供开发验证；B 实际连接收到的快照不含现场答案。

## 验证记录

- release-staging/qa_wires_mobile.cjs：实际 A/B 建房连接，点选不会立即剪线，三刀规则更新、固定编号、私有字段、按住与选符号救场、重开、断线；320×568 / 390×844 / 720×1280 无横向溢出，控制区与消息不重叠。
- release-staging/qa_wires_dungeon.cjs：既有首次练习、连续第3次8根线/72秒、实际三刀通关、两端回图、无额外扣血和状态清理。
- release-staging/qa_wires_rules.cjs：1,200 局 / 3,600 次独立规则判定，覆盖红线/蓝线/无蓝线、两种灯色、两种接头、无候选后备；检查 B 隐私、B 无剪线权限、重复/过期消息、救场超时失败。
- 截图：release-staging/wires-mobile-A.png、wires-mobile-B.png。

## 交付总对话

本分支未提交 GitHub。完整发布快照在 release-staging/wires-mobile；其 release.json 使用搜台发布后 HTML 和 coop-upgrade.js 的已知 SHA 保护，提交前由总对话核验远端及共享文件有无后续变化。不要以过期快照覆盖之后的共享改动。
