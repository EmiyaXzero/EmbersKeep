# PixelForge AI 像素工坊

> **面向 2D 独立游戏开发者的 AI 矢量像素美术与逐帧动画生产工作台**  
> 字节跳动 **TRAE 好应用大赏赛【内容创作赛道】** 参赛独立项目

---

## 目录与文档导航

本目录包含完整的独立子项目规划、技术规格、TRAE 自动生成提示词以及参赛申报全套材料：

- 📄 **[SPEC.md](file:///Volumes/extpan/souceCode/EmbersKeep/pixelforge/SPEC.md)**：产品设计与技术规格说明书（架构图、数据 Schema、模块接口、评委 2 分钟体验流）
- 📋 **[PLAN.md](file:///Volumes/extpan/souceCode/EmbersKeep/pixelforge/PLAN.md)**：严谨遵循 TDD 规范的实施计划（拆分为 Task 1 至 Task 7，附自动化测试与验收标准）
- ⚡ **[TRAE_EXECUTION_PROMPT.md](file:///Volumes/extpan/souceCode/EmbersKeep/pixelforge/TRAE_EXECUTION_PROMPT.md)**：**给 TRAE 的一键执行生成提示词**（直接复制到 TRAE 即可驱动全自动化生成）
- 🏆 **[TRAE_SUBMISSION_PACK.md](file:///Volumes/extpan/souceCode/EmbersKeep/pixelforge/TRAE_SUBMISSION_PACK.md)**：TRAE 好应用大赏赛官方问卷申报材料包（赛道选择、一句话介绍、3 个关键 Session 规划、路演视频脚本）

---

## 项目结构规划

```
pixelforge/
├── README.md                      # 本说明文档
├── SPEC.md                        # 产品设计与接口规格
├── PLAN.md                        # TDD 实施计划 (Task 1-7)
├── TRAE_EXECUTION_PROMPT.md       # TRAE 一键驱动 Master Prompt
├── TRAE_SUBMISSION_PACK.md        # 赛事填报材料与视频脚本
├── index.html                     # 纯前端 Web 工作台入口
├── css/
│   └── studio.css                 # 暗黑哥特 CRT 像素风格界面
├── js/
│   ├── app.js                     # 工作台主控制器
│   ├── palette.js                 # 16色暗黑调色板吸附与换肤引擎
│   ├── matrix.js                  # 矢量网格校验与最近邻采样
│   ├── animator.js                # 多状态动效时钟与洋葱皮渲染
│   ├── exporter.js                # Spritesheet 合成与 ZIP 打包
│   └── presets.js                 # 12座塔防与3类怪物的内联离线资产库
└── tests/
    ├── run_all.js                 # 单元测试与全量回归套件
    ├── palette.test.js            # 调色板测试
    ├── matrix.test.js             # SVG 校验测试
    ├── animator.test.js           # 动画时钟测试
    └── exporter.test.js           # 精灵图与导出测试
```

---

## 本地启动与体验

当前工程已运行端口 3000 的本地 HTTP 服务。在 TRAE 或本助手生成完成后，评委或用户可直接访问：

```
http://localhost:3000/pixelforge/index.html
```
