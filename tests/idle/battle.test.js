import assert from 'node:assert/strict';
import { BattleEngine } from '../../src/idle/battle_engine.js';

console.log('--- 测试 Task 3: 战斗状态机与裂隙方尖碑循环 ---');

// 1. 初始化引擎
const engine = new BattleEngine({
  heroLevel: 10,
  initialSigils: 0
});

assert.ok(engine.hero, '英雄实例创建有效');
assert.ok(engine.hero.combatPower > 0, '英雄具备基础战力');
assert.equal(engine.state, 'NORMAL_GRIND', '初始为常规长廊挂机状态');
console.log('✓ PASS: 战斗引擎初始化有效');

// 2. 模拟常规割草战斗与小怪掉落
let monsterKilled = false;
for (let i = 0; i < 50; i++) {
  const events = engine.tick(100); // 步进 100ms
  if (events.some(e => e.type === 'MONSTER_DEATH')) {
    monsterKilled = true;
    break;
  }
}
assert.ok(monsterKilled, '英雄自动索敌并在短时间内斩杀小怪');
assert.ok(engine.wallet.gold > 0, '击杀小怪获得金币');
console.log('✓ PASS: 自动索敌斩杀与小怪掉落循环正确');

// 3. 验证裂隙方尖碑触发 (满 20 颗裂隙星石)
engine.wallet.riftSigils = 25;
const spawnEvent = engine.checkOrTriggerRiftEvent();
assert.equal(engine.state, 'OBELISK_SPAWN', '满 20 星石进入裂隙破界状态');
assert.equal(engine.wallet.riftSigils, 5, '扣除 20 颗裂隙星石');
assert.ok(engine.activeObelisk, '战场生成裂隙方尖碑');
console.log('✓ PASS: 裂隙方尖碑生成与星石扣减正确');

// 4. 击碎石碑与 Boss 唤醒
for (let i = 0; i < 100; i++) {
  engine.tick(100);
  if (engine.state === 'BOSS_ENCOUNTER') break;
}
assert.equal(engine.state, 'BOSS_ENCOUNTER', '击碎方尖碑唤醒裂隙霸主 Boss');
assert.ok(engine.activeBoss, '生成裂隙霸主 Boss 实例');
assert.ok(engine.bossTimer > 0, '启动 60 秒限时挑战时钟');
console.log('✓ PASS: 方尖碑破碎与 60 秒 Boss 战启动');

// 5. 验证 Boss 战超时遁走保底（用户确认的方案 A）
engine.bossTimer = 100; // 人工置为仅剩 100ms
const timeoutEvents = engine.tick(200); // 步进 200ms 触发超时
assert.equal(engine.state, 'NORMAL_GRIND', 'Boss 超时遁走平滑回退至普通长廊');
assert.ok(timeoutEvents.some(e => e.type === 'BOSS_FLED'), '派发 Boss 遁走事件');
assert.ok(engine.wallet.shards > 0, '超时仍发放保底虚空晶屑，绝不白打');
console.log('✓ PASS: Boss 战 60 秒超时遁走与保底产出正确（方案 A 验证通过）');

// 6. 验证 Boss 战斩杀爆史诗金光
engine.wallet.riftSigils = 20;
engine.checkOrTriggerRiftEvent();
// 击碎石碑
for (let i = 0; i < 100; i++) {
  engine.tick(100);
  if (engine.state === 'BOSS_ENCOUNTER') break;
}
assert.equal(engine.state, 'BOSS_ENCOUNTER');
// 斩杀 Boss
engine.activeBoss.hp = 1;
engine.hero.attackCooldown = 0;
const killEvents = engine.tick(100);
assert.ok(killEvents.some(e => e.type === 'EPIC_DROP'), '击杀 Boss 必须触发 EPIC_DROP 史诗掉落事件');
assert.ok(engine.inventory.some(item => ['epic', 'mythic', 'unique'].includes(item.rarity)), '史诗装备成功存入背包');
console.log('✓ PASS: 击杀 Boss 爆出太古史诗金光与神装入包');

console.log('=== Task 3 所有测试断言 100% 通过！===');
