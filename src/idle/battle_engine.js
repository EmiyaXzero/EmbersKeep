/**
 * 《余烬裂隙》核心战斗状态机与裂隙方尖碑数值引擎 (battle_engine.js)
 * -------------------------------------------------------------
 * 纯数值计算引擎，不依赖任何 DOM 或窗口对象。
 * 可同时在主线程与 Web Worker 中高效稳定运行。
 */

import {
  EQUIPMENT_SLOTS,
  calculateCombatPower,
  createFallbackWeapon,
  decomposeItem,
  generateDrop
} from './equipment.js';

export class BattleEngine {
  constructor(config = {}) {
    this.hero = {
      name: '余烬流浪剑士',
      level: config.heroLevel || 1,
      exp: 0,
      maxExp: 100,
      hp: 1000,
      maxHp: 1000,
      attackCooldown: 0,
      x: 100, // 走廊固定站位/巡航位
      y: 110
    };

    // 初始装备
    this.equippedMap = {
      weapon: createFallbackWeapon()
    };

    this.inventory = []; // 未装备背包格 (上限 24)
    this.wallet = {
      gold: 500,
      cinders: 5,
      shards: 0,
      riftSigils: config.initialSigils || 0
    };

    this.autoDecompose = {
      common: true,
      uncommon: true,
      rare: false
    };

    this.state = 'NORMAL_GRIND'; // 'NORMAL_GRIND' | 'OBELISK_SPAWN' | 'BOSS_ENCOUNTER'
    this.monsters = [];
    this.activeObelisk = null;
    this.activeBoss = null;
    this.bossTimer = 0;
    this.waveNumber = 1;
    this.distanceWalked = 0;

    this.updateHeroStats();
  }

  /**
   * 刷新角色战力与面板属性
   */
  updateHeroStats() {
    const cpData = calculateCombatPower(this.equippedMap);
    // 英雄基础属性随等级成长
    cpData.stats.attack += (this.hero.level - 1) * 6;
    cpData.stats.hp += (this.hero.level - 1) * 30;

    this.hero.combatPower = cpData.totalPower + (this.hero.level - 1) * 20;
    this.hero.stats = cpData.stats;
    this.hero.maxHp = cpData.stats.hp || 1000;
    this.hero.hp = Math.min(this.hero.hp, this.hero.maxHp);
  }

  /**
   * 主循环心跳 tick
   */
  tick(deltaMs = 100) {
    const events = [];
    const dtSeconds = deltaMs / 1000;
    this.distanceWalked += 50 * dtSeconds; // 恒定视差推进

    // 主角攻击 CD 恢复
    this.hero.attackCooldown = Math.max(0, this.hero.attackCooldown - deltaMs);

    // 生命自动缓回
    if (this.hero.hp < this.hero.maxHp) {
      this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + Math.round(20 * dtSeconds));
    }

    if (this.state === 'NORMAL_GRIND') {
      this.tickNormalGrind(deltaMs, events);
    } else if (this.state === 'OBELISK_SPAWN') {
      this.tickObelisk(deltaMs, events);
    } else if (this.state === 'BOSS_ENCOUNTER') {
      this.tickBoss(deltaMs, events);
    }

    return events;
  }

  /**
   * 常规长廊挂机波次
   */
  tickNormalGrind(deltaMs, events) {
    // 刷怪补齐 (维持 2~3 只怪物在视野中)
    if (this.monsters.length < 3) {
      const monsterType = Math.random() < 0.6 ? 'ashen_wolf' : 'crawler';
      const baseHp = monsterType === 'ashen_wolf' ? 45 : 95;
      const monsterHp = Math.round(baseHp * (1 + this.hero.level * 0.15));

      this.monsters.push({
        id: `mob_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: monsterType === 'ashen_wolf' ? '灰烬恶狼' : '剧毒爬行者',
        type: monsterType,
        hp: monsterHp,
        maxHp: monsterHp,
        x: 320 + Math.random() * 80,
        speed: monsterType === 'ashen_wolf' ? 90 : 65
      });
    }

    // 怪物移动逼近主角
    for (const mob of this.monsters) {
      if (mob.x > 180) {
        mob.x -= mob.speed * (deltaMs / 1000);
      }
    }

    // 索敌与挥砍
    const target = this.monsters.find(m => m.x <= 260);
    if (target && this.hero.attackCooldown <= 0) {
      this.hero.attackCooldown = Math.max(350, Math.round(800 / (this.hero.stats.attackSpeed || 1.0)));

      // 计算暴击与伤害
      const isCrit = Math.random() < (this.hero.stats.critRate || 0.05);
      const critMultiplier = isCrit ? 1.5 : 1.0;
      const baseDmg = this.hero.stats.attack * critMultiplier;
      const damage = Math.round(baseDmg * (0.9 + Math.random() * 0.2));

      target.hp -= damage;
      events.push({
        type: 'DAMAGE_NUMBER',
        x: target.x,
        y: this.hero.y - 20,
        damage,
        isCrit
      });

      // 击杀判定
      if (target.hp <= 0) {
        this.monsters = this.monsters.filter(m => m.id !== target.id);
        this.handleMobKilled(target, events);
      }
    }

    // 自动检测是否满足裂隙破界触发条件 (20 颗裂隙星石)
    if (this.wallet.riftSigils >= 20) {
      this.checkOrTriggerRiftEvent();
    }
  }

  /**
   * 处理小怪死亡产出
   */
  handleMobKilled(mob, events) {
    const gainedGold = Math.round(30 + this.hero.level * 8 + Math.random() * 20);
    const gainedExp = 25 + this.hero.level * 5;

    this.wallet.gold += gainedGold;
    this.hero.exp += gainedExp;

    if (this.hero.exp >= this.hero.maxExp) {
      this.hero.level += 1;
      this.hero.exp -= this.hero.maxExp;
      this.hero.maxExp = Math.round(this.hero.maxExp * 1.3);
      this.updateHeroStats();
      events.push({ type: 'LEVEL_UP', level: this.hero.level });
    }

    events.push({
      type: 'MONSTER_DEATH',
      monsterType: mob.type,
      x: mob.x,
      y: this.hero.y
    });

    // 35% 概率掉落【裂隙星石】
    if (Math.random() < 0.35) {
      this.wallet.riftSigils += 1;
      events.push({ type: 'SIGIL_DROP', count: this.wallet.riftSigils });
    }

    // 25% 概率掉落装备
    if (Math.random() < 0.25) {
      const drop = generateDrop(this.hero.level, false);
      if (this.autoDecompose[drop.rarity]) {
        // 自动分解
        const yieldData = decomposeItem(drop);
        this.wallet.gold += yieldData.gold;
        this.wallet.cinders += yieldData.cinders;
        this.wallet.shards += yieldData.shards;
        events.push({ type: 'AUTO_DECOMPOSE', item: drop, yield: yieldData });
      } else {
        if (this.inventory.length < 24) {
          this.inventory.push(drop);
          events.push({ type: 'LOOT_DROP', item: drop });
        }
      }
    }
  }

  /**
   * 触发裂隙破界事件 (消耗 20 颗星石)
   */
  checkOrTriggerRiftEvent() {
    if (this.wallet.riftSigils < 20 || this.state !== 'NORMAL_GRIND') {
      return false;
    }

    this.wallet.riftSigils -= 20;
    this.monsters = []; // 清理普通小怪
    this.state = 'OBELISK_SPAWN';

    const obeliskHp = Math.round(350 * (1 + this.hero.level * 0.2));
    this.activeObelisk = {
      id: 'rift_obelisk_active',
      name: '远古裂隙方尖碑',
      hp: obeliskHp,
      maxHp: obeliskHp,
      stage: 1, // 1: 完好, 2: 龟裂发红, 3: 濒临破碎
      x: 380
    };

    return true;
  }

  /**
   * 方尖碑受击心跳
   */
  tickObelisk(deltaMs, events) {
    if (!this.activeObelisk) return;

    if (this.hero.attackCooldown <= 0) {
      this.hero.attackCooldown = 400;
      const damage = Math.round(this.hero.stats.attack * 1.2);
      this.activeObelisk.hp -= damage;

      // 阶段演进
      const hpRatio = this.activeObelisk.hp / this.activeObelisk.maxHp;
      if (hpRatio < 0.33) this.activeObelisk.stage = 3;
      else if (hpRatio < 0.66) this.activeObelisk.stage = 2;

      events.push({
        type: 'OBELISK_HIT',
        damage,
        stage: this.activeObelisk.stage,
        x: this.activeObelisk.x,
        y: this.hero.y - 25
      });

      // 石碑碎裂，唤醒裂隙霸主 Boss
      if (this.activeObelisk.hp <= 0) {
        this.activeObelisk = null;
        this.state = 'BOSS_ENCOUNTER';
        this.bossTimer = 60000; // 60秒限时

        const bossMaxHp = Math.round(8000 * (1 + this.hero.level * 0.8));
        this.activeBoss = {
          id: 'boss_wolf_overlord',
          name: '裂隙霸主·暴怒狼王',
          type: 'boss_wolf',
          hp: bossMaxHp,
          maxHp: bossMaxHp,
          x: 420
        };

        events.push({
          type: 'OBELISK_SHATTER',
          boss: this.activeBoss
        });
      }
    }
  }

  /**
   * 裂隙霸主 Boss 限时对决
   */
  tickBoss(deltaMs, events) {
    if (!this.activeBoss) return;

    this.bossTimer -= deltaMs;

    // 主角对 Boss 持续输出
    if (this.hero.attackCooldown <= 0) {
      this.hero.attackCooldown = Math.max(300, Math.round(750 / (this.hero.stats.attackSpeed || 1.0)));
      const isCrit = Math.random() < (this.hero.stats.critRate || 0.05);
      const damage = Math.round(this.hero.stats.attack * (isCrit ? 1.6 : 1.0) * (0.95 + Math.random() * 0.1));

      this.activeBoss.hp -= damage;
      events.push({
        type: 'DAMAGE_NUMBER',
        x: this.activeBoss.x,
        y: this.hero.y - 30,
        damage,
        isCrit
      });

      // 击杀胜利判定
      if (this.activeBoss.hp <= 0) {
        const epicDrop = generateDrop(this.hero.level + 5, true); // Boss 高品阶掉落保底
        this.inventory.push(epicDrop);

        // 巨量金币与材料
        this.wallet.gold += 15000 + this.hero.level * 1000;
        this.wallet.cinders += 25;
        this.wallet.shards += 8;

        events.push({
          type: 'EPIC_DROP',
          item: epicDrop,
          x: this.activeBoss.x,
          y: this.hero.y
        });

        this.activeBoss = null;
        this.state = 'NORMAL_GRIND';
        return;
      }
    }

    // 超时遁走保底判定 (用户确认的方案 A)
    if (this.bossTimer <= 0) {
      this.wallet.gold += 3000;
      this.wallet.shards += 12; // 保底晶屑

      events.push({
        type: 'BOSS_FLED',
        shards: 12,
        gold: 3000
      });

      this.activeBoss = null;
      this.state = 'NORMAL_GRIND';
    }
  }

  /**
   * 穿戴装备
   */
  equipItem(itemIndex) {
    if (itemIndex < 0 || itemIndex >= this.inventory.length) return false;
    const item = this.inventory[itemIndex];
    const oldItem = this.equippedMap[item.slot];

    this.equippedMap[item.slot] = item;
    this.inventory.splice(itemIndex, 1);
    if (oldItem) {
      this.inventory.push(oldItem);
    }

    this.updateHeroStats();
    return true;
  }

  /**
   * 一键穿戴最高战力装备
   */
  autoEquipBest() {
    let changed = false;
    for (const slot of EQUIPMENT_SLOTS) {
      let bestItemIndex = -1;
      let highestPower = this.equippedMap[slot] ? (this.equippedMap[slot].combatPower || 0) : -1;

      this.inventory.forEach((item, idx) => {
        if (item.slot === slot && item.combatPower > highestPower) {
          highestPower = item.combatPower;
          bestItemIndex = idx;
        }
      });

      if (bestItemIndex !== -1) {
        this.equipItem(bestItemIndex);
        changed = true;
      }
    }
    return changed;
  }

  /**
   * 一键分解背包内所有白蓝装
   */
  decomposeAllJunk() {
    let totalYield = { gold: 0, cinders: 0, shards: 0 };
    const remaining = [];

    for (const item of this.inventory) {
      if (['common', 'uncommon'].includes(item.rarity)) {
        const y = decomposeItem(item);
        totalYield.gold += y.gold;
        totalYield.cinders += y.cinders;
        totalYield.shards += y.shards;
      } else {
        remaining.push(item);
      }
    }

    this.inventory = remaining;
    this.wallet.gold += totalYield.gold;
    this.wallet.cinders += totalYield.cinders;
    this.wallet.shards += totalYield.shards;

    return totalYield;
  }

  /**
   * 获取状态快照 (供 Canvas 渲染器与 UI 显示)
   */
  getStateSnapshot() {
    return {
      hero: {
        name: this.hero.name,
        level: this.hero.level,
        exp: this.hero.exp,
        maxExp: this.hero.maxExp,
        hp: this.hero.hp,
        maxHp: this.hero.maxHp,
        combatPower: this.hero.combatPower,
        stats: this.hero.stats,
        x: this.hero.x,
        y: this.hero.y
      },
      equippedMap: { ...this.equippedMap },
      inventory: [...this.inventory],
      wallet: { ...this.wallet },
      state: this.state,
      monsters: this.monsters.map(m => ({ ...m })),
      activeObelisk: this.activeObelisk ? { ...this.activeObelisk } : null,
      activeBoss: this.activeBoss ? { ...this.activeBoss } : null,
      bossTimer: this.bossTimer,
      distanceWalked: this.distanceWalked
    };
  }
}
