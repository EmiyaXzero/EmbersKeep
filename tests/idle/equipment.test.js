import assert from 'node:assert/strict';
import {
  EQUIPMENT_SLOTS,
  RARITY_TIERS,
  generateDrop,
  calculateCombatPower,
  decomposeItem,
  createFallbackWeapon
} from '../../src/idle/equipment.js';

console.log('--- 测试 Task 1: 装备系统与战力数值模型 ---');

// 1. 验证 12 个槽位定义完整性
assert.equal(EQUIPMENT_SLOTS.length, 12, '必须严格包含 12 个装备部位');
assert.ok(EQUIPMENT_SLOTS.includes('weapon'), '包含武器');
assert.ok(EQUIPMENT_SLOTS.includes('top'), '包含上衣');
assert.ok(EQUIPMENT_SLOTS.includes('left_badge'), '包含左槽战神徽章');
assert.ok(EQUIPMENT_SLOTS.includes('right_stone'), '包含右槽混沌魔石');
assert.ok(EQUIPMENT_SLOTS.includes('earring'), '包含灵犀耳坠');
console.log('✓ PASS: 12 部位装备槽位定义完整');

// 2. 验证 6 阶品阶与色系
const expectedRarities = ['common', 'uncommon', 'rare', 'unique', 'epic', 'mythic'];
expectedRarities.forEach(r => {
  assert.ok(RARITY_TIERS[r], `必须包含品阶: ${r}`);
  assert.ok(RARITY_TIERS[r].color.startsWith('#'), `品阶 ${r} 必须包含有效 HEX 颜色`);
});
assert.equal(RARITY_TIERS.epic.name, '太古史诗', '史诗品阶命名合规');
assert.equal(RARITY_TIERS.mythic.name, '永恒神话', '神话品阶命名合规');
console.log('✓ PASS: 6 阶品阶配置与原创命名合规');

// 3. 验证掉落生成函数
const dropNormal = generateDrop(5, false);
assert.ok(dropNormal.id, '掉落物品必须具备唯一 ID');
assert.ok(EQUIPMENT_SLOTS.includes(dropNormal.slot), '掉落槽位合法');
assert.ok(dropNormal.combatPower > 0, '掉落物品战力必须为正数');

const dropBoss = generateDrop(20, true);
assert.ok(['epic', 'mythic', 'unique', 'rare'].includes(dropBoss.rarity), 'Boss 掉落优先保障高品阶');
console.log('✓ PASS: 掉落生成机制正确（小怪/Boss差异）');

// 4. 验证保底新手铁剑
const starter = createFallbackWeapon();
assert.equal(starter.slot, 'weapon', '保底装备必须为武器');
assert.equal(starter.isFallback, true, '标记为保底不可分解');
assert.ok(starter.stats.attack > 0, '保底武器具备基础攻击力');
console.log('✓ PASS: 保底新手铁剑生成合法');

// 5. 验证战力汇总计算
const testEquipMap = {
  weapon: {
    slot: 'weapon',
    stats: { attack: 150, critRate: 0.1 },
    affixes: { directAmp: 0.1 }
  },
  top: {
    slot: 'top',
    stats: { defense: 80, hp: 500 }
  }
};
const cpResult = calculateCombatPower(testEquipMap);
assert.ok(cpResult.totalPower > 200, '战力汇总计算有效');
assert.equal(cpResult.stats.attack, 170, '基础攻击力 20 + 武器 150 = 170');
assert.equal(cpResult.stats.hp, 700, '基础生命 200 + 上衣 500 = 700');
console.log('✓ PASS: 角色综合战力与属性聚合计算正确');

// 6. 验证分解收益
const commonDecomp = decomposeItem({ rarity: 'common', level: 10 });
assert.ok(commonDecomp.gold > 0, '白装分解产金币');
assert.equal(commonDecomp.cinders, 0, '白装不产玄碳');

const rareDecomp = decomposeItem({ rarity: 'rare', level: 20 });
assert.ok(rareDecomp.cinders > 0, '紫装分解必须产出余烬玄碳');

const epicDecomp = decomposeItem({ rarity: 'epic', level: 50 });
assert.ok(epicDecomp.shards > 0, '史诗分解产出虚空晶屑');
console.log('✓ PASS: 装备分解收益与经济产出正确');

console.log('=== Task 1 所有测试断言 100% 通过！===');
