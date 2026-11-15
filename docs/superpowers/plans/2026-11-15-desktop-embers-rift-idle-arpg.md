# 《余烬裂隙：桌面摸鱼挂机 ARPG》实施计划 (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建纯前端单页架构的《余烬裂隙》（EmbersRift）桌面摸鱼挂机 ARPG，常驻于屏幕最下方约 1/6 高度（160px），具备全自动战斗、12 部位装备纸娃娃、打爆裂隙方尖碑触发通天史诗金光、秘银锻炉（+1~+15）强化心跳体验、Web Worker 穿透后台休眠以及一键老板键代码终端伪装。

**Architecture:** 采用前后端分离的纯静态 Web 架构。核心数值运算与波次掉落由独立轻量 `Web Worker` (`battle_worker.js`) 驱动，不受浏览器最小化休眠节流影响；表现层采用长条 Canvas 视差地牢渲染器 (`viewport.js`)，上层通过极窄响应式底栏 (`ui.js` + `idle.css`) 承载 12 部位装备抽屉与锻炉，配备快捷弹窗管理器 (`bosskey.js`) 与持久化本地存储。

**Tech Stack:** 原生 HTML5 Canvas, Web Worker API, Web Audio API, ES6 Modules, Node.js (自动化单元测试套件).

**Spec:** [`docs/superpowers/specs/2026-11-15-desktop-abyss-idle-arpg-design.md`](file:///Volumes/extpan/souceCode/EmbersKeep/docs/superpowers/specs/2026-11-15-desktop-abyss-idle-arpg-design.md)

---

## Global Constraints

- **100% 原创暗黑余烬宇宙术语**：杜绝使用“DNF、地下城与勇士、凯丽、炉岩碳、深渊派对、无色小晶块”等受版权保护名称，统一使用设计规范中的“裂隙方尖碑、秘银锻炉、余烬玄碳、虚空晶屑、太古史诗”。
- **零外部外部网络与 CDN 依赖**：所有样式使用系统安全等宽与衬线字体，音效全部基于 Web Audio API 动态合成，无需加载庞大的外部音频文件。
- **极窄视口自适应**：底栏高度严格限制在 $160\sim180\text{px}$，在不遮挡主屏幕办公视口的同时，保持文字、血条、卡牌与掉落图标的清晰可读。
- **挂机永不中断保障（方案 A）**：主角在普通长廊永不死亡；裂隙 Boss 战设 60 秒限时，超时 Boss 遁走并掉落保底材料，绝不卡死挂机循环。
- **100% 资产继承**：直接无缝复用当前工程现有的灰烬狼、爬行者、狼王 29 帧逐帧动画与 16 色暗黑哥特调色板。

---

## Review Focus

1. **Web Worker 后台挂机抗休眠能力**：在最小化浏览器标签页或开启老板键 5 分钟后，切回游戏能准确累加这 5 分钟内斩杀的怪物数量、金币、玄碳与装备掉落，不丢失不卡顿。
2. **+11 碎刀安全闭环**：当身上唯一的武器强化 +11 失败破碎时，系统必须自动瞬间装备一把【粗糙新手铁剑】，主角战力不为 0，依然可以继续击杀小怪。
3. **极窄高度下的抽屉排版**：在 160px 视口下点击“背包”，展开的 12 格纸娃娃抽屉不得溢出视口被裁剪，必须具备紧凑的浮动视口。
4. **史诗金色通天光柱粒子视效**：爆出深金色太古史诗时，Canvas 必须触发柔和震颤、金色高亮光柱贯穿与清脆的 Web Audio 合成金鸣声。
5. **双窗口主从锁**：用户同时在主页面与独立弹窗打开游戏时，通过 `localStorage` 时间戳锁确保只有一个活跃线程运算，避免装备数据错乱覆盖。

---

## 任务拆解与执行步骤

### Task 1: 12 部位装备系统与战力掉落数值模型 (`equipment.js`)

**Files:**
- Create: `src/idle/equipment.js`
- Test: `tests/idle/equipment.test.js`

**Interfaces:**
- Consumes: 角色等级、怪物等级、随机数种子
- Produces:
  - `EQUIPMENT_SLOTS`: 12 个槽位常量（`weapon`, `shoulder`, `top`, `bottom`, `belt`, `shoes`, `bracelet`, `necklace`, `ring`, `left_badge`, `right_stone`, `earring`）
  - `RARITY_TIERS`: 6 个品阶配置（`common`, `uncommon`, `rare`, `unique`, `epic`, `mythic`）及对应颜色十六进制与光效
  - `generateDrop(monsterLevel, isBoss): Equipment`
  - `calculateCombatPower(equippedMap): { totalPower: number, stats: object }`
  - `decomposeItem(item): { gold: number, cinders: number, shards: number }`

- [ ] **Step 1: 编写测试用例 `equipment.test.js`**
  验证 12 个槽位定义、品阶颜色常量、战力计算公式（力量/智力/属强/直接增伤乘区）、普通分解产金币、稀有分解产玄碳。
- [ ] **Step 2: 运行测试验证失败**
  `node tests/idle/equipment.test.js`
- [ ] **Step 3: 实现 `src/idle/equipment.js`**
  构建 12 部位装备字典、5 种武器流派定义、属性生成器与战力评分算法。
- [ ] **Step 4: 运行测试验证通过**
  `node tests/idle/equipment.test.js` -> 输出 PASS

---

### Task 2: 秘银锻炉（+1~+15强化）与经济循环 (`forge.js`)

**Files:**
- Create: `src/idle/forge.js`
- Test: `tests/idle/forge.test.js`

**Interfaces:**
- Consumes: 待强化装备对象、玩家金币/余烬玄碳余额
- Produces:
  - `getForgeRate(currentLevel): { successRate: number, costGold: number, costCinders: number, riskType: 'safe'|'degrade'|'shatter' }`
  - `executeForge(item, userInventory): { success: boolean, resultItem: Equipment, returnShards: number, fallbackWeapon?: Equipment }`
  - `exchangeShardsForSigils(shardsCount): { sigilsGained: number, remainingShards: number }`

- [ ] **Step 1: 编写测试用例 `forge.test.js`**
  验证 +1~+7 成功率 100%、+8~+10 失败掉级、+11~+15 失败碎刀产出虚空晶屑并无缝补发保底新手剑、晶屑 100:1 兑换裂隙星石。
- [ ] **Step 2: 运行测试验证失败**
  `node tests/idle/forge.test.js`
- [ ] **Step 3: 实现 `src/idle/forge.js`**
  实现强化阶梯成功率与风险判定状态机、属性成长倍率函数、晶屑商人兑换逻辑。
- [ ] **Step 4: 运行测试验证通过**
  `node tests/idle/forge.test.js` -> 输出 PASS

---

### Task 4: 裂隙方尖碑机制与无打扰挂机战斗引擎 (`battle_engine.js`)

**Files:**
- Create: `src/idle/battle_engine.js`
- Test: `tests/idle/battle.test.js`

**Interfaces:**
- Consumes: 英雄战力属性、时间步长 (delta)
- Produces:
  - `class BattleEngine`:
    - `tick(deltaMs)`
    - `getStateSnapshot(): { hero, monsters, obelisk, drops, riftSigils, gold, waveNumber }`
    - `triggerObelisk()`
    - 状态机包含：`NORMAL_GRIND`, `OBELISK_SPAWN`, `BOSS_ENCOUNTER`, `EPIC_CELEBRATION`

- [ ] **Step 1: 编写测试用例 `battle.test.js`**
  验证普通小怪无限波次刷新、主角永不阵亡、累积 20 颗裂隙星石自动生成方尖碑、60 秒 Boss 限时击杀（超时逃走留保底碎片，击杀掉落深金太古史诗）。
- [ ] **Step 2: 运行测试验证失败**
  `node tests/idle/battle.test.js`
- [ ] **Step 3: 实现 `src/idle/battle_engine.js`**
  编写纯数值无 DOM 依赖的核心战斗状态机，使其可同时在主线程与 Web Worker 中完全一致地运行。
- [ ] **Step 4: 运行测试验证通过**
  `node tests/idle/battle.test.js` -> 输出 PASS

---

### Task 4: 后台防休眠 Web Worker 封装与主从时钟 (`worker.js`)

**Files:**
- Create: `src/idle/worker.js`
- Create: `src/idle/worker_client.js`

**Interfaces:**
- Consumes: 战斗配置与定时心跳
- Produces:
  - 维持 100ms 一次的恒定数值心跳，利用 `postMessage` 向 UI 主线程发送当前渲染快照
  - 接收 UI 主线程的强化、换装、分解指令并回写

- [ ] **Step 1: 编写 Worker 脚本实现与主线程双向通信**
- [ ] **Step 2: 验证在浏览器最小化或标签页未激活时数值持续累加**

---

### Task 5: 160px 极窄视口视差 Canvas 与通天金色光柱特效 (`viewport.js`)

**Files:**
- Create: `src/idle/viewport.js`
- Create: `src/idle/sfx.js` (Web Audio API 合成金光与斩杀音效)

**Interfaces:**
- Consumes: Canvas 元素、`getStateSnapshot()` 数据
- Produces:
  - `render(snapshot)`:
    - 多层暗黑地牢石板视差背景滚动
    - 绘制主角流浪剑士（行走/挥刀动作）
    - 绘制狼群、爬行者、霸主受击硬直与消散
    - 绘制跳字暴击伤害（-9999）
    - 绘制太古史诗掉落时的屏幕微闪与通天金色光柱（柱顶高亮光斑 + 粒子上扬）

- [ ] **Step 1: 实现长条 Canvas 自适应渲染循环**
- [ ] **Step 2: 接入现有怪物逐帧图片资产 (`assets/textures/1x/`)**
- [ ] **Step 3: 实现纯 Web Audio 合成的“深渊金鸣叮当”与剑气挥砍音效**

---

### Task 6: 12 部位装备纸娃娃抽屉、秘银锻炉与老板键伪装 (`ui.js` + `idle.css` + `bosskey.js`)

**Files:**
- Create: `src/idle/ui.js`
- Create: `src/idle/idle.css`
- Create: `src/idle/bosskey.js`

**Interfaces:**
- Consumes: DOM 容器、按键事件
- Produces:
  - 底部 160px 极窄三段式 HUD（左视口、中仪表、右操作）
  - 点击“背包”平滑滑出 12 部位纸娃娃装备抽屉与 24 格背包
  - 点击“锻炉”弹出紧凑强化转盘模态框
  - 按 `Esc` 或 `~` 键瞬间将底栏切换为等宽绿色字体终端日志伪装（Maven / CRM 同步日志）
  - 点击“独立小窗”触发 `window.open('idle.html?popup=true', '_blank', 'width=1600,height=220')`

- [ ] **Step 1: 编写暗黑复古摸鱼底栏 HTML 骨架与 CSS 样式**
- [ ] **Step 2: 绑定装备穿戴、一键分解白蓝装交互**
- [ ] **Step 3: 绑定锻炉强化悬念动画与老板键无缝切换**

---

### Task 7: 入口页面构建、集成测试套件与 GitHub Pages 部署

**Files:**
- Create: `idle.html`
- Create: `tests/idle/run_all.js`
- Modify: `index.html` (添加底栏摸鱼挂机入口)
- Modify: `pixelforge/index.html` (添加底栏摸鱼挂机入口)

- [ ] **Step 1: 创建单入口页面 `idle.html` 并串联所有模块**
- [ ] **Step 2: 编写并执行全量测试套件 `tests/idle/run_all.js` 确保 100% PASS**
- [ ] **Step 3: 在主游戏与像素工坊中添加直达链接**
- [ ] **Step 4: 提交代码推送到 GitHub，自动触发 Pages 部署上线**

---

## 自审检查（Self-Review）
- **Spec 覆盖**：12 部位装备、太古史诗金光、方尖碑 60s 遁走保底、秘银锻炉 +11 碎刀、Web Worker 防休眠、老板键均已对应具体 Task。
- **版权合规**：所有命名均为 100% 原创暗黑余烬体系，无侵权漏洞。
- **可测试性**：数值、装备、强化、战斗状态机均有独立 Node.js 单元测试（无需无头浏览器）。
