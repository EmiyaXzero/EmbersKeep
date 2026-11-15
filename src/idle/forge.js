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
/**
 * 强化阶梯成功率与风险判定规则
 * -------------------------------------------------------------
 * +1 ~ +3: 100% 绝对安全入门
 * +4 ~ +8: 85% ~ 40% 阶梯递减，失败安全（不掉级）
 * +9 ~ +10: 30% ~ 20% 风险区间，失败跌落 1 级
 * +11 ~ +15: 15% ~ 3% 极限高危，失败碎裂为虚空晶屑
 */
export function getForgeRate(currentLevel = 0) {
  const lvl = Math.max(0, currentLevel);

  const ratesTable = {
    0:  { rate: 1.00, gold: 500,     cinders: 0,   risk: 'safe',    glow: '#ffffff' },
    1:  { rate: 1.00, gold: 1000,    cinders: 0,   risk: 'safe',    glow: '#ffffff' },
    2:  { rate: 1.00, gold: 1800,    cinders: 0,   risk: 'safe',    glow: '#ffffff' },
    3:  { rate: 0.85, gold: 3000,    cinders: 2,   risk: 'safe',    glow: '#ffffff' },
    4:  { rate: 0.70, gold: 5000,    cinders: 4,   risk: 'safe',    glow: '#55a4db' },
    5:  { rate: 0.60, gold: 8000,    cinders: 6,   risk: 'safe',    glow: '#55a4db' },
    6:  { rate: 0.50, gold: 12000,   cinders: 8,   risk: 'safe',    glow: '#55a4db' },
    7:  { rate: 0.40, gold: 18000,   cinders: 12,  risk: 'safe',    glow: '#a26cdb' },
    8:  { rate: 0.30, gold: 28000,   cinders: 18,  risk: 'degrade', glow: '#a26cdb' },
    9:  { rate: 0.20, gold: 45000,   cinders: 25,  risk: 'degrade', glow: '#e55ea8' },
    10: { rate: 0.15, gold: 80000,   cinders: 35,  risk: 'shatter', glow: '#fad65a' },
    11: { rate: 0.12, gold: 150000,  cinders: 50,  risk: 'shatter', glow: '#ff9800' },
    12: { rate: 0.09, gold: 300000,  cinders: 80,  risk: 'shatter', glow: '#f44336' },
    13: { rate: 0.06, gold: 600000,  cinders: 120, risk: 'shatter', glow: '#ff3b8b' },
    14: { rate: 0.03, gold: 1200000, cinders: 200, risk: 'shatter', glow: '#e040fb' }
  };

  const tier = ratesTable[lvl] || {
    rate: 0.01,
    gold: 2000000,
    cinders: 300,
    risk: 'shatter',
    glow: '#00e5ff'
  };

  return {
    targetLevel: lvl + 1,
    successRate: tier.rate,
    costGold: tier.gold,
    costCinders: tier.cinders,
    riskType: tier.risk,
    glowColor: tier.glow
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
