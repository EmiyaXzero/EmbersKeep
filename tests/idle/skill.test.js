import assert from 'node:assert/strict';
import { BattleEngine } from '../../src/idle/battle_engine.js';

console.log('--- 测试 Task 1: 战斗引擎三大主动神技与自动施法 ---');

const engine = new BattleEngine({ heroLevel: 10 });

// 1. 验证技能字典配置
assert.ok(engine.skills, '技能系统已挂载');
assert.ok(engine.skills.Q, '包含 Q 技能 极·拔刀斩');
assert.ok(engine.skills.W, '包含 W 技能 虚空裂地斩');
assert.ok(engine.skills.E, '包含 E 技能 觉醒·剑刃风暴');

assert.equal(engine.skills.Q.name, '极·拔刀斩');
assert.equal(engine.skills.Q.cd, 8000);
assert.equal(engine.skills.Q.currentCd, 0, '初始状态 CD 为 0');
assert.equal(engine.skills.Q.damageRatio, 3.5);

assert.equal(engine.skills.W.name, '虚空裂地斩');
assert.equal(engine.skills.W.cd, 14000);
assert.equal(engine.skills.W.damageRatio, 4.8);

assert.equal(engine.skills.E.name, '觉醒·剑刃风暴');
assert.equal(engine.skills.E.cd, 28000);
assert.equal(engine.skills.E.damageRatio, 9.6);
console.log('✓ PASS: 三大主动神技配置完整且数值规范');

// 2. 验证手动释放技能与冷却进入
// 先生成一个小怪
engine.monsters.push({
  id: 'test_mob_1',
  name: '虚空潜伏者',
  maxHp: 2000,
  hp: 2000,
  x: 250,
  speed: 0,
  attack: 10,
  attackCd: 1000,
  currentCd: 0
});

const resQ = engine.castSkill('Q');
assert.equal(resQ.success, true, '成功释放 Q 极·拔刀斩');
assert.ok(engine.skills.Q.currentCd > 7000, 'Q 技能进入 8 秒冷却');
assert.ok(engine.monsters[0].hp < 2000, '小怪受到大幅神技伤害');

// 冷却中再次释放应当被拦截
const resQFail = engine.castSkill('Q');
assert.equal(resQFail.success, false, '冷却中无法重复释放');
assert.ok(resQFail.remainingCd > 0);
console.log('✓ PASS: 手动释放与冷却拦截机制正确');

// 3. 验证时间推移冷却恢复
engine.tick(4000); // 推进 4 秒
assert.ok(engine.skills.Q.currentCd <= 4000, 'CD 随时间衰减');

engine.tick(4500); // 推进 4.5 秒，CD 应当归零
assert.equal(engine.skills.Q.currentCd, 0, '8 秒后 CD 彻底归零');
console.log('✓ PASS: 时间流逝与冷却自然恢复正确');

// 4. 验证自动施法 (Auto-Cast) 循环
engine.autoCastSkills = true;
// 保证场上有小怪
if (engine.monsters.length === 0) {
  engine.monsters.push({
    id: 'test_mob_2',
    name: '虚空小怪',
    maxHp: 1000,
    hp: 1000,
    x: 220,
    speed: 0,
    attack: 5,
    attackCd: 1000,
    currentCd: 0
  });
}

// 此时 Q 技能冷却为 0，tick 时应自动释放 Q
const events = engine.tick(100);
const castEvent = events.find(e => e.type === 'SKILL_CAST');
assert.ok(castEvent, '自动施法开启时，tick 自动释放可用技能');
assert.equal(castEvent.skillKey, 'Q');
assert.ok(engine.skills.Q.currentCd > 7000, 'Q 技能再次进入冷却');
console.log('✓ PASS: 自动施法开启时智能开大判定正确');

console.log('=== Task 1 所有测试断言 100% 通过！===');

console.log('\n--- 测试 Task 2: 地面物理喷装与自动磁吸系统 ---');

// 1. 验证掉落物生成
const initialDropCount = engine.groundDrops.length;
const testMob = {
  id: 'mob_drop_test',
  name: '虚空魔狼',
  type: 'wolf',
  x: 200,
  hp: 0
};
const dropEvents = [];
engine.handleMobKilled(testMob, dropEvents);

assert.ok(engine.groundDrops.length > initialDropCount, '击杀小怪向地面生成物理掉落物');
const newDrop = engine.groundDrops[engine.groundDrops.length - 1];
assert.ok(newDrop.id, '掉落物具有唯一 ID');
assert.ok(newDrop.vy < 0, '掉落物具备初始向上起跳速度');
assert.equal(newDrop.isMagnet, false, '初始状态尚未进入磁吸');
console.log('✓ PASS: 怪物击杀物理抛物线地面掉落物生成正确');

// 2. 验证时间推移与磁吸触发
engine.tick(700); // 推进 700ms (大于 600ms 磁吸阈值)
assert.equal(newDrop.isMagnet, true, '落地 600ms 后自动激活磁吸模式');
console.log('✓ PASS: 落地后自动激活磁吸状态');

// 3. 验证飞向英雄并完成拾取入包
let pickedUp = false;
for (let i = 0; i < 20; i++) {
  const tickEvents = engine.tick(100);
  if (tickEvents.some(e => e.type === 'DROP_PICKUP')) {
    pickedUp = true;
    break;
  }
}
assert.equal(pickedUp, true, '磁吸飞入英雄范围后触发 DROP_PICKUP 结算入包');
console.log('✓ PASS: 磁吸飞行动画与最终拾取入包事件正确');
console.log('=== Task 2 所有测试断言 100% 通过！===');

