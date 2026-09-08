# 符咒与收容舱主题

本地待总对话统一发布。运行文件 `room-puzzle-themes.js/.css`，只提供展示层，不修改 `code-symbols.js`、共享 HTML 中的压力引擎、判定或网络消息。

由目录任务接入，当前加载顺序：原玩法 → password-strip → rhythm-light → room-puzzle-themes → room-progression → render。

- **room-20 + code**：符咒使用黄纸、朱印边框，保留原十个复合符号与五项细节编码。A 四张封印纸与 B 十张手册用同一个 drawSymbol 包装，符号/数字映射不变。增加封印手册分工；320px 手册保持两列，数字不折行。仅密室上下文生效，独立符号入口仍使用原绘制。
- **room-8 + pressure**：增加收容舱、气泵管线与三道封环设备。A 显示自己的压力液面，B 显示自己的安全带，绝不把 A 读数画在 B 端。操作文字对应泄压、气泵加压和锁紧封环，按住/松手、惯性、区间移动、阀温与耐久判定完全沿用原引擎。设备区改为内容自适应高度，避免安全区预告与进度条重叠。

钩子：包装 `drawSymbol`、`runCode`、`renderManual`、`pressureUI`、`pressureDraw`；每次先检查 `_dungeon`、`DUNGEON.roomId` 与 `S.mod`。不创建 Peer、不监听网络、不安排结算、不创建定时器。DOM 随原页面清理，不加全局主题 class。

验收脚本 `release-staging/qa_room_puzzle_themes.cjs`：实际 A/B 从相应密室教学节点进入；完成原练习（收容舱还通过原“异形惊扰”的双方选择）；实际输入四位符咒密码、使用键盘加/泄压与 B 按住阀门完成三道封环；成功后双端回图且节点完成，Peer/conn 保持不变；320/390/720截图、页面无横向溢出、压力预告不越出设备面板、不与进度条重叠；无 pageerror。压力自动验收只读取双方各自公开视图作反馈控制，没有改写物理状态或调用强制成功。

结果及真实截图：`release-staging/room-puzzle-adapters-qa/themes/results.json`，同目录 code-A/B-320/390/720.png、pressure-A/B-320/390/720.png。独立 `qa_code_symbols.cjs` 十符号唯一性/距离/实际输入回归，以及 `qa_pressure.cjs` 四档区间与隐私判定均通过。

限制：本地 Edge/WebRTC 验收，未在真实手机及公网中继实测。此模块不改变原 code/pressure 生命周期；地图生命周期与旧玩法的结算由主框架、room-progression 管理。
