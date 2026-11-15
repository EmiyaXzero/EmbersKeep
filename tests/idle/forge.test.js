import assert from 'node:assert/strict';
import {
  getForgeRate,
  executeForge,
  exchangeShardsForSigils
} from '../../src/idle/forge.js';

console.log('--- 测试 Task 2: 秘银锻炉与强化经济模型 ---');

// 1. 验证强化阶梯与风险定义
const rate0 = getForgeRate(0);
assert.equal(rate0.successRate, 1.0, '+1 必须 100% 成功');
assert.equal(rate0.riskType, 'safe', '+1~+7 必须为安全区间');

const rate8 = getForgeRate(8);
assert.ok(rate8.successRate < 1.0, '+9 成功率小于 100%');
assert.equal(rate8.riskType, 'degrade', '+8~+10 失败为降级区间');

const rate11 = getForgeRate(11);
assert.equal(rate11.riskType, 'shatter', '+11~+15 失败为碎刀碎甲区间');
assert.ok(rate11.costCinders > 0, '高阶强化需要消耗玄碳');
console.log('✓ PASS: 强化阶梯成功率与安全/降级/碎裂风险判定正确');

// 2. 验证强化成功
const testItem = {
  id: 'weapon_epic_1',
  name: '太古·诛戮太刀',
  slot: 'weapon',
  rarity: 'epic',
  level: 50,
  reinforceLevel: 0,
  stats: { attack: 300 }
};

const wallet = { gold: 1000000, cinders: 5000, shards: 0 };
const resultSuccess = executeForge(testItem, wallet, 0.01); // 强制 roll 0.01 命中成功
assert.equal(resultSuccess.success, true, '强制低 roll 判定成功');
assert.equal(resultSuccess.item.reinforceLevel, 1, '强化等级提升到 1');
assert.ok(wallet.gold < 1000000, '扣除金币');
console.log('✓ PASS: 强化成功判定与等级提升正确');

// 3. 验证 +3 失败安全不掉级
const itemLevel3 = { ...testItem, reinforceLevel: 3 };
const resultSafeFail = executeForge(itemLevel3, wallet, 0.99); // 强制高 roll 判定失败
assert.equal(resultSafeFail.success, false);
assert.equal(resultSafeFail.degraded, false, '安全区间不掉级');
assert.equal(resultSafeFail.shattered, false, '安全区间不碎裂');
assert.equal(resultSafeFail.item.reinforceLevel, 3, '等级依然保持 +3');
console.log('✓ PASS: +3 失败安全保持原等级');

// 4. 验证 +8 失败降级
const itemLevel8 = { ...testItem, reinforceLevel: 8 };
const resultDegrade = executeForge(itemLevel8, wallet, 0.99); // 强制高 roll 判定失败
assert.equal(resultDegrade.success, false);
assert.equal(resultDegrade.degraded, true, '标记为掉级');
assert.equal(resultDegrade.item.reinforceLevel, 7, '+8 失败掉回 +7');
console.log('✓ PASS: +8 失败掉级逻辑正确');

// 4. 验证 +11 碎刀与保底武器发放
const itemLevel11 = { ...testItem, reinforceLevel: 11, slot: 'weapon' };
const resultShatter = executeForge(itemLevel11, wallet, 0.99); // 强制高 roll 判定失败碎刀
assert.equal(resultShatter.success, false);
assert.equal(resultShatter.shattered, true, '标记为碎裂');
assert.ok(resultShatter.returnShards > 0, '碎裂返还虚空晶屑');
assert.ok(resultShatter.fallbackWeapon, '武器碎裂时必须触发保底铁剑发放');
assert.equal(resultShatter.fallbackWeapon.isFallback, true);
console.log('✓ PASS: +11 碎裂返还晶屑并补发保底新手武器（防死锁）');

// 5. 验证晶屑兑换裂隙星石 (100:1)
const exchangeResult = exchangeShardsForSigils(350);
assert.equal(exchangeResult.sigilsGained, 3, '350 晶屑兑换 3 颗星石');
assert.equal(exchangeResult.remainingShards, 50, '剩余 50 晶屑');
console.log('✓ PASS: 虚空晶屑兑换裂隙星石比例正确 (100:1)');

console.log('=== Task 2 所有测试断言 100% 通过！===');
