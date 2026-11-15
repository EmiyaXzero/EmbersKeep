/**
 * 《余烬裂隙》秘银锻炉与强化经济系统 (forge.js)
 * -------------------------------------------------------------
 * 还原扣人心弦的强化机制（+1~+7安全，+8~+10掉级，+11~+15碎刀返晶屑），
 * 并提供新手铁剑保底与虚空晶屑兑换循环。
 */

import { createFallbackWeapon } from './equipment.js';

/**
 * 强化阶梯成功率与风险判定规则
 */
export function getForgeRate(currentLevel = 0) {
  const lvl = Math.max(0, currentLevel);

  // +1 ~ +7: 100% 绝对安全
  if (lvl < 7) {
    return {
      targetLevel: lvl + 1,
      successRate: 1.0,
      costGold: (lvl + 1) * 300,
      costCinders: lvl >= 4 ? (lvl - 3) * 2 : 0,
      riskType: 'safe',
      glowColor: '#ffffff'
    };
  }

  // +8: 80% 成功，失败安全不掉级
  if (lvl === 7) {
    return {
      targetLevel: 8,
      successRate: 0.8,
      costGold: 3500,
      costCinders: 5,
      riskType: 'safe',
      glowColor: '#55a4db'
    };
  }

  // +9 ~ +10: 掉级区间
  if (lvl === 8) {
    return {
      targetLevel: 9,
      successRate: 0.6,
      costGold: 7000,
      costCinders: 10,
      riskType: 'degrade',
      glowColor: '#a26cdb'
    };
  }
  if (lvl === 9) {
    return {
      targetLevel: 10,
      successRate: 0.45,
      costGold: 15000,
      costCinders: 18,
      riskType: 'degrade',
      glowColor: '#e55ea8'
    };
  }

  // +11 ~ +15: 碎刀碎甲高危区间
  const shatterRates = {
    10: { rate: 0.30, gold: 30000, cinders: 30, glow: '#fad65a' },
    11: { rate: 0.20, gold: 60000, cinders: 50, glow: '#ff9800' },
    12: { rate: 0.14, gold: 120000, cinders: 80, glow: '#f44336' },
    13: { rate: 0.08, gold: 240000, cinders: 140, glow: '#ff3b8b' },
    14: { rate: 0.04, gold: 500000, cinders: 240, glow: '#e040fb' }
  };

  const highTier = shatterRates[lvl] || { rate: 0.02, gold: 1000000, cinders: 500, glow: '#00e5ff' };

  return {
    targetLevel: lvl + 1,
    successRate: highTier.rate,
    costGold: highTier.gold,
    costCinders: highTier.cinders,
    riskType: 'shatter',
    glowColor: highTier.glow
  };
}

/**
 * 执行秘银锻造强化
 */
export function executeForge(item, userWallet, customRoll = null) {
  if (!item) return { success: false, error: 'NO_ITEM' };

  const currentLevel = item.reinforceLevel || 0;
  const rateInfo = getForgeRate(currentLevel);

  // 校验资金与材料
  if ((userWallet.gold || 0) < rateInfo.costGold) {
    return { success: false, error: 'INSUFFICIENT_GOLD', rateInfo };
  }
  if ((userWallet.cinders || 0) < rateInfo.costCinders) {
    return { success: false, error: 'INSUFFICIENT_CINDERS', rateInfo };
  }

  // 扣减消耗
  userWallet.gold -= rateInfo.costGold;
  userWallet.cinders -= rateInfo.costCinders;

  // 判定摇奖
  const roll = customRoll !== null ? customRoll : Math.random();
  const isSuccess = roll <= rateInfo.successRate;

  if (isSuccess) {
    item.reinforceLevel = currentLevel + 1;
    // 强化带来整体属性上浮
    if (item.stats && item.stats.attack) {
      item.stats.attack = Math.round(item.stats.attack * 1.08);
    }
    if (item.combatPower) {
      item.combatPower = Math.round(item.combatPower * 1.08);
    }
    return {
      success: true,
      item,
      rateInfo,
      message: `恭喜！强化大成，达成 +${item.reinforceLevel}！`
    };
  }

  // 强化失败处理
  if (rateInfo.riskType === 'safe') {
    return {
      success: false,
      degraded: false,
      shattered: false,
      item,
      rateInfo,
      message: '强化未成功，装备安然无恙。'
    };
  }

  if (rateInfo.riskType === 'degrade') {
    item.reinforceLevel = Math.max(0, currentLevel - 1);
    return {
      success: false,
      degraded: true,
      shattered: false,
      item,
      rateInfo,
      message: `锻造震颤！强化等级跌落至 +${item.reinforceLevel}。`
    };
  }

  // 碎裂机制 (shatter)
  const itemLvl = item.level || 20;
  const returnShards = Math.max(15, Math.round(itemLvl * currentLevel * 1.5));
  userWallet.shards = (userWallet.shards || 0) + returnShards;

  // 若碎裂的是武器，自动产出保底生铁短剑以防无法战斗
  let fallbackWeapon = null;
  if (item.slot === 'weapon') {
    fallbackWeapon = createFallbackWeapon();
  }

  return {
    success: false,
    degraded: false,
    shattered: true,
    returnShards,
    fallbackWeapon,
    rateInfo,
    message: `熔炉轰鸣！装备承受不住巨大能量破碎为 ${returnShards} 颗虚空晶屑！`
  };
}

/**
 * 虚空晶屑兑换裂隙星石 (100:1 官方比例)
 */
export function exchangeShardsForSigils(shardsCount = 0) {
  const count = Math.max(0, Math.floor(shardsCount));
  const sigilsGained = Math.floor(count / 100);
  const remainingShards = count % 100;

  return {
    sigilsGained,
    remainingShards
  };
}
