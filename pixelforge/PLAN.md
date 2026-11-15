# 《PixelForge AI 像素工坊》实施计划 (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建纯前端单页架构的《PixelForge AI 像素工坊》Web 应用，为独立游戏开发者提供符合硬边像素美术规范的 AI 矢量生成、16色调色板约束吸附、逐帧动画实时审查机与工业级精灵图/引擎配置一键导出流水线。

**Architecture:** 采用纯原生 ES6 模块化结构无任何重型前端打包依赖，划分为色彩引擎 (`palette.js`)、矢量网格校验与近邻栅格化 (`matrix.js`)、多动作动效时钟与洋葱皮渲染 (`animator.js`)、精灵图拼接与 ZIP 打包流水线 (`exporter.js`)，上层通过统一响应式暗黑哥特风工作台 (`studio.css` + `app.js`) 调度并内置全部 12 款防御塔与 3 款多帧怪物的离线演示数据。

**Tech Stack:** 原生 HTML5 Canvas, SVG DOM API, ES6 Modules, Node.js (针对本地验证套件), 纯前端轻量化 Zip 打包器。

**Spec:** [SPEC.md](file:///Volumes/extpan/souceCode/EmbersKeep/pixelforge/SPEC.md)

---

## Global Constraints

- **零外部外部网络字体与 CDN 依赖**：所有样式使用系统安全字体（`ui-monospace`, `Courier New`, `serif` 等），避免因国内网络访问 Google Fonts 产生阻塞。
- **纯静态免安装部署**：必须能在本地静态服务器或任意静态托管平台（GitHub Pages, Vercel, Netlify）直接双击或单端口运行，评委打开即用。
- **像素保真规范**：Canvas 绘制与栅格化过程中必须强制开启 `imageSmoothingEnabled = false`，保证 $1\times, 2\times, 4\times$ 绝对无模糊。
- **标准 16 色调色板硬约束**：严格遵循 Embers Dark Fantasy 16 色规范（HEX 列表定死在代码常量中）。
- **完全兼容 EmbersKeep 塔防引擎**：导出的 Spritesheet 与 `animations.json` 必须可直接无缝替换 EmbersKeep 主游戏的资产。

---

## Review Focus

1. **非标准色彩输入的容错吸附**：当用户传入不在 16 色中的任意杂色（如 `#FFFFFF` 或 `#00FF00`）时，调色板引擎能否平滑吸附到色距最近的标准色，不报异常。
2. **非标 SVG 图元的校验拦截**：输入包含 `<circle>`, `<path>` 或未声明 `crispEdges` 的普通 SVG 时，校验器能明确指出违规图元和行号，并给出修正建议。
3. **单行动作带精灵图的尺寸换算精度**：多帧组合拼接为 Horizontal Spritesheet 时，Canvas 宽度必须精确为 `frameCount * frameWidth`，高度为 `frameHeight`，帧与帧之间零间隙、零错位。
4. **洋葱皮叠帧的透明度渲染**：开启洋葱皮后，前一帧与后一帧以 $25\%$ 透明度叠放且不影响当前帧的主色不透明度。
5. **本地离线环境下 ZIP 导出的完整性**：在断网环境下，用户点击“导出 ZIP”按钮，浏览器依然能以 Blob 形式秒级生成包含所有 PNG、SVG 与 JSON 的压缩包。

---

## 任务拆解与执行步骤

### Task 1: 调色板引擎与色彩吸附器 (`palette.js`)

**Files:**
- Create: `pixelforge/js/palette.js`
- Test: `pixelforge/tests/palette.test.js`

**Interfaces:**
- Consumes: 标准十六进制色值字符串
- Produces: 
  - `EMBERS_PALETTE`: 包含 16 种标准色的冻结数组与名称映射表
  - `snapColor(hex: string): string`
  - `replaceColor(svgText: string, oldHex: string, newHex: string): string`
  - `analyzePalette(svgText: string): { totalPixels: number, stats: Array<{color: string, count: number, percent: number}> }`

- [ ] **Step 1: 编写测试用例 `palette.test.js`**
  测试包括：16色常量完整性、纯红/灰/黑的吸附正确性、SVG 色彩替换与色彩分布统计。
- [ ] **Step 2: 运行测试验证失败**
  `node pixelforge/tests/palette.test.js`
- [ ] **Step 3: 实现 `pixelforge/js/palette.js`**
  实现 RGB 欧几里得距离计算、16色量化吸附函数、正则表达式色彩替换与 SVG 像素占比统计。
- [ ] **Step 4: 运行测试验证通过**
  `node pixelforge/tests/palette.test.js` -> 输出全部 PASS

---

### Task 2: 矢量像素网格校验与近邻栅格化引擎 (`matrix.js`)

**Files:**
- Create: `pixelforge/js/matrix.js`
- Test: `pixelforge/tests/matrix.test.js`

**Interfaces:**
- Consumes: SVG 文本内容、倍率参数（1, 2, 4）
- Produces:
  - `validateSvg(svgText: string): { valid: boolean, errors: string[], warnings: string[] }`
  - `rasterizeSvg(svgText: string, scale: number): Promise<HTMLCanvasElement>` (带 `imageSmoothingEnabled = false`)
  - `svgToDataUrl(svgText: string): string`

- [ ] **Step 1: 编写测试用例 `matrix.test.js`**
  测试验证合规 SVG（仅含 rect 且有 crispEdges）通过校验，非法 SVG（含 path 或缺乏 crispEdges）被准确指出。
- [ ] **Step 2: 运行测试验证失败**
  `node pixelforge/tests/matrix.test.js`
- [ ] **Step 3: 实现 `pixelforge/js/matrix.js`**
  实现基于 DOMParser / 正则的快速结构校验，以及基于 OffscreenCanvas / Canvas2D 的无损近邻放大采样函数。
- [ ] **Step 4: 运行测试验证通过**
  `node pixelforge/tests/matrix.test.js` -> 输出 PASS

---

### Task 3: 多动作逐帧动效状态机与洋葱皮时钟 (`animator.js`)

**Files:**
- Create: `pixelforge/js/animator.js`
- Test: `pixelforge/tests/animator.test.js`

**Interfaces:**
- Consumes: 帧图像列表、动作状态（`walk` / `attack` / `death`）、目标 Canvas
- Produces:
  - `class AnimationPlayer`: 具备 `setAnimation(state)`, `setFps(fps)`, `play()`, `pause()`, `step(delta)`, `toggleOnionSkin(bool)`
  - `renderCurrentFrame(ctx, zoom, showGrid)`: 执行多倍率像素渲染、洋葱皮叠影与像素网格标尺绘制

- [ ] **Step 1: 编写测试用例 `animator.test.js`**
  验证帧指针推进逻辑、环形循环判定（Walk 循环，Death 停留在最后一帧）、洋葱皮帧索引推算。
- [ ] **Step 2: 运行测试验证失败**
  `node pixelforge/tests/animator.test.js`
- [ ] **Step 3: 实现 `pixelforge/js/animator.js`**
  构建基于 `requestAnimationFrame` 的高精度帧时钟，支持 1~24 FPS 动态调节，并在 Canvas 上渲染洋葱皮前帧、当前帧与像素标尺。
- [ ] **Step 4: 运行测试验证通过**
  `node pixelforge/tests/animator.test.js` -> 输出 PASS

---

### Task 4: 精灵图拼接与纯前端轻量 ZIP 打包器 (`exporter.js`)

**Files:**
- Create: `pixelforge/js/exporter.js`
- Test: `pixelforge/tests/exporter.test.js`

**Interfaces:**
- Consumes: 角色/建筑的多帧图片及配置
- Produces:
  - `generateSpritesheet(frames: HTMLCanvasElement[], scale: number): HTMLCanvasElement`
  - `generateAnimationJson(config: object): string`
  - `createZipBundle(files: Array<{name: string, data: Uint8Array|string}>): Promise<Blob>`
  - `triggerDownload(blob: Blob, filename: string): void`

- [ ] **Step 1: 编写测试用例 `exporter.test.js`**
  验证 Spritesheet 水平拼接尺寸计算（$N \times W \times H$）、JSON 元数据 schema 字段结构、ZIP 压缩包头标志（`PK\x03\x04`）。
- [ ] **Step 2: 运行测试验证失败**
  `node pixelforge/tests/exporter.test.js`
- [ ] **Step 3: 实现 `pixelforge/js/exporter.js`**
  实现 Canvas 批量水平合成，并内置纯原生不依赖外部 CDN 的简易 ZIP 文件生成器（写入标准 PKZip 标头），保证在离线环境下仍可一键下载资产包。
- [ ] **Step 4: 运行测试验证通过**
  `node pixelforge/tests/exporter.test.js` -> 输出 PASS

---

### Task 5: 预置资产库与 Prompt 模板生成器 (`presets.js`)

**Files:**
- Create: `pixelforge/js/presets.js`

**Interfaces:**
- Consumes: 现有工程 `assets/svg/` 中的 12 款防御塔与 3 款多帧怪物数据
- Produces:
  - `PRESET_ASSETS`: 包含所有防御塔与怪物的完整 SVG 源码字典
  - `PROMPT_TEMPLATES`: 包含面向 LLM 的标准 Prompt 提示词生成函数（防御塔、怪物动作、材料核心）

- [ ] **Step 1: 提取并内联 12 款塔防卡牌的 SVG 源码**
- [ ] **Step 2: 提取并内联 3 款怪物（狼、爬行者、狼王）共 29 帧的 Walk/Attack/Death 动作序列**
- [ ] **Step 3: 封装预设数据读取接口，供 UI 极速加载**

---

### Task 6: 暗黑哥特风像素工坊工作台 UI 与交互闭环

**Files:**
- Create: `pixelforge/index.html`
- Create: `pixelforge/css/studio.css`
- Create: `pixelforge/js/app.js`

- [ ] **Step 1: 搭建工作台 DOM 骨架 (`pixelforge/index.html`)**
  包含 Header（赛事标识、导出按钮、主游戏传送门）、左侧资产面板、中央 CRT 像素视口与控制轨、右侧调色板与合规体检看板。
- [ ] **Step 2: 编写专业暗黑风 UI 样式 (`pixelforge/css/studio.css`)**
  纯 CSS 打造复古 CRT 扫描线光效、金色铜质边框、像素刻度标尺、手感扎实的推拉滑块与开关。
- [ ] **Step 3: 编写应用控制中心 (`pixelforge/js/app.js`)**
  串联 Palette、Matrix、Animator、Exporter 和 Presets，支持：
  - 点击左侧预设卡牌即时渲染
  - 切换怪物动作与拖拽调节 FPS（1~24 帧）
  - 洋葱皮透光开关与 2x~8x 视口缩放
  - 调色板色块点击换肤
  - 点击【一键导出标准游戏资产包】秒级触发 ZIP 下载
- [ ] **Step 4: 本地浏览器实机全链路验收**
  通过 `http://localhost:3000/pixelforge/index.html` 验证评委 2 分钟体验流程，确保零控制台报错。

---

### Task 7: 统一自动化测试集与回归套件

**Files:**
- Create: `pixelforge/tests/run_all.js`

- [ ] **Step 1: 创建单入口测试脚本 `run_all.js`**
  一键依序运行 `palette.test.js`, `matrix.test.js`, `animator.test.js`, `exporter.test.js`。
- [ ] **Step 2: 执行全量测试**
  运行 `node pixelforge/tests/run_all.js` 并确保 100% 测试通过。
