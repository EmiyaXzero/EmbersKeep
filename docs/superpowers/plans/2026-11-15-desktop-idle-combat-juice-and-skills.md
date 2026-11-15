# 《余烬裂隙》爽快度与微操打击感 (Direction A) 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 Direction A 规范——实现 3 个经典全屏大招技能 (Q/W/E) 及其手动与自动施法、暗黑/DNF 地面物理喷装与自动吸附、暴击震屏、打击顿挫与全套 Web Audio 视听打击感。

**Architecture:**
- **数值与战斗引擎**：在 `battle_engine.js` 扩展技能状态机（CD、伤害、范围、自动释放）与地面掉落物状态队列（物理抛物线、磁吸判定）。
- **线程通信**：通过 `worker.js` 和 `worker_client.js` 双向同步技能指令与掉落物快照。
- **视觉渲染**：在 `viewport.js` 驱动 Canvas 2D 物理抛物线地面弹跳、彩色光柱、悬浮文字标牌、震屏、顿挫与 Q/W/E 剑气动效。
- **程序化音效**：在 `sfx.js` 扩充拔刀剑气、崩山地裂、觉醒剑舞与晶石拾取和弦。
- **UI 交互**：在底栏和独立小窗 HUD 增加 `[Q] 拔刀`、`[W] 裂地`、`[E] 剑舞` 技能按钮与 `[⚡ 自动施法]` 开关。

**Tech Stack:** 原生 JavaScript (ES Modules), Web Worker, HTML5 Canvas 2D, Web Audio API, Node.js 单元测试。

---

## 任务拆解

### Task 1: 战斗引擎技能系统与自动施法 (Skill System)
- **文件**：
  - 新增：`tests/idle/skill.test.js`
  - 修改：`src/idle/battle_engine.js`
- [ ] 编写测试用例验证 Q/W/E 技能注册、冷却倒计时、伤害倍率计算、手动触发 `castSkill('Q')`、以及 `autoCastSkills: true` 下的自动判定；
- [ ] 在 `BattleEngine` 中实现 `skills` 字典（Q: 8s, W: 14s, E: 28s）、`castSkill(key)` 方法、`autoCastSkills` 状态与每 tick 自动判施；
- [ ] 释放技能时生成 `SKILL_CAST` 战报事件，包含技能名、伤害值、受击怪物列表及震屏强度；
- [ ] 运行 `node tests/idle/skill.test.js` 验证 100% 通过并提交。

### Task 2: 地面物理喷装与磁吸系统 (Ground Drop System)
- **文件**：
  - 修改：`src/idle/battle_engine.js`
  - 修改：`tests/idle/skill.test.js`
- [ ] 在测试中补充验证小怪/Boss 击杀生成 `GroundDrop` 实体（带坐标、抛物线速度、品质与拾取延迟）；
- [ ] 在 `BattleEngine` 中将击杀直接塞包改为推入 `groundDrops` 数组，每 tick 模拟重力速度 $v_y$ 与地面碰撞反弹；
- [ ] 落地 0.6s 后或英雄接近 80px 时触发自动磁吸，将物品正式记入钱包/背包，触发 `DROP_PICKUP` 事件；
- [ ] 运行测试确认地面喷装与磁吸循环完全正确。

### Task 3: Worker 线程指令与快照双向同步
- **文件**：
  - 修改：`src/idle/worker.js`
  - 修改：`src/idle/worker_client.js`
- [ ] `worker.js` 接收 `CAST_SKILL` 和 `TOGGLE_AUTO_CAST` 消息并调用引擎对应方法；
- [ ] 快照中包含当前技能 CD 百分比、`autoCastSkills` 开关状态及活动中的 `groundDrops` 队列；
- [ ] `WorkerClient` 暴露 `client.castSkill(key)` 和 `client.toggleAutoCast(enable)` 便捷接口。

### Task 4: Canvas 2D 物理喷装、光柱与剑气视觉 (Viewport FX)
- **文件**：
  - 修改：`src/idle/viewport.js`
- [ ] 实现 `ScreenShake` 屏幕震颤与 `HitStop` 微秒级微冻帧逻辑；
- [ ] 在 Canvas 长廊中绘制地面掉落物：抛物线弹跳、彩色竖直微光柱（白/蓝/紫/金色）、悬浮像素文字框（如 `[太古·别云剑]`）、磁吸飞行微光粒子；
- [ ] 实现 3 大招牌大招动效：
  - **Q 极·拔刀斩**：全屏贯穿的银白月弧撕裂剑气；
  - **W 虚空裂地斩**：英雄腾空砸地，3 柱暗红地裂岩浆爆发；
  - **E 觉醒·剑刃风暴**：残影极速 16 连击与收尾天雷破空；
- [ ] 英雄挥砍流光与强化 +10/+12 武器金色雷芒拖尾增强。

### Task 5: 技能与拾取音效扩展 (Procedural Audio)
- **文件**：
  - 修改：`src/idle/sfx.js`
- [ ] 使用 Web Audio API 合成：
  - `playSkillQ()`：破空尖啸银刃出鞘声；
  - `playSkillW()`：沉重地动山摇崩裂轰鸣；
  - `playSkillE()`：高频剑刃狂舞与终结爆破；
  - `playDropPickup(rarity)`：清脆金币弹响与高品阶史诗和弦。

### Task 6: HUD 技能栏、快捷键与自适应交互
- **文件**：
  - 修改：`idle.html`
  - 修改：`src/idle/idle.css`
  - 修改：`src/idle/ui.js`
- [ ] 在长廊视口与状态栏之间添加迷你技能栏：
  - 3 个技能卡带：`[Q] 拔刀斩`、`[W] 裂地斩`、`[E] 剑刃风暴`，带半透明冷却遮罩；
  - 切换开关：`[⚡ 自动施法]`，激活时呈现金色微光脉冲；
- [ ] 键盘监听 `Q`/`W`/`E` 直接触发对应技能；
- [ ] 针对独立小窗模式和常规桌面模式做自适应适配，确保按钮永不遮挡。

### Task 7: 统一测试套件与线上部署验证
- **文件**：
  - 修改：`tests/idle/run_all.js`
- [ ] 将 `tests/idle/skill.test.js` 纳入 `tests/idle/run_all.js` 统一测试流；
- [ ] 运行全套测试确保 100% PASS；
- [ ] 本地验证视觉动效流畅度；
- [ ] 提交代码并推送至 GitHub Pages，验证线上生效。
