# 《余烬守夜》（EmbersKeep）像素美术规范与 AI SVG 生产管线

## 一、像素风视觉规范

### 1. 分辨率标准与基准网格
- **基础设计网格**：$32 \times 32\text{ px}$
- **图标与材料（核心/符文/道具）**：$32 \times 32\text{ px}$
- **小型与普通怪物**：$32 \times 32\text{ px}$ 或 $48 \times 48\text{ px}$
- **防御设施（箭塔/祭坛/陷阱/城墙）**：$48 \times 48\text{ px}$ 或 $64 \times 64\text{ px}$
- **精英怪与首领（Boss）**：$96 \times 96\text{ px}$ 或 $128 \times 128\text{ px}$

### 2. 标准色盘（Embers Dark Fantasy 16 Palette）
为保证 AI 生成的所有素材统一色调，所有生成结果需对其映射或聚类：
- **深色暗部**：`#121016` (极夜黑), `#1E1B24` (冷炭黑), `#2C2636` (暗石灰), `#41394D` (铁影)
- **铁与石**：`#5C5266` (冷铁), `#7C728A` (铸铁灰), `#A69CB3` (冷银)
- **余烬火光**：`#5E1B1B` (凝固血褐), `#A12B2B` (暗红), `#D64E2A` (熔岩红), `#F28929` (余烬橙), `#FAD65A` (炽火金)
- **奥术雷霜**：`#1D3B5C` (渊蓝), `#2B6BA6` (雷蓝), `#55A4DB` (冰霜蓝), `#BEE5FA` (辉光亮蓝)

---

## 二、AI 生产工作流规范

### 1. 静态素材 SVG 结构标准
所有通过 AI 生成的 SVG 图标必须符合以下规范：
1. 声明 `shape-rendering="crispEdges"`，确保像素边缘不产生次像素抗锯齿模糊。
2. 内部结构严格由 `<rect>` 像素块或合并矩形组成。
3. 根节点包含透明背景（无背景矩形填充），方便合成。

#### 示例：32x32 基础弩塔 SVG
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <!-- 弩机弓臂与木架 -->
  <rect x="4" y="6" width="24" height="2" fill="#2C2636"/>
  <rect x="6" y="8" width="20" height="2" fill="#5C5266"/>
  <rect x="14" y="4" width="4" height="8" fill="#7C728A"/>
  <rect x="15" y="2" width="2" height="2" fill="#D64E2A"/>
  <!-- 支撑木台与转轴 -->
  <rect x="13" y="12" width="6" height="4" fill="#41394D"/>
  <rect x="11" y="16" width="10" height="4" fill="#2C2636"/>
  <!-- 石质底座 -->
  <rect x="8" y="20" width="16" height="6" fill="#1E1B24"/>
  <rect x="10" y="22" width="12" height="2" fill="#41394D"/>
  <rect x="6" y="26" width="20" height="4" fill="#121016"/>
  <rect x="8" y="28" width="16" height="2" fill="#2C2636"/>
</svg>
```

### 2. 动态角色与逐帧动画（PNG 精灵图）
- 角色行走、攻击、死亡帧采用 PNG Spritesheet 交付。
- 逐帧尺寸必须为网格的整数倍（如 $32\times32$, $48\times48$）。
- 排布规范为单行动作带（Horizontal Strip）或规则矩阵。

---

## 三、AI 生成提示词模版 (Prompt Templates)

### 模版 1：防御设施（塔防卡牌）
```text
Role: Pixel art icon designer for dark fantasy game.
Output: Clean pixel art SVG with crispEdges, viewBox="0 0 32 32", transparent background.
Subject: [设施名称, 如 "Crossbow Turret made of blackened wood, iron bindings and an ember glowing core"].
Style: 16-bit dark fantasy pixel art, orthographic front-top view, distinct dark outlines, warm ember orange and cold iron gray highlights, clean geometric pixel blocks with rect elements, no gradients, no curved paths.
```

### 模版 2：怪物敌人精灵 (Spritesheet / Idle)
```text
Role: Pixel art game animator.
Subject: [怪物名称, 如 "Ashen Wolf, quadruped predator formed of smoke, charcoal bones and glowing orange eyes"].
Specification: 32x32 pixel art sprite, dark fantasy aesthetic, isolated on transparent background, 1px dark charcoal outline, 4-frame idle or walk animation strip side view, 16-color dark fantasy palette.
```

### 模版 3：怪物核心与掉落物材料
```text
Role: Game UI icon artist.
Subject: [核心名称, 如 "Thunder Beast Core, glowing crackling arcane blue crystal infused with lightning energy"].
Specification: 32x32 SVG vector pixel art, sharp crisp edges, transparent background, glowing core runes, dark outline, clean rect matrix.
```

---

## 四、自动化检查与构建转换脚本设计

在工程中配置脚本 `scripts/validate_and_rasterize_assets.py`：
1. **尺寸合规性校验**：检测 SVG/PNG 尺寸是否为 $32, 48, 64, 96$ 网格。
2. **边缘无模糊检测**：检测 SVG 是否配置 `crispEdges`。
3. **最近邻采样栅格化**：自动调用转换工具将 SVG 导出为指定倍率（$1\times, 2\times, 4\times$）的近邻采样 PNG，直接供游戏引擎读取。
