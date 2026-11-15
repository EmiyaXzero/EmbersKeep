# TRAE 直接执行生成指令 (TRAE Execution Master Prompt)

> **使用方法**：打开 TRAE IDE，在 TRAE 对话框（Chat / Composer / Agent 模式）中直接复制并发送以下提示词。TRAE 将会自动读取本工程内的规范与计划文件，逐项完成代码编写与测试验证。

---

```text
你现在是《PixelForge AI 像素工坊》（面向 2D 独立游戏开发者的 AI 矢量像素美术与逐帧动画生产工作台）的架构师与核心工程师。

请严格根据本项目内的两个设计与规划文件开展工程落地：
1. 规格说明书：pixelforge/SPEC.md
2. 实施计划：pixelforge/PLAN.md

你的目标是：不要停顿，一次性完整实现 pixelforge/ 目录下的所有模块、测试用例与纯前端 Web 工作台，使其可以在浏览器中即开即用（支持 http://localhost:3000/pixelforge/index.html 访问），并在离线环境下跑通完整核心业务流。

【执行任务清单与要求】：
1. 任务 1 (Task 1)：创建 pixelforge/tests/palette.test.js 与 pixelforge/js/palette.js
   - 包含 Embers Dark Fantasy 16 色常量
   - 实现 snapColor(hex) 欧几里得距离吸附
   - 实现 replaceColor 与 analyzePalette 像素分布统计
   - 运行 node pixelforge/tests/palette.test.js 验证全部通过

2. 任务 2 (Task 2)：创建 pixelforge/tests/matrix.test.js 与 pixelforge/js/matrix.js
   - 实现 validateSvg(svgText)，严格检查 shape-rendering="crispEdges"、整数坐标、只允许 rect
   - 实现 Canvas 最近邻无损缩放采样 rasterizeSvg(svg, scale)（强制 imageSmoothingEnabled = false）
   - 运行 node pixelforge/tests/matrix.test.js 验证通过

3. 任务 3 (Task 3)：创建 pixelforge/tests/animator.test.js 与 pixelforge/js/animator.js
   - 实现多状态（Walk/Attack/Death）动作机 AnimationPlayer
   - 实现 1~24 FPS 动态时钟调节、逐帧步进、洋葱皮（前后帧 25% 半透明叠放）
   - 运行 node pixelforge/tests/animator.test.js 验证通过

4. 任务 4 (Task 4)：创建 pixelforge/tests/exporter.test.js 与 pixelforge/js/exporter.js
   - 实现水平单行动作带 Spritesheet 拼接（Canvas 绘制）
   - 生成符合游戏引擎标准的 animations.json
   - 实现纯原生、无外部依赖的单文件 ZIP 打包器（写入标准 PKZip 标头），生成二进制 Blob
   - 运行 node pixelforge/tests/exporter.test.js 验证通过

5. 任务 5 (Task 5)：创建 pixelforge/js/presets.js
   - 将现有工程中的 12 款防御塔与 3 款多帧怪物（狼、爬行者、狼王）完整内联为离线预设资产库，无需任何后端或网络即可直接在页面上演示

6. 任务 6 (Task 6)：创建 pixelforge/index.html、pixelforge/css/studio.css、pixelforge/js/app.js
   - 纯原生 ES6 模块驱动，无任何打包工具
   - 暗黑哥特像素工作台界面（CRT 扫描微光、刻度标尺、手感扎实的滑块与按钮）
   - 左侧资产列表、中央高倍率像素视口+动效控制条、右侧 16 色调色板换肤与合规体验看板
   - 支持快捷键：空格（播放/暂停）、[ / ]（前后帧切换）、1-4（缩放倍率）
   - 点击顶部【一键导出标准游戏资产包】立即触发 ZIP 下载

7. 任务 7 (Task 7)：创建 pixelforge/tests/run_all.js 并运行全量测试
   - 执行 node pixelforge/tests/run_all.js，确保全部核心算法测试 100% PASS。

请立即按顺序执行，创建全部文件并运行测试验证！
```
