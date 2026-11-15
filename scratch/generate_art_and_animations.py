#!/usr/bin/env python3
"""
scratch/generate_art_and_animations.py
《余烬守夜》（EmbersKeep）美术与动画管线全量生成器：
1. 生成 9 个新增防御设施矢量卡牌（补齐 12 张核心防御卡牌）：
   - snare_trap, wind_repeater, thunder_ballista, thorns_barricade, inferno_shrine,
     frost_spire, mortar_cannon, toxic_catapult, void_beacon.
2. 生成第一章全部 3 大怪物的逐帧动作序列帧（Walk, Attack, Death）：
   - ashen_wolf (32x32, 4 walk, 3 attack, 3 death)
   - crawler (32x32, 4 walk, 3 attack, 3 death)
   - boss_wolf (48x48, 4 walk, 4 attack, 4 death)
3. 校验并调用管线栅格化为 1x 与 2x PNG，并拼接为水平 Spritesheet 带动效元数据。
"""

import os
import json
from pathlib import Path
from PIL import Image, ImageColor
import xml.etree.ElementTree as ET

BASE_DIR = Path("/Volumes/extpan/souceCode/EmbersKeep")
SVG_DIR = BASE_DIR / "assets" / "svg"
TEXTURES_DIR = BASE_DIR / "assets" / "textures"
SPRITESHEET_DIR = BASE_DIR / "assets" / "spritesheets"

# ==============================================================================
# 1. 12 张核心防御塔/建筑卡牌 SVG 矩阵定义
# ==============================================================================
TOWER_SVGS = {
    # 4. 捕兽棘刺陷阱
    "snare_trap": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <!-- 铁环底盘 -->
  <rect x="6" y="22" width="20" height="4" fill="#1C1824"/>
  <rect x="8" y="24" width="16" height="2" fill="#3D3448"/>
  <rect x="14" y="22" width="4" height="2" fill="#C89B3C"/>
  <!-- 铰链弹簧轴 -->
  <rect x="15" y="18" width="2" height="5" fill="#5C5266"/>
  <!-- 锯齿铁夹 (张开待击发态) -->
  <rect x="6" y="14" width="4" height="8" fill="#2C2636"/>
  <rect x="5" y="12" width="3" height="4" fill="#5C5266"/>
  <rect x="7" y="11" width="2" height="3" fill="#A69CB3"/>
  <rect x="22" y="14" width="4" height="8" fill="#2C2636"/>
  <rect x="24" y="12" width="3" height="4" fill="#5C5266"/>
  <rect x="23" y="11" width="2" height="3" fill="#A69CB3"/>
  <!-- 尖锐倒刺与血痕 -->
  <rect x="8" y="12" width="2" height="3" fill="#D94126"/>
  <rect x="22" y="12" width="2" height="3" fill="#D94126"/>
  <!-- 锁地链条 -->
  <rect x="3" y="25" width="4" height="2" fill="#5C5266"/>
  <rect x="25" y="25" width="4" height="2" fill="#5C5266"/>
</svg>""",

    # 5. 疾风连射弩
    "wind_repeater": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <!-- 石质基座 -->
  <rect x="6" y="24" width="20" height="6" fill="#15121B"/>
  <rect x="8" y="22" width="16" height="3" fill="#3D3448"/>
  <!-- 双弓臂中轴 -->
  <rect x="14" y="8" width="4" height="15" fill="#2C2636"/>
  <rect x="15" y="10" width="2" height="12" fill="#5EEAD4"/>
  <!-- 上层弓臂 (附疾风羽翎) -->
  <rect x="4" y="5" width="24" height="3" fill="#1F1A28"/>
  <rect x="6" y="7" width="20" height="2" fill="#5EEAD4"/>
  <rect x="2" y="4" width="3" height="3" fill="#5EEAD4"/>
  <rect x="27" y="4" width="3" height="3" fill="#5EEAD4"/>
  <!-- 下层双联副弓臂 -->
  <rect x="6" y="11" width="20" height="2" fill="#2C2636"/>
  <rect x="8" y="12" width="16" height="2" fill="#24A163"/>
  <!-- 双联箭道 -->
  <rect x="12" y="4" width="2" height="6" fill="#FAD65A"/>
  <rect x="18" y="4" width="2" height="6" fill="#FAD65A"/>
  <!-- 风核核心水晶 -->
  <rect x="14" y="13" width="4" height="4" fill="#5EEAD4"/>
  <rect x="15" y="14" width="2" height="2" fill="#FFFFFF"/>
</svg>""",

    # 6. 雷霆脉冲弩
    "thunder_ballista": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <!-- 重铁台座 -->
  <rect x="6" y="24" width="20" height="6" fill="#120F18"/>
  <rect x="8" y="22" width="16" height="3" fill="#2C2636"/>
  <!-- 蓄能线圈支架 -->
  <rect x="13" y="10" width="6" height="13" fill="#3D3448"/>
  <rect x="12" y="12" width="8" height="2" fill="#55A4DB"/>
  <rect x="12" y="16" width="8" height="2" fill="#55A4DB"/>
  <rect x="12" y="20" width="8" height="2" fill="#55A4DB"/>
  <!-- 导电重型铁臂 -->
  <rect x="3" y="6" width="26" height="3" fill="#1E1926"/>
  <rect x="5" y="8" width="22" height="2" fill="#4B3F5E"/>
  <!-- 电弧激发电极 -->
  <rect x="2" y="4" width="2" height="5" fill="#55A4DB"/>
  <rect x="28" y="4" width="2" height="5" fill="#55A4DB"/>
  <!-- 中央雷兽晶核 (电弧闪烁) -->
  <rect x="13" y="4" width="6" height="6" fill="#55A4DB"/>
  <rect x="14" y="5" width="4" height="4" fill="#BEE5FA"/>
  <rect x="15" y="6" width="2" height="2" fill="#FFFFFF"/>
  <rect x="15" y="2" width="2" height="3" fill="#55A4DB"/>
</svg>""",

    # 7. 荆棘岩壁
    "thorns_barricade": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <!-- 黑曜石厚重墙基 -->
  <rect x="3" y="10" width="26" height="18" fill="#181422"/>
  <rect x="4" y="12" width="24" height="15" fill="#282236"/>
  <!-- 石块勾缝与裂纹 -->
  <rect x="3" y="18" width="26" height="2" fill="#0D0B12"/>
  <rect x="15" y="12" width="2" height="7" fill="#0D0B12"/>
  <rect x="10" y="20" width="2" height="8" fill="#0D0B12"/>
  <rect x="22" y="20" width="2" height="8" fill="#0D0B12"/>
  <!-- 顶部凸字女墙垛口 -->
  <rect x="3" y="6" width="6" height="5" fill="#3D3448"/>
  <rect x="13" y="6" width="6" height="5" fill="#3D3448"/>
  <rect x="23" y="6" width="6" height="5" fill="#3D3448"/>
  <!-- 剧毒荆棘尖刺 (绿色与锋芒) -->
  <rect x="1" y="14" width="3" height="3" fill="#24A163"/>
  <rect x="0" y="15" width="2" height="1" fill="#5EEAD4"/>
  <rect x="28" y="14" width="3" height="3" fill="#24A163"/>
  <rect x="30" y="15" width="2" height="1" fill="#5EEAD4"/>
  <rect x="7" y="15" width="4" height="2" fill="#24A163"/>
  <rect x="17" y="22" width="4" height="2" fill="#24A163"/>
  <rect x="8" y="3" width="2" height="4" fill="#A69CB3"/>
  <rect x="18" y="3" width="2" height="4" fill="#A69CB3"/>
</svg>""",

    # 8. 焚天余烬坛
    "inferno_shrine": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <!-- 宏伟黑石底座 -->
  <rect x="4" y="25" width="24" height="6" fill="#140F1D"/>
  <rect x="6" y="22" width="20" height="3" fill="#2B2138"/>
  <rect x="8" y="18" width="16" height="4" fill="#1C1626"/>
  <!-- 熔岩火盆与赤铜包边 -->
  <rect x="4" y="12" width="24" height="6" fill="#3D304E"/>
  <rect x="6" y="13" width="20" height="2" fill="#C89B3C"/>
  <rect x="8" y="15" width="3" height="2" fill="#F28929"/>
  <rect x="21" y="15" width="3" height="2" fill="#F28929"/>
  <!-- 溢出的炽热岩浆 -->
  <rect x="11" y="17" width="2" height="6" fill="#D94126"/>
  <rect x="19" y="17" width="2" height="4" fill="#D94126"/>
  <!-- 滔天怒焰核心 -->
  <rect x="8" y="7" width="16" height="6" fill="#A12B2B"/>
  <rect x="10" y="4" width="12" height="6" fill="#D94126"/>
  <rect x="12" y="2" width="8" height="5" fill="#F28929"/>
  <rect x="14" y="0" width="4" height="4" fill="#FAD65A"/>
  <rect x="15" y="0" width="2" height="2" fill="#FFFFFF"/>
</svg>""",

    # 9. 寒霜凝结塔
    "frost_spire": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <!-- 永冻冰石基座 -->
  <rect x="6" y="25" width="20" height="6" fill="#0C1B2E"/>
  <rect x="8" y="22" width="16" height="3" fill="#1E3A5F"/>
  <!-- 寒霜符文台 -->
  <rect x="11" y="16" width="10" height="6" fill="#142C4B"/>
  <rect x="13" y="18" width="6" height="3" fill="#38BDF8"/>
  <!-- 尖锐幽蓝冰晶尖塔主体 -->
  <rect x="13" y="6" width="6" height="10" fill="#0284C7"/>
  <rect x="14" y="3" width="4" height="13" fill="#38BDF8"/>
  <rect x="15" y="1" width="2" height="15" fill="#E0F2FE"/>
  <!-- 悬浮侧翼冰棱 -->
  <rect x="8" y="10" width="3" height="8" fill="#0284C7"/>
  <rect x="9" y="12" width="1" height="4" fill="#BAE6FD"/>
  <rect x="21" y="10" width="3" height="8" fill="#0284C7"/>
  <rect x="22" y="12" width="1" height="4" fill="#BAE6FD"/>
  <!-- 冰霜粒子光晕 -->
  <rect x="15" y="0" width="2" height="2" fill="#FFFFFF"/>
</svg>""",

    # 10. 重型生铁臼炮
    "mortar_cannon": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <!-- 沉重原木炮架 -->
  <rect x="4" y="22" width="24" height="8" fill="#2E1C14"/>
  <rect x="6" y="20" width="20" height="3" fill="#4A2E20"/>
  <rect x="8" y="24" width="4" height="4" fill="#C89B3C"/>
  <rect x="20" y="24" width="4" height="4" fill="#C89B3C"/>
  <!-- 粗壮臼炮身管 (45度仰角) -->
  <rect x="10" y="11" width="12" height="10" fill="#1C1824"/>
  <rect x="8" y="9" width="14" height="6" fill="#3D3448"/>
  <rect x="7" y="6" width="14" height="5" fill="#5C5266"/>
  <!-- 宽大炮口与引信火星 -->
  <rect x="6" y="4" width="14" height="3" fill="#0D0B12"/>
  <rect x="8" y="5" width="10" height="2" fill="#F97316"/>
  <rect x="12" y="2" width="2" height="3" fill="#FAD65A"/>
  <rect x="13" y="1" width="1" height="2" fill="#FFFFFF"/>
  <!-- 备用炮弹堆 -->
  <rect x="24" y="18" width="4" height="4" fill="#1C1824"/>
  <rect x="25" y="15" width="3" height="3" fill="#3D3448"/>
</svg>""",

    # 11. 腐蚀毒液投石机
    "toxic_catapult": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <!-- 粗糙木质底座与车轴 -->
  <rect x="4" y="24" width="24" height="6" fill="#261A12"/>
  <rect x="6" y="26" width="5" height="4" fill="#140E0A"/>
  <rect x="21" y="26" width="5" height="4" fill="#140E0A"/>
  <!-- 支架立柱 -->
  <rect x="13" y="12" width="6" height="13" fill="#422C1F"/>
  <rect x="15" y="14" width="2" height="9" fill="#140E0A"/>
  <!-- 翘起的抛射长臂 -->
  <rect x="7" y="8" width="18" height="3" fill="#5E3F2D"/>
  <rect x="5" y="6" width="4" height="5" fill="#78350F"/>
  <!-- 装载的强酸毒液罐 -->
  <rect x="4" y="3" width="6" height="5" fill="#1E293B"/>
  <rect x="5" y="4" width="4" height="3" fill="#84CC16"/>
  <rect x="6" y="5" width="2" height="1" fill="#A3E635"/>
  <!-- 滴落的酸液滴 -->
  <rect x="5" y="9" width="2" height="2" fill="#84CC16"/>
  <!-- 配重铁箱 -->
  <rect x="23" y="10" width="5" height="6" fill="#1C1824"/>
</svg>""",

    # 12. 虚空引力信标
    "void_beacon": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <!-- 暗影基座 -->
  <rect x="8" y="25" width="16" height="6" fill="#110A1C"/>
  <rect x="10" y="22" width="12" height="3" fill="#26123D"/>
  <rect x="12" y="19" width="8" height="3" fill="#3B185F"/>
  <!-- 悬浮裂开的黑石柱身 -->
  <rect x="8" y="8" width="4" height="10" fill="#1A0F2B"/>
  <rect x="20" y="8" width="4" height="10" fill="#1A0F2B"/>
  <rect x="9" y="6" width="3" height="5" fill="#3B185F"/>
  <rect x="20" y="6" width="3" height="5" fill="#3B185F"/>
  <!-- 中央虚空引力黑洞核心 -->
  <rect x="13" y="9" width="6" height="6" fill="#1E0533"/>
  <rect x="14" y="10" width="4" height="4" fill="#7E22CE"/>
  <rect x="15" y="11" width="2" height="2" fill="#C084FC"/>
  <!-- 环绕重力符文光环 -->
  <rect x="6" y="11" width="2" height="2" fill="#A855F7"/>
  <rect x="24" y="11" width="2" height="2" fill="#A855F7"/>
  <rect x="15" y="4" width="2" height="2" fill="#C084FC"/>
</svg>"""
}

# ==============================================================================
# 2. 怪物多动作逐帧动画序列 (SVG 矩阵定义)
# ==============================================================================
# 灰烬狼 (Ashen Wolf): 32x32
# - walk (4帧): 迈步循环
# - attack (3帧): 压低扑击
# - death (3帧): 踉跄倒地消融
WOLF_ANIMATIONS = {
    "walk": [
        # Frame 0: 初始迈步，右前肢前探
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="20" y="8" width="6" height="5" fill="#2C2636"/>
  <rect x="26" y="10" width="3" height="3" fill="#1E1B24"/>
  <rect x="22" y="6" width="2" height="3" fill="#41394D"/>
  <rect x="23" y="9" width="2" height="2" fill="#F28929"/>
  <rect x="10" y="11" width="12" height="8" fill="#1E1B24"/>
  <rect x="8" y="10" width="10" height="3" fill="#41394D"/>
  <rect x="4" y="13" width="6" height="3" fill="#2C2636"/>
  <rect x="2" y="15" width="4" height="3" fill="#1E1B24"/>
  <rect x="11" y="19" width="3" height="7" fill="#121016"/>
  <rect x="19" y="19" width="3" height="7" fill="#121016"/>
  <rect x="7" y="21" width="3" height="6" fill="#2C2636"/>
  <rect x="23" y="21" width="3" height="6" fill="#2C2636"/>
</svg>""",
        # Frame 1: 提足中位，头部微低
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="20" y="9" width="6" height="5" fill="#2C2636"/>
  <rect x="26" y="11" width="3" height="3" fill="#1E1B24"/>
  <rect x="22" y="7" width="2" height="3" fill="#41394D"/>
  <rect x="23" y="10" width="2" height="2" fill="#F28929"/>
  <rect x="10" y="11" width="12" height="8" fill="#1E1B24"/>
  <rect x="8" y="10" width="10" height="3" fill="#41394D"/>
  <rect x="4" y="12" width="6" height="3" fill="#2C2636"/>
  <rect x="13" y="19" width="3" height="6" fill="#121016"/>
  <rect x="18" y="19" width="3" height="7" fill="#121016"/>
  <rect x="9" y="20" width="3" height="7" fill="#2C2636"/>
  <rect x="21" y="20" width="3" height="6" fill="#2C2636"/>
</svg>""",
        # Frame 2: 换腿伸展，左前肢跨出
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="20" y="8" width="6" height="5" fill="#2C2636"/>
  <rect x="26" y="10" width="3" height="3" fill="#1E1B24"/>
  <rect x="22" y="6" width="2" height="3" fill="#41394D"/>
  <rect x="23" y="9" width="2" height="2" fill="#F28929"/>
  <rect x="10" y="11" width="12" height="8" fill="#1E1B24"/>
  <rect x="8" y="10" width="10" height="3" fill="#41394D"/>
  <rect x="4" y="13" width="6" height="3" fill="#2C2636"/>
  <rect x="14" y="19" width="3" height="7" fill="#121016"/>
  <rect x="17" y="19" width="3" height="7" fill="#121016"/>
  <rect x="10" y="21" width="3" height="6" fill="#2C2636"/>
  <rect x="21" y="21" width="3" height="6" fill="#2C2636"/>
</svg>""",
        # Frame 3: 收腿挺立，尾部上翘
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="20" y="7" width="6" height="5" fill="#2C2636"/>
  <rect x="26" y="9" width="3" height="3" fill="#1E1B24"/>
  <rect x="22" y="5" width="2" height="3" fill="#41394D"/>
  <rect x="23" y="8" width="2" height="2" fill="#F28929"/>
  <rect x="10" y="10" width="12" height="8" fill="#1E1B24"/>
  <rect x="8" y="9" width="10" height="3" fill="#41394D"/>
  <rect x="3" y="11" width="6" height="3" fill="#2C2636"/>
  <rect x="12" y="18" width="3" height="8" fill="#121016"/>
  <rect x="20" y="18" width="3" height="8" fill="#121016"/>
  <rect x="8" y="20" width="3" height="7" fill="#2C2636"/>
  <rect x="23" y="20" width="3" height="7" fill="#2C2636"/>
</svg>"""
    ],
    "attack": [
        # Frame 0: 伏身蓄力，狼吻大张
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="19" y="12" width="7" height="5" fill="#2C2636"/>
  <rect x="26" y="13" width="4" height="4" fill="#A12B2B"/>
  <rect x="21" y="10" width="2" height="3" fill="#41394D"/>
  <rect x="22" y="13" width="2" height="2" fill="#FAD65A"/>
  <rect x="9" y="14" width="12" height="7" fill="#1E1B24"/>
  <rect x="3" y="16" width="6" height="3" fill="#2C2636"/>
  <rect x="8" y="21" width="4" height="6" fill="#121016"/>
  <rect x="19" y="21" width="4" height="6" fill="#121016"/>
</svg>""",
        # Frame 1: 飞扑撕咬，血芒破空
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="22" y="7" width="8" height="6" fill="#2C2636"/>
  <rect x="28" y="9" width="4" height="5" fill="#E11D48"/>
  <rect x="24" y="8" width="2" height="2" fill="#FFFFFF"/>
  <rect x="12" y="9" width="12" height="8" fill="#1E1B24"/>
  <rect x="5" y="11" width="7" height="3" fill="#2C2636"/>
  <rect x="13" y="17" width="5" height="5" fill="#121016"/>
  <rect x="22" y="15" width="6" height="4" fill="#D94126"/>
</svg>""",
        # Frame 2: 落地重踏，余震爪痕
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="21" y="9" width="7" height="5" fill="#2C2636"/>
  <rect x="27" y="11" width="3" height="3" fill="#1E1B24"/>
  <rect x="23" y="10" width="2" height="2" fill="#F28929"/>
  <rect x="11" y="11" width="12" height="8" fill="#1E1B24"/>
  <rect x="4" y="14" width="7" height="3" fill="#2C2636"/>
  <rect x="12" y="19" width="4" height="7" fill="#121016"/>
  <rect x="22" y="19" width="4" height="7" fill="#121016"/>
  <rect x="23" y="26" width="4" height="1" fill="#E11D48"/>
</svg>"""
    ],
    "death": [
        # Frame 0: 受创仰头后仰
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="18" y="5" width="6" height="6" fill="#3D3448"/>
  <rect x="22" y="3" width="3" height="4" fill="#A12B2B"/>
  <rect x="9" y="11" width="11" height="8" fill="#2C2636"/>
  <rect x="10" y="19" width="3" height="6" fill="#1E1B24"/>
  <rect x="17" y="19" width="3" height="5" fill="#1E1B24"/>
  <rect x="14" y="13" width="2" height="4" fill="#F28929"/>
</svg>""",
        # Frame 1: 肢体瘫软伏地
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="18" y="17" width="7" height="5" fill="#2C2636"/>
  <rect x="8" y="19" width="12" height="5" fill="#1E1B24"/>
  <rect x="4" y="21" width="5" height="3" fill="#121016"/>
  <rect x="10" y="24" width="14" height="2" fill="#0D0B12"/>
  <rect x="14" y="18" width="4" height="2" fill="#D94126"/>
</svg>""",
        # Frame 2: 化作残烬碎屑与青烟飘散
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="6" y="25" width="18" height="2" fill="#121016"/>
  <rect x="9" y="23" width="4" height="2" fill="#2C2636"/>
  <rect x="17" y="22" width="3" height="2" fill="#2C2636"/>
  <rect x="11" y="19" width="2" height="2" fill="#F28929"/>
  <rect x="16" y="16" width="2" height="2" fill="#FAD65A"/>
  <rect x="14" y="12" width="1" height="2" fill="#FFFFFF"/>
</svg>"""
    ]
}

# 爬行者 (Crawler): 32x32
CRAWLER_ANIMATIONS = {
    "walk": [
        # Frame 0: 节肢伸展，头部向前
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="20" y="15" width="6" height="4" fill="#243026"/>
  <rect x="25" y="16" width="3" height="3" fill="#151C16"/>
  <rect x="23" y="15" width="2" height="2" fill="#84CC16"/>
  <rect x="8" y="13" width="13" height="8" fill="#1E2B20"/>
  <rect x="9" y="11" width="10" height="3" fill="#3D5240"/>
  <rect x="6" y="18" width="4" height="8" fill="#151C16"/>
  <rect x="12" y="19" width="3" height="7" fill="#151C16"/>
  <rect x="18" y="18" width="4" height="8" fill="#151C16"/>
</svg>""",
        # Frame 1: 中肢抬起，腹部蠕动
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="20" y="16" width="6" height="4" fill="#243026"/>
  <rect x="25" y="17" width="3" height="3" fill="#151C16"/>
  <rect x="23" y="16" width="2" height="2" fill="#84CC16"/>
  <rect x="8" y="12" width="13" height="8" fill="#1E2B20"/>
  <rect x="9" y="10" width="10" height="3" fill="#3D5240"/>
  <rect x="7" y="19" width="3" height="7" fill="#151C16"/>
  <rect x="12" y="17" width="3" height="6" fill="#151C16"/>
  <rect x="17" y="19" width="3" height="7" fill="#151C16"/>
</svg>""",
        # Frame 2: 反向踏步，节肢交替
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="20" y="15" width="6" height="4" fill="#243026"/>
  <rect x="25" y="16" width="3" height="3" fill="#151C16"/>
  <rect x="23" y="15" width="2" height="2" fill="#84CC16"/>
  <rect x="8" y="13" width="13" height="8" fill="#1E2B20"/>
  <rect x="9" y="11" width="10" height="3" fill="#3D5240"/>
  <rect x="8" y="19" width="3" height="7" fill="#151C16"/>
  <rect x="14" y="19" width="3" height="7" fill="#151C16"/>
  <rect x="19" y="17" width="3" height="8" fill="#151C16"/>
</svg>""",
        # Frame 3: 快速向前收腹
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="20" y="14" width="6" height="4" fill="#243026"/>
  <rect x="25" y="15" width="3" height="3" fill="#151C16"/>
  <rect x="23" y="14" width="2" height="2" fill="#84CC16"/>
  <rect x="8" y="12" width="13" height="8" fill="#1E2B20"/>
  <rect x="9" y="10" width="10" height="3" fill="#3D5240"/>
  <rect x="6" y="18" width="4" height="8" fill="#151C16"/>
  <rect x="13" y="18" width="3" height="8" fill="#151C16"/>
  <rect x="18" y="18" width="4" height="8" fill="#151C16"/>
</svg>"""
    ],
    "attack": [
        # Frame 0: 巨颚扬起，酸液充盈
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="18" y="11" width="6" height="5" fill="#243026"/>
  <rect x="23" y="9" width="4" height="4" fill="#84CC16"/>
  <rect x="26" y="12" width="3" height="3" fill="#4D7C0F"/>
  <rect x="7" y="14" width="13" height="8" fill="#1E2B20"/>
  <rect x="6" y="20" width="4" height="7" fill="#151C16"/>
  <rect x="16" y="20" width="4" height="7" fill="#151C16"/>
</svg>""",
        # Frame 1: 尖钳猛击，酸液喷溅
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="22" y="13" width="8" height="6" fill="#243026"/>
  <rect x="28" y="14" width="4" height="5" fill="#A3E635"/>
  <rect x="9" y="13" width="14" height="8" fill="#1E2B20"/>
  <rect x="10" y="21" width="4" height="6" fill="#151C16"/>
  <rect x="20" y="19" width="5" height="7" fill="#151C16"/>
  <rect x="29" y="19" width="3" height="3" fill="#84CC16"/>
</svg>""",
        # Frame 2: 收力回归潜伏态
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="20" y="15" width="6" height="4" fill="#243026"/>
  <rect x="25" y="16" width="3" height="3" fill="#151C16"/>
  <rect x="8" y="14" width="13" height="8" fill="#1E2B20"/>
  <rect x="7" y="20" width="4" height="6" fill="#151C16"/>
  <rect x="17" y="20" width="4" height="6" fill="#151C16"/>
</svg>"""
    ],
    "death": [
        # Frame 0: 坚壳碎裂
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="17" y="13" width="7" height="6" fill="#3D5240"/>
  <rect x="6" y="15" width="12" height="8" fill="#243026"/>
  <rect x="11" y="17" width="2" height="4" fill="#84CC16"/>
  <rect x="15" y="16" width="2" height="5" fill="#84CC16"/>
  <rect x="5" y="23" width="16" height="2" fill="#151C16"/>
</svg>""",
        # Frame 1: 节肢蜷缩碎裂
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="8" y="21" width="16" height="5" fill="#151C16"/>
  <rect x="10" y="19" width="8" height="3" fill="#243026"/>
  <rect x="12" y="22" width="4" height="3" fill="#84CC16"/>
</svg>""",
        # Frame 2: 化为腐殖残渣
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <rect x="7" y="25" width="18" height="2" fill="#0D120E"/>
  <rect x="11" y="24" width="6" height="2" fill="#151C16"/>
  <rect x="14" y="22" width="2" height="2" fill="#4D7C0F"/>
</svg>"""
    ]
}

# 狼首领 (Boss Wolf Alpha): 48x48
BOSS_WOLF_ANIMATIONS = {
    "walk": [
        # Frame 0: 霸气踏步，背部天穹碎片光芒闪烁
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
  <!-- 首领巨角与凶煞狼面 -->
  <rect x="30" y="10" width="10" height="8" fill="#2C2636"/>
  <rect x="39" y="13" width="5" height="5" fill="#1A1624"/>
  <rect x="33" y="7" width="3" height="4" fill="#E11D48"/>
  <rect x="34" y="12" width="3" height="3" fill="#FAD65A"/>
  <!-- 魁梧身躯与燃烧骨刺 -->
  <rect x="14" y="14" width="18" height="13" fill="#1E1B24"/>
  <rect x="10" y="12" width="16" height="5" fill="#41394D"/>
  <rect x="16" y="8" width="4" height="5" fill="#D94126"/>
  <rect x="22" y="9" width="4" height="4" fill="#D94126"/>
  <!-- 胸口镶嵌的天穹炉心碎片 -->
  <rect x="25" y="17" width="4" height="4" fill="#FAD65A"/>
  <rect x="26" y="18" width="2" height="2" fill="#FFFFFF"/>
  <!-- 雄壮巨爪 (迈步) -->
  <rect x="15" y="27" width="5" height="11" fill="#121016"/>
  <rect x="27" y="27" width="5" height="11" fill="#121016"/>
  <rect x="10" y="30" width="4" height="9" fill="#2C2636"/>
  <rect x="33" y="30" width="4" height="9" fill="#2C2636"/>
  <rect x="15" y="37" width="5" height="2" fill="#E11D48"/>
  <rect x="27" y="37" width="5" height="2" fill="#E11D48"/>
  <!-- 狂风残影巨尾 -->
  <rect x="5" y="17" width="9" height="5" fill="#2C2636"/>
  <rect x="2" y="20" width="6" height="5" fill="#121016"/>
</svg>""",
        # Frame 1: 沉重蓄步，身躯下潜
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
  <rect x="30" y="12" width="10" height="8" fill="#2C2636"/>
  <rect x="39" y="15" width="5" height="5" fill="#1A1624"/>
  <rect x="33" y="9" width="3" height="4" fill="#E11D48"/>
  <rect x="34" y="14" width="3" height="3" fill="#FAD65A"/>
  <rect x="14" y="15" width="18" height="13" fill="#1E1B24"/>
  <rect x="10" y="13" width="16" height="5" fill="#41394D"/>
  <rect x="16" y="9" width="4" height="5" fill="#D94126"/>
  <rect x="25" y="18" width="4" height="4" fill="#FAD65A"/>
  <rect x="17" y="28" width="5" height="10" fill="#121016"/>
  <rect x="26" y="28" width="5" height="10" fill="#121016"/>
  <rect x="12" y="30" width="4" height="9" fill="#2C2636"/>
  <rect x="31" y="30" width="4" height="9" fill="#2C2636"/>
  <rect x="5" y="16" width="9" height="5" fill="#2C2636"/>
</svg>""",
        # Frame 2: 大步跨出，炉心炽热
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
  <rect x="30" y="10" width="10" height="8" fill="#2C2636"/>
  <rect x="39" y="13" width="5" height="5" fill="#1A1624"/>
  <rect x="33" y="7" width="3" height="4" fill="#E11D48"/>
  <rect x="34" y="12" width="3" height="3" fill="#FAD65A"/>
  <rect x="14" y="14" width="18" height="13" fill="#1E1B24"/>
  <rect x="10" y="12" width="16" height="5" fill="#41394D"/>
  <rect x="16" y="8" width="4" height="5" fill="#D94126"/>
  <rect x="22" y="9" width="4" height="4" fill="#D94126"/>
  <rect x="25" y="17" width="4" height="4" fill="#FAD65A"/>
  <rect x="26" y="18" width="2" height="2" fill="#FFFFFF"/>
  <rect x="19" y="27" width="5" height="11" fill="#121016"/>
  <rect x="24" y="27" width="5" height="11" fill="#121016"/>
  <rect x="14" y="31" width="4" height="8" fill="#2C2636"/>
  <rect x="30" y="31" width="4" height="8" fill="#2C2636"/>
  <rect x="19" y="37" width="5" height="2" fill="#E11D48"/>
  <rect x="5" y="18" width="9" height="5" fill="#2C2636"/>
</svg>""",
        # Frame 3: 昂首阔步，王者威压
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
  <rect x="30" y="9" width="10" height="8" fill="#2C2636"/>
  <rect x="39" y="12" width="5" height="5" fill="#1A1624"/>
  <rect x="33" y="6" width="3" height="4" fill="#E11D48"/>
  <rect x="34" y="11" width="3" height="3" fill="#FAD65A"/>
  <rect x="14" y="13" width="18" height="13" fill="#1E1B24"/>
  <rect x="10" y="11" width="16" height="5" fill="#41394D"/>
  <rect x="16" y="7" width="4" height="5" fill="#D94126"/>
  <rect x="25" y="16" width="4" height="4" fill="#FAD65A"/>
  <rect x="16" y="26" width="5" height="12" fill="#121016"/>
  <rect x="28" y="26" width="5" height="12" fill="#121016"/>
  <rect x="11" y="29" width="4" height="10" fill="#2C2636"/>
  <rect x="33" y="29" width="4" height="10" fill="#2C2636"/>
  <rect x="4" y="15" width="10" height="5" fill="#2C2636"/>
</svg>"""
    ],
    "attack": [
        # Frame 0: 仰天长啸蓄力
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
  <rect x="31" y="6" width="9" height="10" fill="#2C2636"/>
  <rect x="38" y="4" width="6" height="6" fill="#D94126"/>
  <rect x="33" y="9" width="3" height="3" fill="#FAD65A"/>
  <rect x="14" y="16" width="18" height="12" fill="#1E1B24"/>
  <rect x="24" y="18" width="5" height="5" fill="#FAD65A"/>
  <rect x="13" y="28" width="6" height="10" fill="#121016"/>
  <rect x="27" y="28" width="6" height="10" fill="#121016"/>
</svg>""",
        # Frame 1: 疾步狂暴前扑
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
  <rect x="34" y="12" width="10" height="8" fill="#2C2636"/>
  <rect x="42" y="14" width="5" height="6" fill="#E11D48"/>
  <rect x="18" y="14" width="18" height="11" fill="#1E1B24"/>
  <rect x="28" y="16" width="5" height="5" fill="#FFFFFF"/>
  <rect x="14" y="25" width="7" height="9" fill="#121016"/>
  <rect x="30" y="24" width="8" height="7" fill="#E11D48"/>
</svg>""",
        # Frame 2: 撼地狂爪撕裂 (爆发大范围血光裂痕)
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
  <rect x="32" y="14" width="10" height="8" fill="#2C2636"/>
  <rect x="40" y="16" width="6" height="6" fill="#E11D48"/>
  <rect x="16" y="16" width="18" height="12" fill="#1E1B24"/>
  <rect x="16" y="28" width="6" height="10" fill="#121016"/>
  <rect x="32" y="26" width="8" height="12" fill="#E11D48"/>
  <rect x="34" y="38" width="12" height="3" fill="#FAD65A"/>
  <rect x="38" y="40" width="8" height="2" fill="#FFFFFF"/>
</svg>""",
        # Frame 3: 落地狂暴低吼复位
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
  <rect x="30" y="11" width="10" height="8" fill="#2C2636"/>
  <rect x="39" y="14" width="5" height="5" fill="#1A1624"/>
  <rect x="34" y="13" width="3" height="3" fill="#FAD65A"/>
  <rect x="14" y="14" width="18" height="13" fill="#1E1B24"/>
  <rect x="25" y="17" width="4" height="4" fill="#FAD65A"/>
  <rect x="15" y="27" width="5" height="11" fill="#121016"/>
  <rect x="28" y="27" width="5" height="11" fill="#121016"/>
</svg>"""
    ],
    "death": [
        # Frame 0: 炉心暴走，周身开裂
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
  <rect x="28" y="6" width="10" height="8" fill="#3D3448"/>
  <rect x="36" y="4" width="6" height="6" fill="#E11D48"/>
  <rect x="14" y="14" width="18" height="13" fill="#2C2636"/>
  <rect x="23" y="15" width="8" height="8" fill="#FAD65A"/>
  <rect x="25" y="17" width="4" height="4" fill="#FFFFFF"/>
  <rect x="15" y="27" width="5" height="10" fill="#1E1B24"/>
  <rect x="28" y="27" width="5" height="10" fill="#1E1B24"/>
</svg>""",
        # Frame 1: 轰然跪地，碎片脱离
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
  <rect x="28" y="19" width="10" height="7" fill="#2C2636"/>
  <rect x="12" y="21" width="18" height="9" fill="#1E1B24"/>
  <rect x="23" y="11" width="6" height="6" fill="#FAD65A"/>
  <rect x="24" y="12" width="4" height="4" fill="#FFFFFF"/>
  <rect x="14" y="30" width="18" height="4" fill="#121016"/>
</svg>""",
        # Frame 2: 首领肉身坍塌消散
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
  <rect x="10" y="32" width="24" height="4" fill="#121016"/>
  <rect x="14" y="29" width="16" height="4" fill="#2C2636"/>
  <rect x="23" y="16" width="6" height="6" fill="#FAD65A"/>
  <rect x="24" y="17" width="4" height="4" fill="#FFFFFF"/>
  <rect x="16" y="24" width="3" height="3" fill="#D94126"/>
  <rect x="29" y="23" width="3" height="3" fill="#D94126"/>
</svg>""",
        # Frame 3: 肉身完全化灰，唯留璀璨天穹炉心碎片升腾！
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
  <rect x="8" y="35" width="28" height="2" fill="#0D0B12"/>
  <rect x="13" y="33" width="8" height="2" fill="#1E1B24"/>
  <rect x="25" y="33" width="8" height="2" fill="#1E1B24"/>
  <!-- 升起的天穹碎片光辉 -->
  <rect x="21" y="18" width="8" height="8" fill="#F28929"/>
  <rect x="22" y="19" width="6" height="6" fill="#FAD65A"/>
  <rect x="23" y="20" width="4" height="4" fill="#FFFFFF"/>
  <rect x="19" y="21" width="2" height="2" fill="#FAD65A"/>
  <rect x="29" y="21" width="2" height="2" fill="#FAD65A"/>
  <rect x="24" y="15" width="2" height="2" fill="#FFFFFF"/>
</svg>"""
    ]
}

# ==============================================================================
# 3. 栅格化与 Spritesheet 拼接引擎
# ==============================================================================
def parse_and_rasterize_svg(svg_content, out_path, scale=1):
    root = ET.fromstring(svg_content)
    viewbox = root.attrib.get("viewBox", "0 0 32 32")
    parts = [float(x) for x in viewbox.replace(",", " ").split()]
    vb_w, vb_h = int(parts[2]), int(parts[3])

    img_w, img_h = vb_w * scale, vb_h * scale
    img = Image.new("RGBA", (img_w, img_h), (0, 0, 0, 0))

    for elem in root.iter():
        tag = elem.tag.split("}")[-1]
        if tag == "rect":
            x = int(float(elem.attrib.get("x", 0)))
            y = int(float(elem.attrib.get("y", 0)))
            w = int(float(elem.attrib.get("width", 1)))
            h = int(float(elem.attrib.get("height", 1)))
            fill = elem.attrib.get("fill", "#FFFFFF")
            try:
                rgba = ImageColor.getrgb(fill)
                if len(rgba) == 3:
                    rgba = (rgba[0], rgba[1], rgba[2], 255)
            except Exception:
                rgba = (255, 255, 255, 255)

            for px in range(x * scale, (x + w) * scale):
                for py in range(y * scale, (y + h) * scale):
                    if 0 <= px < img_w and 0 <= py < img_h:
                        img.putpixel((px, py), rgba)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, "PNG")
    return img

def stitch_spritesheet(images_list, out_sheet_path):
    if not images_list:
        return
    frame_w, frame_h = images_list[0].size
    total_w = frame_w * len(images_list)
    sheet = Image.new("RGBA", (total_w, frame_h), (0, 0, 0, 0))

    for idx, frame in enumerate(images_list):
        sheet.paste(frame, (idx * frame_w, 0))

    out_sheet_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_sheet_path, "PNG")
    print(f"  [Sheet OK] {out_sheet_path.name}: {len(images_list)} 帧 -> {total_w}x{frame_h}")

def main():
    print("=" * 70)
    print("开始生成《余烬守夜》12张防御卡牌与第一章怪物逐帧动画资产...")
    print("=" * 70)

    # 1. 生成 9 个新增防御设施 SVG 与 PNG
    print("\n[Step 1] 生成 9 个新增防御塔卡牌矢量与位图资产...")
    for tower_id, svg_xml in TOWER_SVGS.items():
        svg_file = SVG_DIR / "towers" / f"{tower_id}.svg"
        svg_file.parent.mkdir(parents=True, exist_ok=True)
        svg_file.write_text(svg_xml.strip(), encoding="utf-8")

        png_1x = TEXTURES_DIR / "1x" / "towers" / f"{tower_id}.png"
        png_2x = TEXTURES_DIR / "2x" / "towers" / f"{tower_id}.png"
        parse_and_rasterize_svg(svg_xml, png_1x, scale=1)
        parse_and_rasterize_svg(svg_xml, png_2x, scale=2)
        print(f"  [Tower OK] {tower_id} (SVG, 1x/2x PNG 已完成)")

    # 2. 生成怪物逐帧动画
    print("\n[Step 2] 批量生成灰烬狼、爬行者、Boss狼首领逐帧动画与精灵图册...")
    monster_catalog = {
        "ashen_wolf": (WOLF_ANIMATIONS, 32),
        "crawler": (CRAWLER_ANIMATIONS, 32),
        "boss_wolf": (BOSS_WOLF_ANIMATIONS, 48)
    }

    metadata = {}

    for mob_name, (anim_dict, base_size) in monster_catalog.items():
        metadata[mob_name] = {}
        for action_name, frames in anim_dict.items():
            frame_imgs_1x = []
            frame_imgs_2x = []

            for f_idx, frame_svg in enumerate(frames):
                svg_file = SVG_DIR / "animations" / mob_name / action_name / f"frame_{f_idx}.svg"
                svg_file.parent.mkdir(parents=True, exist_ok=True)
                svg_file.write_text(frame_svg.strip(), encoding="utf-8")

                png_1x = TEXTURES_DIR / "1x" / "animations" / mob_name / action_name / f"frame_{f_idx}.png"
                png_2x = TEXTURES_DIR / "2x" / "animations" / mob_name / action_name / f"frame_{f_idx}.png"

                im1 = parse_and_rasterize_svg(frame_svg, png_1x, scale=1)
                im2 = parse_and_rasterize_svg(frame_svg, png_2x, scale=2)
                frame_imgs_1x.append(im1)
                frame_imgs_2x.append(im2)

            # 拼接水平 Spritesheet (1x & 2x)
            sheet_1x = SPRITESHEET_DIR / f"{mob_name}_{action_name}_1x.png"
            sheet_2x = SPRITESHEET_DIR / f"{mob_name}_{action_name}_2x.png"
            stitch_spritesheet(frame_imgs_1x, sheet_1x)
            stitch_spritesheet(frame_imgs_2x, sheet_2x)

            metadata[mob_name][action_name] = {
                "frames_count": len(frames),
                "frame_width": base_size,
                "frame_height": base_size,
                "spritesheet_1x": f"assets/spritesheets/{mob_name}_{action_name}_1x.png",
                "spritesheet_2x": f"assets/spritesheets/{mob_name}_{action_name}_2x.png",
                "frame_rate": 6 if action_name == "walk" else 8
            }

    # 保存动画元数据表
    anim_meta_file = BASE_DIR / "data" / "animations_config.json"
    anim_meta_file.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n[Step 3] 动画元数据已保存至: {anim_meta_file}")

    print("\n" + "=" * 70)
    print("全量生成完成！共生成 12 张核心塔卡牌 + 3大怪物共29帧逐帧动画与精灵图册！")
    print("=" * 70)

if __name__ == "__main__":
    main()
