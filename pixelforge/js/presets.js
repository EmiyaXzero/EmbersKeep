/**
 * PixelForge 内置离线预设资产库 (presets.js)
 * ---------------------------------------------------------------
 * 由 EmbersKeep 工程 assets/svg/ 中的真实美术资产内联生成：
 *   · 12 款防御塔 (32×32，单帧矢量像素矩阵)
 *   · 3 款怪物   (灰烬狼 10 帧 / 灰潮爬行者 10 帧 / 灰狼首领 12 帧，共 32 帧)
 * 全部数据内联在本文件中，页面运行时不发起任何网络请求，离线即可完整演示。
 */

const freeze = (value) => Object.freeze(value);

/** 12 款防御塔预设 */
export const TOWERS = freeze([
  freeze({
    id: "crossbow_turret",
    name: "基础弩箭塔",
    type: 'tower',
    category: "tower",
    role: "物理单体输出",
    width: 32,
    height: 32,
    stats: freeze({"damage": 26, "attackSpeed": 1.2, "range": 220}),
    description: "发射实木弩箭的标准防御塔，攻守平衡。",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <!-- 弩臂横梁 -->
  <rect x="4" y="6" width="24" height="2" fill="#2C2636"/>
  <rect x="6" y="8" width="20" height="2" fill="#5C5266"/>
  <rect x="14" y="4" width="4" height="8" fill="#7C728A"/>
  <!-- 弩弦与核心光晕 -->
  <rect x="5" y="8" width="2" height="6" fill="#A69CB3"/>
  <rect x="25" y="8" width="2" height="6" fill="#A69CB3"/>
  <rect x="15" y="2" width="2" height="3" fill="#F28929"/>
  <rect x="15" y="5" width="2" height="2" fill="#FAD65A"/>
  <!-- 瞄准与转轴 -->
  <rect x="13" y="12" width="6" height="4" fill="#41394D"/>
  <rect x="11" y="16" width="10" height="4" fill="#2C2636"/>
  <!-- 石质基座与支架 -->
  <rect x="8" y="20" width="16" height="6" fill="#1E1B24"/>
  <rect x="10" y="22" width="12" height="2" fill="#5C5266"/>
  <rect x="6" y="26" width="20" height="4" fill="#121016"/>
  <rect x="8" y="28" width="16" height="2" fill="#2C2636"/>
</svg>`
  }),
  freeze({
    id: "flame_altar",
    name: "火焰祭坛",
    type: 'tower',
    category: "tower",
    role: "扇形范围灼烧",
    width: 32,
    height: 32,
    stats: freeze({"damage": 14, "attackSpeed": 0.6, "range": 170, "aoeRadius": 65}),
    description: "向前方扇形区域持续喷射炉火余烬，极克密集群怪。",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <!-- 炉火祭坛：石质台座与燃烧熔岩火盆 -->
  <rect x="6" y="24" width="20" height="6" fill="#1E1B24"/>
  <rect x="8" y="22" width="16" height="2" fill="#41394D"/>
  <rect x="10" y="16" width="12" height="6" fill="#2C2636"/>
  <rect x="8" y="14" width="16" height="2" fill="#5C5266"/>
  <!-- 火盆边缘与符文 -->
  <rect x="6" y="10" width="20" height="4" fill="#41394D"/>
  <rect x="8" y="11" width="2" height="2" fill="#F28929"/>
  <rect x="22" y="11" width="2" height="2" fill="#F28929"/>
  <!-- 烈焰核心 -->
  <rect x="10" y="6" width="12" height="4" fill="#A12B2B"/>
  <rect x="12" y="4" width="8" height="4" fill="#D64E2A"/>
  <rect x="13" y="2" width="6" height="4" fill="#F28929"/>
  <rect x="14" y="1" width="4" height="3" fill="#FAD65A"/>
  <rect x="15" y="0" width="2" height="2" fill="#FFFFFF"/>
</svg>`
  }),
  freeze({
    id: "frost_spire",
    name: "寒霜凝结塔",
    type: 'tower',
    category: "tower",
    role: "冰环减速冻结",
    width: 32,
    height: 32,
    stats: freeze({"damage": 18, "attackSpeed": 1.0, "range": 200, "slowPercent": 0.6}),
    description: "耸立的永冻冰晶尖塔，持续释放刺骨冰环减速冻结敌潮。",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
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
</svg>`
  }),
  freeze({
    id: "inferno_shrine",
    name: "焚天余烬坛",
    type: 'tower',
    category: "tower",
    role: "持续焦土火海",
    width: 32,
    height: 32,
    stats: freeze({"damage": 28, "attackSpeed": 0.8, "range": 190}),
    description: "狂暴燃烧的重铸圣火坛，点燃地面留下持续伤害的焦土火海。",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
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
</svg>`
  }),
  freeze({
    id: "mortar_cannon",
    name: "重型生铁臼炮",
    type: 'tower',
    category: "tower",
    role: "大范围爆破",
    width: 32,
    height: 32,
    stats: freeze({"damage": 65, "attackSpeed": 0.45, "range": 280, "aoeRadius": 75}),
    description: "短管大口径臼炮，发射高爆开花弹引发大范围震荡碎裂。",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
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
</svg>`
  }),
  freeze({
    id: "snare_trap",
    name: "捕兽棘刺陷阱",
    type: 'tower',
    category: "trap",
    role: "禁锢控制",
    width: 32,
    height: 32,
    stats: freeze({"damage": 45, "slowPercent": 0.5}),
    description: "埋设在阵地的锯齿铁夹，瞬发重创踏入目标并禁锢移动。",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
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
</svg>`
  }),
  freeze({
    id: "stone_wall",
    name: "防御石墙",
    type: 'tower',
    category: "barrier",
    role: "阻挡与反伤",
    width: 32,
    height: 32,
    stats: freeze({"maxHp": 900, "reflectPercent": 0.5}),
    description: "阻挡地面怪物的花岗岩防御壁，提供反弹反噬与圣火庇护。",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <!-- 防御石墙：花岗岩城垛与冷铁加固条 -->
  <rect x="4" y="8" width="6" height="6" fill="#41394D"/>
  <rect x="13" y="8" width="6" height="6" fill="#41394D"/>
  <rect x="22" y="8" width="6" height="6" fill="#41394D"/>
  <!-- 墙体主体 -->
  <rect x="2" y="14" width="28" height="16" fill="#2C2636"/>
  <rect x="4" y="15" width="10" height="4" fill="#5C5266"/>
  <rect x="16" y="15" width="12" height="4" fill="#41394D"/>
  <rect x="2" y="20" width="12" height="4" fill="#41394D"/>
  <rect x="16" y="20" width="12" height="4" fill="#5C5266"/>
  <!-- 铁钉与青苔裂痕 -->
  <rect x="7" y="17" width="2" height="2" fill="#121016"/>
  <rect x="21" y="22" width="2" height="2" fill="#121016"/>
  <rect x="14" y="14" width="2" height="14" fill="#1E1B24"/>
</svg>`
  }),
  freeze({
    id: "thorns_barricade",
    name: "荆棘岩壁",
    type: 'tower',
    category: "barrier",
    role: "高阶反伤壁垒",
    width: 32,
    height: 32,
    stats: freeze({"maxHp": 1500, "reflectPercent": 0.8}),
    description: "布满黑曜石尖刺与剧毒蔓藤的高阶防壁，反噬80%近战伤害。",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
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
</svg>`
  }),
  freeze({
    id: "thunder_ballista",
    name: "雷霆脉冲弩",
    type: 'tower',
    category: "tower",
    role: "四重连锁闪电",
    width: 32,
    height: 32,
    stats: freeze({"damage": 35, "attackSpeed": 1.1, "range": 260, "chainCount": 4}),
    description: "镶嵌雷兽晶核的巨型重弩，攻击在敌群间传导四重高压电弧。",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
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
</svg>`
  }),
  freeze({
    id: "toxic_catapult",
    name: "腐蚀酸液投石机",
    type: 'tower',
    category: "tower",
    role: "破甲腐蚀",
    width: 32,
    height: 32,
    stats: freeze({"damage": 20, "attackSpeed": 0.55, "range": 250}),
    description: "抛掷烈性腐蚀胆汁罐，破除重甲敌人的防御护壳。",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
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
</svg>`
  }),
  freeze({
    id: "void_beacon",
    name: "虚空引力信标",
    type: 'tower',
    category: "beacon",
    role: "引力聚怪",
    width: 32,
    height: 32,
    stats: freeze({"damage": 10, "attackSpeed": 0.7, "range": 230}),
    description: "引发引力坍缩暗黑漩涡，强行将四散的敌群聚拢吸附至中心。",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
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
</svg>`
  }),
  freeze({
    id: "wind_repeater",
    name: "疾风连射弩",
    type: 'tower',
    category: "tower",
    role: "双联极速射击",
    width: 32,
    height: 32,
    stats: freeze({"damage": 22, "attackSpeed": 2.6, "range": 240}),
    description: "融合风狼核心的双联轻弓，两连发极速射击压制。",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
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
</svg>`
  })
]);

/** 3 款多帧怪物预设（Walk / Attack / Death 共 32 帧） */
export const MONSTERS = freeze([
  freeze({
    id: "ashen_wolf",
    name: "灰烬狼",
    type: 'monster',
    role: "迅捷掠食",
    width: 32,
    height: 32,
    frameTotal: 10,
    stats: freeze({"hp": 90, "speed": 75, "armor": 2, "attack": 12}),
    description: "废土边缘由残烬聚成的掠食野兽，移动迅捷。",
    animations: freeze({
      walk: freeze({
        label: "行走",
        fps: 6,
        loop: true,
        frames: freeze([
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
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
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
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
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
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
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
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
          </svg>`,
        ])
      }),
      attack: freeze({
        label: "攻击",
        fps: 8,
        loop: false,
        frames: freeze([
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
            <rect x="19" y="12" width="7" height="5" fill="#2C2636"/>
            <rect x="26" y="13" width="4" height="4" fill="#A12B2B"/>
            <rect x="21" y="10" width="2" height="3" fill="#41394D"/>
            <rect x="22" y="13" width="2" height="2" fill="#FAD65A"/>
            <rect x="9" y="14" width="12" height="7" fill="#1E1B24"/>
            <rect x="3" y="16" width="6" height="3" fill="#2C2636"/>
            <rect x="8" y="21" width="4" height="6" fill="#121016"/>
            <rect x="19" y="21" width="4" height="6" fill="#121016"/>
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
            <rect x="22" y="7" width="8" height="6" fill="#2C2636"/>
            <rect x="28" y="9" width="4" height="5" fill="#E11D48"/>
            <rect x="24" y="8" width="2" height="2" fill="#FFFFFF"/>
            <rect x="12" y="9" width="12" height="8" fill="#1E1B24"/>
            <rect x="5" y="11" width="7" height="3" fill="#2C2636"/>
            <rect x="13" y="17" width="5" height="5" fill="#121016"/>
            <rect x="22" y="15" width="6" height="4" fill="#D94126"/>
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
            <rect x="21" y="9" width="7" height="5" fill="#2C2636"/>
            <rect x="27" y="11" width="3" height="3" fill="#1E1B24"/>
            <rect x="23" y="10" width="2" height="2" fill="#F28929"/>
            <rect x="11" y="11" width="12" height="8" fill="#1E1B24"/>
            <rect x="4" y="14" width="7" height="3" fill="#2C2636"/>
            <rect x="12" y="19" width="4" height="7" fill="#121016"/>
            <rect x="22" y="19" width="4" height="7" fill="#121016"/>
            <rect x="23" y="26" width="4" height="1" fill="#E11D48"/>
          </svg>`,
        ])
      }),
      death: freeze({
        label: "死亡",
        fps: 8,
        loop: false,
        frames: freeze([
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
            <rect x="18" y="5" width="6" height="6" fill="#3D3448"/>
            <rect x="22" y="3" width="3" height="4" fill="#A12B2B"/>
            <rect x="9" y="11" width="11" height="8" fill="#2C2636"/>
            <rect x="10" y="19" width="3" height="6" fill="#1E1B24"/>
            <rect x="17" y="19" width="3" height="5" fill="#1E1B24"/>
            <rect x="14" y="13" width="2" height="4" fill="#F28929"/>
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
            <rect x="18" y="17" width="7" height="5" fill="#2C2636"/>
            <rect x="8" y="19" width="12" height="5" fill="#1E1B24"/>
            <rect x="4" y="21" width="5" height="3" fill="#121016"/>
            <rect x="10" y="24" width="14" height="2" fill="#0D0B12"/>
            <rect x="14" y="18" width="4" height="2" fill="#D94126"/>
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
            <rect x="6" y="25" width="18" height="2" fill="#121016"/>
            <rect x="9" y="23" width="4" height="2" fill="#2C2636"/>
            <rect x="17" y="22" width="3" height="2" fill="#2C2636"/>
            <rect x="11" y="19" width="2" height="2" fill="#F28929"/>
            <rect x="16" y="16" width="2" height="2" fill="#FAD65A"/>
            <rect x="14" y="12" width="1" height="2" fill="#FFFFFF"/>
          </svg>`,
        ])
      })
    })
  }),
  freeze({
    id: "crawler",
    name: "灰潮爬行者",
    type: 'monster',
    role: "甲壳先锋",
    width: 32,
    height: 32,
    frameTotal: 10,
    stats: freeze({"hp": 160, "speed": 45, "armor": 5, "attack": 20}),
    description: "拥有轻度甲壳的灰潮初阶先锋。",
    animations: freeze({
      walk: freeze({
        label: "行走",
        fps: 6,
        loop: true,
        frames: freeze([
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
            <rect x="20" y="15" width="6" height="4" fill="#243026"/>
            <rect x="25" y="16" width="3" height="3" fill="#151C16"/>
            <rect x="23" y="15" width="2" height="2" fill="#84CC16"/>
            <rect x="8" y="13" width="13" height="8" fill="#1E2B20"/>
            <rect x="9" y="11" width="10" height="3" fill="#3D5240"/>
            <rect x="6" y="18" width="4" height="8" fill="#151C16"/>
            <rect x="12" y="19" width="3" height="7" fill="#151C16"/>
            <rect x="18" y="18" width="4" height="8" fill="#151C16"/>
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
            <rect x="20" y="16" width="6" height="4" fill="#243026"/>
            <rect x="25" y="17" width="3" height="3" fill="#151C16"/>
            <rect x="23" y="16" width="2" height="2" fill="#84CC16"/>
            <rect x="8" y="12" width="13" height="8" fill="#1E2B20"/>
            <rect x="9" y="10" width="10" height="3" fill="#3D5240"/>
            <rect x="7" y="19" width="3" height="7" fill="#151C16"/>
            <rect x="12" y="17" width="3" height="6" fill="#151C16"/>
            <rect x="17" y="19" width="3" height="7" fill="#151C16"/>
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
            <rect x="20" y="15" width="6" height="4" fill="#243026"/>
            <rect x="25" y="16" width="3" height="3" fill="#151C16"/>
            <rect x="23" y="15" width="2" height="2" fill="#84CC16"/>
            <rect x="8" y="13" width="13" height="8" fill="#1E2B20"/>
            <rect x="9" y="11" width="10" height="3" fill="#3D5240"/>
            <rect x="8" y="19" width="3" height="7" fill="#151C16"/>
            <rect x="14" y="19" width="3" height="7" fill="#151C16"/>
            <rect x="19" y="17" width="3" height="8" fill="#151C16"/>
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
            <rect x="20" y="14" width="6" height="4" fill="#243026"/>
            <rect x="25" y="15" width="3" height="3" fill="#151C16"/>
            <rect x="23" y="14" width="2" height="2" fill="#84CC16"/>
            <rect x="8" y="12" width="13" height="8" fill="#1E2B20"/>
            <rect x="9" y="10" width="10" height="3" fill="#3D5240"/>
            <rect x="6" y="18" width="4" height="8" fill="#151C16"/>
            <rect x="13" y="18" width="3" height="8" fill="#151C16"/>
            <rect x="18" y="18" width="4" height="8" fill="#151C16"/>
          </svg>`,
        ])
      }),
      attack: freeze({
        label: "攻击",
        fps: 8,
        loop: false,
        frames: freeze([
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
            <rect x="18" y="11" width="6" height="5" fill="#243026"/>
            <rect x="23" y="9" width="4" height="4" fill="#84CC16"/>
            <rect x="26" y="12" width="3" height="3" fill="#4D7C0F"/>
            <rect x="7" y="14" width="13" height="8" fill="#1E2B20"/>
            <rect x="6" y="20" width="4" height="7" fill="#151C16"/>
            <rect x="16" y="20" width="4" height="7" fill="#151C16"/>
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
            <rect x="22" y="13" width="8" height="6" fill="#243026"/>
            <rect x="28" y="14" width="4" height="5" fill="#A3E635"/>
            <rect x="9" y="13" width="14" height="8" fill="#1E2B20"/>
            <rect x="10" y="21" width="4" height="6" fill="#151C16"/>
            <rect x="20" y="19" width="5" height="7" fill="#151C16"/>
            <rect x="29" y="19" width="3" height="3" fill="#84CC16"/>
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
            <rect x="20" y="15" width="6" height="4" fill="#243026"/>
            <rect x="25" y="16" width="3" height="3" fill="#151C16"/>
            <rect x="8" y="14" width="13" height="8" fill="#1E2B20"/>
            <rect x="7" y="20" width="4" height="6" fill="#151C16"/>
            <rect x="17" y="20" width="4" height="6" fill="#151C16"/>
          </svg>`,
        ])
      }),
      death: freeze({
        label: "死亡",
        fps: 8,
        loop: false,
        frames: freeze([
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
            <rect x="17" y="13" width="7" height="6" fill="#3D5240"/>
            <rect x="6" y="15" width="12" height="8" fill="#243026"/>
            <rect x="11" y="17" width="2" height="4" fill="#84CC16"/>
            <rect x="15" y="16" width="2" height="5" fill="#84CC16"/>
            <rect x="5" y="23" width="16" height="2" fill="#151C16"/>
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
            <rect x="8" y="21" width="16" height="5" fill="#151C16"/>
            <rect x="10" y="19" width="8" height="3" fill="#243026"/>
            <rect x="12" y="22" width="4" height="3" fill="#84CC16"/>
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
            <rect x="7" y="25" width="18" height="2" fill="#0D120E"/>
            <rect x="11" y="24" width="6" height="2" fill="#151C16"/>
            <rect x="14" y="22" width="2" height="2" fill="#4D7C0F"/>
          </svg>`,
        ])
      })
    })
  }),
  freeze({
    id: "boss_wolf",
    name: "灰狼首领·残烬之影",
    type: 'monster',
    role: "首领 · 残烬之影",
    width: 48,
    height: 48,
    frameTotal: 12,
    stats: freeze({"hp": 2400, "speed": 60, "armor": 12, "attack": 65, "boss": true}),
    description: "第一章守关首领，体内蕴含第一枚天穹炉心碎片。",
    animations: freeze({
      walk: freeze({
        label: "行走",
        fps: 6,
        loop: true,
        frames: freeze([
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
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
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
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
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
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
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
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
          </svg>`,
        ])
      }),
      attack: freeze({
        label: "攻击",
        fps: 8,
        loop: false,
        frames: freeze([
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
            <rect x="31" y="6" width="9" height="10" fill="#2C2636"/>
            <rect x="38" y="4" width="6" height="6" fill="#D94126"/>
            <rect x="33" y="9" width="3" height="3" fill="#FAD65A"/>
            <rect x="14" y="16" width="18" height="12" fill="#1E1B24"/>
            <rect x="24" y="18" width="5" height="5" fill="#FAD65A"/>
            <rect x="13" y="28" width="6" height="10" fill="#121016"/>
            <rect x="27" y="28" width="6" height="10" fill="#121016"/>
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
            <rect x="34" y="12" width="10" height="8" fill="#2C2636"/>
            <rect x="42" y="14" width="5" height="6" fill="#E11D48"/>
            <rect x="18" y="14" width="18" height="11" fill="#1E1B24"/>
            <rect x="28" y="16" width="5" height="5" fill="#FFFFFF"/>
            <rect x="14" y="25" width="7" height="9" fill="#121016"/>
            <rect x="30" y="24" width="8" height="7" fill="#E11D48"/>
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
            <rect x="32" y="14" width="10" height="8" fill="#2C2636"/>
            <rect x="40" y="16" width="6" height="6" fill="#E11D48"/>
            <rect x="16" y="16" width="18" height="12" fill="#1E1B24"/>
            <rect x="16" y="28" width="6" height="10" fill="#121016"/>
            <rect x="32" y="26" width="8" height="12" fill="#E11D48"/>
            <rect x="34" y="38" width="12" height="3" fill="#FAD65A"/>
            <rect x="38" y="40" width="8" height="2" fill="#FFFFFF"/>
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
            <rect x="30" y="11" width="10" height="8" fill="#2C2636"/>
            <rect x="39" y="14" width="5" height="5" fill="#1A1624"/>
            <rect x="34" y="13" width="3" height="3" fill="#FAD65A"/>
            <rect x="14" y="14" width="18" height="13" fill="#1E1B24"/>
            <rect x="25" y="17" width="4" height="4" fill="#FAD65A"/>
            <rect x="15" y="27" width="5" height="11" fill="#121016"/>
            <rect x="28" y="27" width="5" height="11" fill="#121016"/>
          </svg>`,
        ])
      }),
      death: freeze({
        label: "死亡",
        fps: 8,
        loop: false,
        frames: freeze([
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
            <rect x="28" y="6" width="10" height="8" fill="#3D3448"/>
            <rect x="36" y="4" width="6" height="6" fill="#E11D48"/>
            <rect x="14" y="14" width="18" height="13" fill="#2C2636"/>
            <rect x="23" y="15" width="8" height="8" fill="#FAD65A"/>
            <rect x="25" y="17" width="4" height="4" fill="#FFFFFF"/>
            <rect x="15" y="27" width="5" height="10" fill="#1E1B24"/>
            <rect x="28" y="27" width="5" height="10" fill="#1E1B24"/>
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
            <rect x="28" y="19" width="10" height="7" fill="#2C2636"/>
            <rect x="12" y="21" width="18" height="9" fill="#1E1B24"/>
            <rect x="23" y="11" width="6" height="6" fill="#FAD65A"/>
            <rect x="24" y="12" width="4" height="4" fill="#FFFFFF"/>
            <rect x="14" y="30" width="18" height="4" fill="#121016"/>
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
            <rect x="10" y="32" width="24" height="4" fill="#121016"/>
            <rect x="14" y="29" width="16" height="4" fill="#2C2636"/>
            <rect x="23" y="16" width="6" height="6" fill="#FAD65A"/>
            <rect x="24" y="17" width="4" height="4" fill="#FFFFFF"/>
            <rect x="16" y="24" width="3" height="3" fill="#D94126"/>
            <rect x="29" y="23" width="3" height="3" fill="#D94126"/>
          </svg>`,
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" shape-rendering="crispEdges">
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
          </svg>`,
        ])
      })
    })
  })
]);

/** 统一资产字典 */
export const PRESET_ASSETS = freeze({
  towers: TOWERS,
  monsters: MONSTERS
});

/** 资产库统计信息（用于页脚与导出清单展示） */
export const PRESET_STATS = freeze({
  towerCount: TOWERS.length,
  monsterCount: MONSTERS.length,
  monsterFrameCount: 32,
  totalAssetCount: TOWERS.length + MONSTERS.length
});

/** 按类型与 id 查找预设资产 */
export function findPreset(type, id) {
  const pool = type === 'monster' ? MONSTERS : TOWERS;
  return pool.find((asset) => asset.id === id) || null;
}

/** 获取资产指定动作的帧 SVG 列表（防御塔统一返回 idle 单帧） */
export function getPresetFrames(asset, state = 'idle') {
  if (!asset) throw new TypeError('getPresetFrames 需要一个资产对象');
  if (asset.type === 'monster') {
    const animation = asset.animations[state] || asset.animations.walk;
    return [...animation.frames];
  }
  return [asset.svg];
}

/** 获取资产可用的动作列表 */
export function getPresetStates(asset) {
  if (!asset) return [];
  if (asset.type === 'monster') return Object.keys(asset.animations);
  return ['idle'];
}

const PALETTE_PROMPT = '暗部 #121016 #1e1b24 #2c2636 #41394d；铁与石 #5c5266 #7c728a #a69cb3；火光 #5e1b1b #a12b2b #d64e2a #f28929 #fad65a；奥术 #1d3b5c #2b6ba6 #55a4db #bee5fa';

const RULES_PROMPT = '输出要求：1) 仅使用 <rect> 图元，禁止 path / circle / polygon / g / 渐变 / 滤镜；2) 根节点必须声明 shape-rendering="crispEdges"；3) viewBox 必须是 "0 0 32 32" 或 "0 0 48 48"，所有 x/y/width/height 必须为整数；4) 颜色只能取自 Embers 16 色标准调色板；5) 像素块需覆盖主体轮廓，保持暗部轮廓 + 中间调体积 + 高光点缀的三层结构。';

/**
 * 面向 LLM 的标准 Prompt 模板。
 * 用法：buildPrompt('tower', { name: '寒霜凝结塔', theme: '冰霜' })
 */
export const PROMPT_TEMPLATES = freeze({
  tower(options = {}) {
    const name = options.name || '防御塔';
    const theme = options.theme || '暗黑哥特';
    return [
      `你是像素美术总监。请生成一座 ${theme}风格的 2D 塔防防御塔「${name}」，俯视 3/4 视角，32×32 像素网格。`,
      `主体结构：石质台座 + 金属支架 + 中央能量核心，轮廓必须清晰可辨，光源来自核心。`,
      `调色板约束：${PALETTE_PROMPT}。`,
      RULES_PROMPT
    ].join('\n');
  },

  monster(options = {}) {
    const name = options.name || '怪物';
    const action = options.action || 'walk';
    const frames = options.frames || 4;
    return [
      `你是像素动画师。请为 2D 暗黑塔防游戏生成怪物「${name}」的 ${action} 动作序列，共 ${frames} 帧，每帧 32×32 像素网格。`,
      `每帧必须独立生成完整 SVG，帧间仅允许肢体与躯干的像素位移，头身比例、配色与轮廓保持一致，确保可直接合成为水平 Spritesheet。`,
      `动作要求：walk 为四足交替迈步，attack 为扑咬前冲，death 为逐帧塌陷并保留最后一帧的倒地剪影。`,
      `调色板约束：${PALETTE_PROMPT}。`,
      RULES_PROMPT
    ].join('\n');
  },

  core(options = {}) {
    const name = options.name || '材料核心';
    const theme = options.theme || '雷暴';
    return [
      `请生成一枚 ${theme}主题的游戏材料核心「${name}」，32×32 像素网格，悬浮于深色背景，带 2~3 圈能量辉光。`,
      `结构：外壳 + 内核 + 高光点，外壳需有缺口以露出内部能量色。`,
      `调色板约束：${PALETTE_PROMPT}。`,
      RULES_PROMPT
    ].join('\n');
  }
});

/** 统一 Prompt 构建入口 */
export function buildPrompt(kind, options = {}) {
  const template = PROMPT_TEMPLATES[kind];
  if (!template) throw new Error(`未知的 Prompt 模板类型: ${kind}`);
  return template(options);
}
