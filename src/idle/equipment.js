/**
 * 《余烬裂隙》装备数据模型与战力计算引擎 (equipment.js)
 * -------------------------------------------------------------
 * 严格遵循 100% 原创暗黑余烬宇宙规范，承载 12 大装备槽位、
 * 6 级品阶、词条属性随机与战力聚合计算。
 */

export const EQUIPMENT_SLOTS = Object.freeze([
  'weapon',      // 武器
  'shoulder',    // 战盔/护肩
  'top',         // 胸甲/板甲
  'bottom',      // 护胫/腿甲
  'belt',        // 战带/束腰
  'shoes',       // 战靴/长靴
  'bracelet',    // 护腕/手镯
  'necklace',    // 灵符项链
  'ring',        // 符文指环
  'left_badge',  // 战神徽章 (左槽)
  'right_stone', // 混沌魔石 (右槽)
  'earring'      // 灵犀耳坠 (耳环)
]);

export const SLOT_NAMES = Object.freeze({
  weapon: '神兵',
  shoulder: '战盔',
  top: '胸甲',
  bottom: '腿甲',
  belt: '战带',
  shoes: '战靴',
  bracelet: '护腕',
  necklace: '灵符项链',
  ring: '符文指环',
  left_badge: '战神徽章',
  right_stone: '混沌魔石',
  earring: '灵犀耳坠'
});

export const RARITY_TIERS = Object.freeze({
  common: { id: 'common', name: '普通', color: '#c5bfd2', weight: 45, multiplier: 1.0 },
  uncommon: { id: 'uncommon', name: '优质', color: '#55a4db', weight: 30, multiplier: 1.3 },
  rare: { id: 'rare', name: '稀有', color: '#a26cdb', weight: 15, multiplier: 1.8 },
  unique: { id: 'unique', name: '神器', color: '#e55ea8', weight: 7, multiplier: 2.6 },
  epic: { id: 'epic', name: '太古史诗', color: '#fad65a', weight: 2.8, multiplier: 4.2 },
  mythic: { id: 'mythic', name: '永恒神话', color: '#ff3b8b', weight: 0.2, multiplier: 7.0 }
});

export const WEAPON_TYPES = [
  { id: 'katana', name: '流光太刀', icon: '🗡️', desc: '迅疾连击与弱点暴击', baseAtk: 1.1, baseSpd: 1.25, crit: 0.15 },
  { id: 'greatsword', name: '破峰巨剑', icon: '⚔️', desc: '毁天灭地的直接物理重斩', baseAtk: 1.6, baseSpd: 0.85, crit: 0.05 },
  { id: 'shortsword', name: '虚空短剑', icon: '🗡️', desc: '奥术余烬与剑气技攻加成', baseAtk: 1.2, baseSpd: 1.1, crit: 0.08 },
  { id: 'lightsaber', name: '疾风光刃', icon: '⚡', desc: '高频残影追击与电弧感电', baseAtk: 1.0, baseSpd: 1.4, crit: 0.12 },
  { id: 'bludgeon', name: '重型碎甲锤', icon: '🔨', desc: '重创碎甲与坚固冲击', baseAtk: 1.45, baseSpd: 0.95, crit: 0.06 }
];

const PREFIX_NAMES = {
  common: ['生铁', '磨损', '粗糙', '坚固'],
  uncommon: ['精锻', '猎荒', '淬火', '黑钢'],
  rare: ['余烬', '暗影', '寒霜', '逐雷'],
  unique: ['炽炎狂怒', '不灭冥灵', '虚空行者', '天帷巨兽'],
  epic: ['别云剑·无用', '荒古遗尘', '天御之灾', '深渊审判者', '魔战无双', '星空的引力'],
  mythic: ['万物之初·太初破界', '神话·逆转结局', '太初·原初余烬之剑']
};

/**
 * 生成随机掉落装备
 */
export function generateDrop(monsterLevel = 1, isBoss = false) {
  let rarity = 'common';
  if (isBoss) {
    // Boss 掉落池：大幅提升太古史诗与神话概率
    const roll = Math.random() * 100;
    if (roll < 3) rarity = 'mythic';
    else if (roll < 55) rarity = 'epic';
    else if (roll < 85) rarity = 'unique';
    else rarity = 'rare';
  } else {
    const roll = Math.random() * 100;
    let accumulated = 0;
    for (const [tier, conf] of Object.entries(RARITY_TIERS)) {
      accumulated += conf.weight;
      if (roll <= accumulated) {
        rarity = tier;
        break;
      }
    }
  }

  // 随机槽位
  const slot = EQUIPMENT_SLOTS[Math.floor(Math.random() * EQUIPMENT_SLOTS.length)];
  const rarityConfig = RARITY_TIERS[rarity];
  const level = Math.max(1, monsterLevel);

  // 基础属性生成
  const stats = {};
  const affixes = {};

  if (slot === 'weapon') {
    const weaponType = WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)];
    const baseDamage = Math.round(15 * level * rarityConfig.multiplier * weaponType.baseAtk);
    stats.attack = baseDamage;
    stats.attackSpeed = weaponType.baseSpd;
    stats.critRate = weaponType.crit;
    stats.weaponType = weaponType.id;
  } else if (['shoulder', 'top', 'bottom', 'belt', 'shoes'].includes(slot)) {
    stats.defense = Math.round(8 * level * rarityConfig.multiplier);
    stats.hp = Math.round(45 * level * rarityConfig.multiplier);
    stats.strength = Math.round(5 * level * rarityConfig.multiplier);
  } else if (['bracelet', 'necklace', 'ring'].includes(slot)) {
    stats.elementEnhance = Math.round(3 * level * rarityConfig.multiplier); // 属性强化
    stats.critRate = Math.min(0.25, 0.02 + level * 0.005);
    stats.strength = Math.round(4 * level * rarityConfig.multiplier);
  } else {
    // 特殊秘宝 (left_badge, right_stone, earring)
    stats.attack = Math.round(6 * level * rarityConfig.multiplier);
    stats.elementEnhance = Math.round(4 * level * rarityConfig.multiplier);
    affixes.directAmp = Math.round((0.02 + (rarityConfig.multiplier * 0.02)) * 100) / 100; // 直接增伤
    affixes.bonusAttack = Math.round((0.03 + (rarityConfig.multiplier * 0.015)) * 100) / 100; // 附加追击
  }

  // 命名构造
  const prefixList = PREFIX_NAMES[rarity] || PREFIX_NAMES.common;
  const prefix = prefixList[Math.floor(Math.random() * prefixList.length)];
  const name = `${prefix}·${SLOT_NAMES[slot]}`;

  // 战力快速预估
  const combatPower = Math.round(
    (stats.attack || 0) * 1.5 +
    (stats.defense || 0) * 0.8 +
    (stats.hp || 0) * 0.2 +
    (stats.strength || 0) * 2.0 +
    (stats.elementEnhance || 0) * 10 +
    (affixes.directAmp || 0) * 1000 +
    (affixes.bonusAttack || 0) * 800
  );

  return {
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    slot,
    rarity,
    level,
    reinforceLevel: 0,
    stats,
    affixes,
    combatPower: Math.max(10, combatPower),
    droppedAt: Date.now()
  };
}

/**
 * 计算角色综合战力与属性聚合面板
 */
export function calculateCombatPower(equippedMap = {}) {
  let totalPower = 50; // 基础初始战力
  const aggregatedStats = {
    attack: 20,
    defense: 10,
    hp: 200,
    strength: 10,
    attackSpeed: 1.0,
    critRate: 0.05,
    elementEnhance: 0,
    directAmp: 0,
    bonusAttack: 0
  };

  for (const slot of EQUIPMENT_SLOTS) {
    const item = equippedMap[slot];
    if (!item) continue;

    // 强化成长乘子: 每级提升约 8%
    const reinforceMultiplier = 1 + (item.reinforceLevel || 0) * 0.08;

    if (item.stats) {
      if (item.stats.attack) aggregatedStats.attack += Math.round(item.stats.attack * reinforceMultiplier);
      if (item.stats.defense) aggregatedStats.defense += Math.round(item.stats.defense * reinforceMultiplier);
      if (item.stats.hp) aggregatedStats.hp += Math.round(item.stats.hp * reinforceMultiplier);
      if (item.stats.strength) aggregatedStats.strength += Math.round(item.stats.strength * reinforceMultiplier);
      if (item.stats.critRate) aggregatedStats.critRate += item.stats.critRate;
      if (item.stats.elementEnhance) aggregatedStats.elementEnhance += item.stats.elementEnhance;
      if (item.stats.attackSpeed && slot === 'weapon') aggregatedStats.attackSpeed = item.stats.attackSpeed;
    }

    if (item.affixes) {
      if (item.affixes.directAmp) aggregatedStats.directAmp += item.affixes.directAmp;
      if (item.affixes.bonusAttack) aggregatedStats.bonusAttack += item.affixes.bonusAttack;
    }

    totalPower += item.combatPower || 0;
  }

  // 终极战力算法：(攻击 + 力量*1.5) * (1 + 增伤) * (1 + 属强/220)
  const elementMultiplier = 1 + (aggregatedStats.elementEnhance / 220);
  const ampMultiplier = 1 + aggregatedStats.directAmp + aggregatedStats.bonusAttack;
  const effectiveAtk = (aggregatedStats.attack + aggregatedStats.strength * 1.5) * elementMultiplier * ampMultiplier;

  totalPower = Math.round(effectiveAtk + aggregatedStats.defense * 1.2 + aggregatedStats.hp * 0.3);

  return {
    totalPower: Math.max(50, totalPower),
    stats: aggregatedStats
  };
}

/**
 * 分解装备收益核算
 */
export function decomposeItem(item) {
  if (!item) return { gold: 0, cinders: 0, shards: 0 };
  const lvl = item.level || 1;

  switch (item.rarity) {
    case 'common':
      return { gold: lvl * 20, cinders: 0, shards: 0 };
    case 'uncommon':
      return { gold: lvl * 50, cinders: 0, shards: 0 };
    case 'rare':
      return { gold: lvl * 120, cinders: Math.max(1, Math.round(lvl * 0.3)), shards: 0 };
    case 'unique':
      return { gold: lvl * 300, cinders: Math.max(3, Math.round(lvl * 0.8)), shards: 0 };
    case 'epic':
      return { gold: lvl * 800, cinders: Math.max(8, lvl * 2), shards: Math.max(2, Math.round(lvl * 0.5)) };
    case 'mythic':
      return { gold: lvl * 2500, cinders: lvl * 5, shards: Math.max(10, lvl * 2) };
    default:
      return { gold: lvl * 10, cinders: 0, shards: 0 };
  }
}

/**
 * 创建保底不损新手铁剑（防碎刀卡关）
 */
export function createFallbackWeapon() {
  return {
    id: 'starter_iron_sword',
    name: '生铁粗糙短剑',
    slot: 'weapon',
    rarity: 'common',
    level: 1,
    reinforceLevel: 0,
    isFallback: true,
    stats: {
      attack: 18,
      attackSpeed: 1.0,
      critRate: 0.05,
      weaponType: 'shortsword'
    },
    affixes: {},
    combatPower: 30,
    droppedAt: 0
  };
}
