/**
 * game.js - 《余烬守夜》（EmbersKeep）核心可玩原型引擎
 */

// 预加载贴图
const TEXTURES = {
  turret_crossbow: 'assets/textures/2x/towers/crossbow_turret.png',
  turret_flame: 'assets/textures/2x/towers/flame_altar.png',
  turret_wall: 'assets/textures/2x/towers/stone_wall.png',
  mob_wolf: 'assets/textures/2x/monsters/ashen_wolf.png',
  mob_crawler: 'assets/textures/2x/monsters/crawler.png',
  mob_boss: 'assets/textures/2x/monsters/boss_wolf.png',
  core_wolf: 'assets/textures/2x/cores/wolf_core.png',
  core_thunder: 'assets/textures/2x/cores/thunder_core.png'
};

const images = {};
let loadedImagesCount = 0;
const totalImages = Object.keys(TEXTURES).length;

function loadAssets(callback) {
  for (const [key, src] of Object.entries(TEXTURES)) {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      images[key] = img;
      loadedImagesCount++;
      if (loadedImagesCount === totalImages) {
        callback();
      }
    };
    img.onerror = () => {
      console.warn(`Failed loading image: ${src}`);
      loadedImagesCount++;
      if (loadedImagesCount === totalImages) {
        callback();
      }
    };
  }
}

// 游戏全局状态
const gameState = {
  canvas: null,
  ctx: null,
  width: 960,
  height: 640,
  speed: 1,
  paused: false,
  waveRunning: false,
  currentWave: 1,
  maxWaves: 5,

  // 资源背包
  inventory: {
    wolf_core: 2,       // 初始赠送2个方便试玩锻造
    thunder_core: 1,    // 初始赠送1个体验雷霆弩
    iron_scrap: 10
  },

  // 炉火结界（基地）
  hearth: {
    x: 480,
    y: 320,
    radius: 38,
    hp: 1000,
    maxHp: 1000,
    lightRadius: 280
  },

  // 防御塔插槽 (4个基地方位)
  sockets: [
    { id: 0, x: 410, y: 250, label: 'NW', turret: null },
    { id: 1, x: 550, y: 250, label: 'NE', turret: null },
    { id: 2, x: 410, y: 390, label: 'SW', turret: null },
    { id: 3, x: 550, y: 390, label: 'SE', turret: null }
  ],

  // 玩家当前卡组
  deck: [
    { id: 'card_crossbow', name: '基础弩箭塔', type: 'crossbow', texture: 'turret_crossbow', dmg: 26, range: 220, rate: 1.2 },
    { id: 'card_crossbow_2', name: '基础弩箭塔', type: 'crossbow', texture: 'turret_crossbow', dmg: 26, range: 220, rate: 1.2 },
    { id: 'card_flame', name: '火焰祭坛', type: 'flame', texture: 'turret_flame', dmg: 14, range: 170, rate: 0.6 },
    { id: 'card_wall', name: '防御石墙', type: 'wall', texture: 'turret_wall', hp: 900, maxHp: 900 }
  ],
  selectedDeckIndex: null,

  // 实体与粒子
  enemies: [],
  projectiles: [],
  particles: [],
  damageTexts: [],
  lootItems: [],
  groundEffects: [],

  // 肉鸽已激活技能词条
  activePerks: new Set(), // 'pierce', 'ember_echo', 'molten_heart', 'iron_will', 'thunder_resonance'

  // 波次生成配置
  waveTimer: 0,
  spawnQueue: []
};

// 初始化游戏
function initGame() {
  gameState.canvas = document.getElementById('game-canvas');
  gameState.ctx = gameState.canvas.getContext('2d');
  gameState.canvas.width = gameState.width;
  gameState.canvas.height = gameState.height;

  // 默认装配：NW(西北)为初始弩塔，SW(西南)为防御石墙（展示拦截阻挡、反伤与减伤），NE和SE为空位
  gameState.sockets[0].turret = { ...gameState.deck[0], level: 1, lastShot: 0 };
  gameState.sockets[2].turret = { 
    ...gameState.deck[3], 
    level: 1, 
    lastShot: 0, 
    hp: 900, 
    maxHp: 900, 
    reflectRate: 0.5, 
    hitCount: 0 
  };

  setupEvents();
  updateHUD();
  renderDeck();

  requestAnimationFrame(gameLoop);
}

// 事件监听
function setupEvents() {
  const canvas = gameState.canvas;

  // 画布点击：选中插槽放置或交互
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // 检查插槽点击
    for (const socket of gameState.sockets) {
      const dist = Math.hypot(mx - socket.x, my - socket.y);
      if (dist <= 35) {
        if (gameState.selectedDeckIndex !== null) {
          const card = gameState.deck[gameState.selectedDeckIndex];
          if (card) {
            socket.turret = { 
              ...card, 
              level: 1,
              lastShot: 0, 
              hp: card.hp || 0, 
              maxHp: card.maxHp || 0,
              reflectRate: 0.5,
              hitCount: 0
            };
            window.soundEngine.playShoot();
            spawnSparks(socket.x, socket.y, '#fad65a', 15);
            addDamageText(socket.x, socket.y - 30, `部署: ${card.name}`, '#fad65a');
            gameState.selectedDeckIndex = null;
            renderDeck();
          }
        } else if (socket.turret) {
          // 未选卡牌，且点击已有防御塔：打开【防御塔强化升级与核心融合】面板！
          openTurretUpgradeModal(socket);
        }
        break;
      }
    }
  });

  // 鼠标移动检测悬浮
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let hovered = null;
    for (const socket of gameState.sockets) {
      if (Math.hypot(mx - socket.x, my - socket.y) <= 35) {
        hovered = socket;
        break;
      }
    }
    gameState.hoveredSocket = hovered;
    canvas.style.cursor = hovered ? 'pointer' : 'default';
  });

  // 按钮交互
  const waveBtn = document.getElementById('btn-wave');
  waveBtn.addEventListener('click', () => {
    if (!gameState.waveRunning) {
      startWave(gameState.currentWave);
    } else {
      gameState.paused = !gameState.paused;
      updateHUD();
    }
  });

  const speedBtn = document.getElementById('btn-speed');
  speedBtn.addEventListener('click', () => {
    gameState.speed = gameState.speed === 1 ? 2 : 1;
    speedBtn.querySelector('.btn-text').innerText = `⏩ ${gameState.speed}x`;
  });

  document.getElementById('btn-forge').addEventListener('click', () => {
    openForgeModal();
  });

  const muteBtn = document.getElementById('btn-mute');
  muteBtn.addEventListener('click', () => {
    const muted = window.soundEngine.toggleMute();
    muteBtn.querySelector('.btn-text').innerText = muted ? '🔇' : '🔊';
  });

  // 键盘快捷键监听 [1~4 秒选卡牌, Space 出征/暂停, F 锻造工坊]
  window.addEventListener('keydown', (e) => {
    if (document.getElementById('modal-overlay').classList.contains('active')) return;
    if (e.key >= '1' && e.key <= '4') {
      const idx = parseInt(e.key) - 1;
      if (idx < gameState.deck.length) {
        gameState.selectedDeckIndex = gameState.selectedDeckIndex === idx ? null : idx;
        renderDeck();
      }
    } else if (e.code === 'Space') {
      e.preventDefault();
      waveBtn.click();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      openForgeModal();
    }
  });
}

// 开始波次
function startWave(waveNum) {
  gameState.waveRunning = true;
  gameState.waveTimer = 0;
  gameState.spawnQueue = [];
  updateHUD();

  const count = 8 + (waveNum - 1) * 6;
  for (let i = 0; i < count; i++) {
    const isCrawler = waveNum >= 2 && i % 3 === 0;
    gameState.spawnQueue.push({
      delay: i * 0.9,
      type: isCrawler ? 'crawler' : 'wolf'
    });
  }

  // 第 5 波加入 Boss
  if (waveNum === 5) {
    gameState.spawnQueue.push({
      delay: 5.0,
      type: 'boss'
    });
  }

  addDamageText(gameState.hearth.x, gameState.hearth.y - 80, `—— 第 ${waveNum} 波灰潮来袭 ——`, '#f28929');
}

// 刷新顶部 HUD (Dark Fantasy Diegetic Bar)
function updateHUD() {
  const hpEl = document.getElementById('hud-hp-text');
  const barEl = document.getElementById('hud-hp-bar');
  if (hpEl && barEl) {
    const curHp = Math.max(0, Math.floor(gameState.hearth.hp));
    const maxHp = gameState.hearth.maxHp;
    hpEl.innerText = `${curHp} / ${maxHp}`;
    const pct = Math.max(0, Math.min(100, (curHp / maxHp) * 100));
    barEl.style.width = `${pct}%`;
    if (pct < 30) {
      barEl.style.background = 'linear-gradient(90deg, #991b1b 0%, #e11d48 100%)';
    } else {
      barEl.style.background = 'linear-gradient(90deg, #d94126 0%, #f28929 60%, #fad65a 100%)';
    }
  }

  // 波次更新
  const waveCountEl = document.getElementById('hud-wave-count');
  if (waveCountEl) {
    waveCountEl.innerText = `第 ${gameState.currentWave} / ${gameState.maxWaves} 波`;
  }
  for (let i = 1; i <= 5; i++) {
    const stepEl = document.getElementById(`w-step-${i}`);
    if (stepEl) {
      const isBoss = (i === 5);
      if (i < gameState.currentWave) {
        stepEl.className = `wave-step passed${isBoss ? ' boss' : ''}`;
      } else if (i === gameState.currentWave) {
        stepEl.className = `wave-step current${isBoss ? ' boss' : ''}`;
      } else {
        stepEl.className = `wave-step${isBoss ? ' boss' : ''}`;
      }
    }
  }

  // 资源储备更新 (零折行)
  const wolfEl = document.getElementById('val-wolf');
  if (wolfEl) wolfEl.innerText = gameState.inventory.wolf_core;
  const thunderEl = document.getElementById('val-thunder');
  if (thunderEl) thunderEl.innerText = gameState.inventory.thunder_core;
  const scrapEl = document.getElementById('val-scrap');
  if (scrapEl) scrapEl.innerText = gameState.inventory.iron_scrap;

  // 出征按钮状态与文案
  const waveBtn = document.getElementById('btn-wave');
  if (waveBtn) {
    const textEl = waveBtn.querySelector('.btn-text');
    if (textEl) {
      if (gameState.waveRunning) {
        textEl.innerText = gameState.paused ? '▶ 继续战斗' : '⏸ 战斗中';
      } else {
        textEl.innerText = `▶ 出征第 ${gameState.currentWave} 波`;
      }
    }
  }
}

// 渲染底部实体卡组 (Tactile Deck Rail)
function renderDeck() {
  const container = document.getElementById('deck-cards');
  if (!container) return;
  container.innerHTML = '';

  gameState.deck.forEach((card, idx) => {
    const cardEl = document.createElement('div');
    cardEl.className = `card-item ${gameState.selectedDeckIndex === idx ? 'selected' : ''}`;
    cardEl.title = `${card.name}\n${card.type === 'wall' ? '防线拦截·反弹反噬' : '攻击伤害: ' + card.dmg}`;

    // 快捷键角标
    const hotkeyEl = document.createElement('div');
    hotkeyEl.className = 'card-hotkey';
    hotkeyEl.innerText = `${idx + 1}`;
    cardEl.appendChild(hotkeyEl);

    // 卡面名称
    const nameEl = document.createElement('div');
    nameEl.className = 'card-name-ribbon';
    nameEl.innerText = card.name.length > 5 ? card.name.slice(0, 4) + '..' : card.name;
    cardEl.appendChild(nameEl);

    // 卡牌插画框
    const artEl = document.createElement('div');
    artEl.className = 'card-art-frame';
    const imgEl = document.createElement('img');
    imgEl.src = TEXTURES[card.texture];
    artEl.appendChild(imgEl);
    cardEl.appendChild(artEl);

    // 战术属性条
    const statEl = document.createElement('div');
    statEl.className = 'card-stat-pill';
    statEl.innerText = card.type === 'wall' ? `🛡️${card.hp}` : `⚔️${card.dmg}`;
    cardEl.appendChild(statEl);

    cardEl.addEventListener('click', () => {
      gameState.selectedDeckIndex = gameState.selectedDeckIndex === idx ? null : idx;
      renderDeck();
    });

    container.appendChild(cardEl);
  });
}

// 主循环
let lastTime = performance.now();
function gameLoop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.1) * gameState.speed;
  lastTime = time;

  if (!gameState.paused) {
    update(dt);
  }
  render();

  requestAnimationFrame(gameLoop);
}

// 逻辑更新
function update(dt) {
  // 1. 处理波次刷怪
  if (gameState.waveRunning) {
    gameState.waveTimer += dt;
    for (let i = gameState.spawnQueue.length - 1; i >= 0; i--) {
      const item = gameState.spawnQueue[i];
      if (gameState.waveTimer >= item.delay) {
        spawnEnemy(item.type);
        gameState.spawnQueue.splice(i, 1);
      }
    }

    // 波次胜利判定
    if (gameState.spawnQueue.length === 0 && gameState.enemies.length === 0) {
      endWaveVictory();
    }
  }

  // 2. 怪物更新与向中心行进
  for (let i = gameState.enemies.length - 1; i >= 0; i--) {
    const enemy = gameState.enemies[i];
    const dx = gameState.hearth.x - enemy.x;
    const dy = gameState.hearth.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    // 检查是否被在场的城墙 (Wall) 阻挡拦截
    let interceptedWall = null;
    let wallSocket = null;
    for (const sock of gameState.sockets) {
      if (sock.turret && sock.turret.type === 'wall' && sock.turret.hp > 0) {
        const dWall = Math.hypot(sock.x - enemy.x, sock.y - enemy.y);
        if (dWall <= 58) {
          interceptedWall = sock.turret;
          wallSocket = sock;
          break;
        }
      }
    }

    if (interceptedWall) {
      // 敌人被城墙坚决阻挡，被迫攻击城墙！
      enemy.attackCooldown = (enemy.attackCooldown || 0) + dt;
      if (enemy.attackCooldown >= 0.8) {
        enemy.attackCooldown = 0;
        interceptedWall.hp -= enemy.atk;
        window.soundEngine.playHit();
        addDamageText(wallSocket.x, wallSocket.y - 35, `-${enemy.atk}`, '#e11d48');
        spawnSparks(wallSocket.x, wallSocket.y, '#e11d48', 6);

        // 1. 荆棘反伤 (Thorns Retaliation): 反弹伤害
        const reflectRate = interceptedWall.reflectRate || 0.5;
        const reflectDmg = Math.max(6, Math.round(enemy.atk * reflectRate));
        applyDamage(enemy, reflectDmg, '#24a163');
        addDamageText(enemy.x, enemy.y - 25, `荆棘反弹 ${reflectDmg}`, '#24a163');

        // 2. 岩刺爆震 (Spike Tremor): 每受击3次触发地刺冲击波与击退
        interceptedWall.hitCount = (interceptedWall.hitCount || 0) + 1;
        if (interceptedWall.hitCount % 3 === 0) {
          window.soundEngine.playExplosion();
          spawnSparks(wallSocket.x, wallSocket.y, '#fad65a', 20);
          addDamageText(wallSocket.x, wallSocket.y - 50, '⚡ 岩刺爆震!', '#fad65a');
          for (const nearE of gameState.enemies) {
            const dNear = Math.hypot(nearE.x - wallSocket.x, nearE.y - wallSocket.y);
            if (dNear <= 85) {
              applyDamage(nearE, 35, '#fad65a');
              const pushAngle = Math.atan2(nearE.y - wallSocket.y, nearE.x - wallSocket.x);
              nearE.x += Math.cos(pushAngle) * 45;
              nearE.y += Math.sin(pushAngle) * 45;
            }
          }
        }

        // 城墙耐久归零碎裂
        if (interceptedWall.hp <= 0) {
          addDamageText(wallSocket.x, wallSocket.y - 20, '💥 城墙失守碎裂!', '#e11d48');
          window.soundEngine.playExplosion();
          wallSocket.turret = null;
        }
      }
    } else if (dist <= gameState.hearth.radius + 15) {
      // 碰撞攻击圣坛基地
      enemy.attackCooldown = (enemy.attackCooldown || 0) + dt;
      if (enemy.attackCooldown >= 1.0) {
        enemy.attackCooldown = 0;

        // 计算所有存活城墙提供的庇护减伤 (-15% per wall)
        const wallCount = gameState.sockets.filter(s => s.turret && s.turret.type === 'wall' && s.turret.hp > 0).length;
        const dmgReduction = Math.min(0.6, wallCount * 0.15);
        const actualDmg = Math.max(1, Math.round(enemy.atk * (1 - dmgReduction)));

        gameState.hearth.hp -= actualDmg;
        window.soundEngine.playHit();
        addDamageText(gameState.hearth.x, gameState.hearth.y - 40, `-${actualDmg}`, '#e11d48');
        spawnSparks(gameState.hearth.x, gameState.hearth.y, '#e11d48', 8);

        // 钢铁意志被动：受击回血
        if (gameState.activePerks.has('iron_will')) {
          const heal = Math.floor(gameState.hearth.maxHp * 0.02);
          gameState.hearth.hp = Math.min(gameState.hearth.maxHp, gameState.hearth.hp + heal);
          addDamageText(gameState.hearth.x, gameState.hearth.y - 60, `+${heal} 意志`, '#24a163');
        }

        // 基地被毁判定
        if (gameState.hearth.hp <= 0) {
          gameOver(false);
          return;
        }
        updateHUD();
      }
    } else {
      // 移动
      const angle = Math.atan2(dy, dx);
      enemy.x += Math.cos(angle) * enemy.speed * dt;
      enemy.y += Math.sin(angle) * enemy.speed * dt;
    }

    // 死亡判定
    if (enemy.hp <= 0) {
      handleEnemyDeath(enemy);
      gameState.enemies.splice(i, 1);
    }
  }

  // 3. 防御塔自动攻击
  gameState.sockets.forEach(sock => {
    const turret = sock.turret;
    if (!turret || turret.type === 'wall') return;

    turret.lastShot = (turret.lastShot || 0) + dt;
    const interval = 1 / (turret.rate * (turret.burst ? 1.5 : 1.0));

    if (turret.lastShot >= interval) {
      // 索敌最近敌人
      let target = null;
      let minDist = turret.range;
      for (const e of gameState.enemies) {
        const d = Math.hypot(e.x - sock.x, e.y - sock.y);
        if (d <= minDist) {
          minDist = d;
          target = e;
        }
      }

      if (target) {
        turret.lastShot = 0;
        fireTurret(sock, turret, target);
      }
    }
  });

  // 4. 投射物飞行与碰撞
  for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
    const p = gameState.projectiles[i];
    p.life -= dt;
    if (p.life <= 0) {
      gameState.projectiles.splice(i, 1);
      continue;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // 碰撞敌人
    for (const enemy of gameState.enemies) {
      if (p.hitTargets && p.hitTargets.has(enemy)) continue;
      const d = Math.hypot(enemy.x - p.x, enemy.y - p.y);
      if (d <= enemy.radius + p.radius) {
        applyProjectileHit(p, enemy);
        if (!p.pierce || p.pierce <= 0) {
          gameState.projectiles.splice(i, 1);
          break;
        } else {
          p.pierce--;
          p.hitTargets = p.hitTargets || new Set();
          p.hitTargets.add(enemy);
        }
      }
    }
  }

  // 5. 粒子与文字
  for (let i = gameState.particles.length - 1; i >= 0; i--) {
    const part = gameState.particles[i];
    part.x += part.vx * dt;
    part.y += part.vy * dt;
    part.life -= dt;
    if (part.life <= 0) gameState.particles.splice(i, 1);
  }

  for (let i = gameState.damageTexts.length - 1; i >= 0; i--) {
    const dtText = gameState.damageTexts[i];
    dtText.y -= 25 * dt;
    dtText.life -= dt;
    if (dtText.life <= 0) gameState.damageTexts.splice(i, 1);
  }

  // 6. 掉落物飞向玩家
  for (let i = gameState.lootItems.length - 1; i >= 0; i--) {
    const loot = gameState.lootItems[i];
    loot.timer += dt;
    if (loot.timer > 0.4) {
      const targetX = 120;
      const targetY = 24;
      const dx = targetX - loot.x;
      const dy = targetY - loot.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 20) {
        window.soundEngine.playLoot();
        gameState.inventory[loot.type] = (gameState.inventory[loot.type] || 0) + loot.amount;
        updateHUD();
        gameState.lootItems.splice(i, 1);
      } else {
        loot.x += (dx / dist) * 450 * dt;
        loot.y += (dy / dist) * 450 * dt;
      }
    }
  }

  // 持续生成余烬环境粒子 (Visual moodboard)
  if (Math.random() < 0.25) {
    gameState.particles.push({
      x: gameState.hearth.x + (Math.random() - 0.5) * 120,
      y: gameState.hearth.y + (Math.random() - 0.5) * 120,
      vx: (Math.random() - 0.5) * 20,
      vy: -Math.random() * 35 - 10,
      color: Math.random() > 0.4 ? '#f28929' : '#fad65a',
      radius: Math.random() * 2 + 1,
      life: 2.0
    });
  }
}

// 发射投射物
function fireTurret(socket, turret, target) {
  const dx = target.x - socket.x;
  const dy = target.y - socket.y;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const speed = 480;

  window.soundEngine.playShoot();

  // 基础参数
  let pierce = gameState.activePerks.has('pierce') ? 1 : 0;
  let dmg = turret.dmg;

  if (turret.chainLightning) {
    // 连锁闪电
    createLightning(socket, target, turret.chainLightning, dmg);
    return;
  }

  if (turret.type === 'flame') {
    // 扇形火焰
    for (let i = -1; i <= 1; i++) {
      const a = angle + i * 0.25;
      gameState.projectiles.push({
        x: socket.x,
        y: socket.y,
        vx: Math.cos(a) * (speed * 0.75),
        vy: Math.sin(a) * (speed * 0.75),
        dmg: dmg * 0.6,
        radius: 7,
        color: '#f28929',
        life: 0.45,
        type: 'fire'
      });
    }
    return;
  }

  // 连弩
  gameState.projectiles.push({
    x: socket.x,
    y: socket.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    dmg: dmg,
    radius: 4,
    color: '#fad65a',
    life: 1.5,
    pierce: pierce
  });

  if (turret.burst) {
    setTimeout(() => {
      gameState.projectiles.push({
        x: socket.x,
        y: socket.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        dmg: dmg * 0.9,
        radius: 4,
        color: '#5eead4',
        life: 1.5,
        pierce: pierce
      });
    }, 120);
  }
}

// 闪电连锁攻击
function createLightning(startPos, firstTarget, maxChains, baseDmg) {
  let curr = firstTarget;
  let hitSet = new Set([curr]);
  let points = [{ x: startPos.x, y: startPos.y }];

  applyDamage(curr, baseDmg, '#55a4db');
  points.push({ x: curr.x, y: curr.y });

  for (let c = 1; c < maxChains; c++) {
    let next = null;
    let nextDist = 180;
    for (const e of gameState.enemies) {
      if (!hitSet.has(e)) {
        const d = Math.hypot(e.x - curr.x, e.y - curr.y);
        if (d < nextDist) {
          nextDist = d;
          next = e;
        }
      }
    }
    if (next) {
      hitSet.add(next);
      applyDamage(next, baseDmg * 0.85, '#55a4db');
      points.push({ x: next.x, y: next.y });
      curr = next;
    } else {
      break;
    }
  }

  // 闪电视觉粒子
  for (let i = 0; i < points.length - 1; i++) {
    spawnLightningTrail(points[i], points[i + 1]);
  }
  window.soundEngine.playHit();
}

function spawnLightningTrail(p1, p2) {
  const steps = 6;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = p1.x + (p2.x - p1.x) * t + (Math.random() - 0.5) * 12;
    const y = p1.y + (p2.y - p1.y) * t + (Math.random() - 0.5) * 12;
    gameState.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      color: '#bee5fa',
      radius: 2,
      life: 0.18
    });
  }
}

// 投射物命中
function applyProjectileHit(proj, enemy) {
  window.soundEngine.playHit();
  spawnSparks(proj.x, proj.y, proj.color, 8);
  applyDamage(enemy, proj.dmg, proj.color);
}

// 伤害结算
function applyDamage(enemy, amount, color) {
  enemy.hp -= amount;
  addDamageText(enemy.x, enemy.y - 15, Math.round(amount), color || '#fff');

  if (enemy.hp <= 0 && !enemy.dead) {
    enemy.dead = true;
    handleEnemyDeath(enemy);
    const idx = gameState.enemies.indexOf(enemy);
    if (idx !== -1) gameState.enemies.splice(idx, 1);
  }
}

// 敌人死亡结算与肉鸽技能触发
function handleEnemyDeath(enemy) {
  // 余烬回响（击杀爆炸）
  if (gameState.activePerks.has('ember_echo')) {
    window.soundEngine.playExplosion();
    spawnSparks(enemy.x, enemy.y, '#f28929', 24);
    for (const other of gameState.enemies) {
      if (other !== enemy) {
        const d = Math.hypot(other.x - enemy.x, other.y - enemy.y);
        if (d <= 60) {
          applyDamage(other, 22, '#f28929');
        }
      }
    }
  }

  // 掉落物判定
  if (enemy.isBoss) {
    // Boss 必掉炉心碎片与双倍素材
    spawnLoot(enemy.x, enemy.y, 'wolf_core', 3);
    spawnLoot(enemy.x, enemy.y, 'thunder_core', 2);
    spawnLoot(enemy.x, enemy.y, 'iron_scrap', 15);
    addDamageText(enemy.x, enemy.y - 50, '✨ 获得第一枚天穹炉心碎片！', '#fad65a');
  } else {
    if (Math.random() < 0.45) spawnLoot(enemy.x, enemy.y, 'wolf_core', 1);
    if (Math.random() < 0.70) spawnLoot(enemy.x, enemy.y, 'iron_scrap', 1 + Math.floor(Math.random() * 2));
  }
}

// 生成掉落物
function spawnLoot(x, y, type, amount) {
  gameState.lootItems.push({
    x: x + (Math.random() - 0.5) * 20,
    y: y + (Math.random() - 0.5) * 20,
    type,
    amount,
    timer: 0
  });
}

// 生成敌人
function spawnEnemy(type) {
  // 边缘四向生成
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = Math.random() * gameState.width; y = -20; }
  else if (side === 1) { x = gameState.width + 20; y = Math.random() * gameState.height; }
  else if (side === 2) { x = Math.random() * gameState.width; y = gameState.height + 20; }
  else { x = -20; y = Math.random() * gameState.height; }

  if (type === 'boss') {
    gameState.enemies.push({
      x, y,
      type: 'boss',
      texture: 'mob_boss',
      hp: 2800,
      maxHp: 2800,
      speed: 42,
      atk: 45,
      radius: 30,
      isBoss: true
    });
    addDamageText(gameState.width / 2, 100, '⚠️ 首领【灰狼首领·残烬之影】降临！', '#e11d48');
  } else if (type === 'crawler') {
    gameState.enemies.push({
      x, y,
      type: 'crawler',
      texture: 'mob_crawler',
      hp: 170,
      maxHp: 170,
      speed: 48,
      atk: 18,
      radius: 18
    });
  } else {
    gameState.enemies.push({
      x, y,
      type: 'wolf',
      texture: 'mob_wolf',
      hp: 85,
      maxHp: 85,
      speed: 72,
      atk: 12,
      radius: 16
    });
  }
}

// 波次胜利处理
function endWaveVictory() {
  gameState.waveRunning = false;
  document.getElementById('btn-wave').innerText = '▶ 开始下一波';
  addDamageText(gameState.hearth.x, gameState.hearth.y - 70, `第 ${gameState.currentWave} 波防御成功！`, '#24a163');
  window.soundEngine.playPerkSelect();

  // 波次 2 与波次 4 弹出肉鸽三选一
  if (gameState.currentWave === 2 || gameState.currentWave === 4) {
    setTimeout(openRoguelikeModal, 800);
  }

  if (gameState.currentWave === 5) {
    gameOver(true);
    return;
  }

  gameState.currentWave++;
  updateHUD();
}

// 胜负结算弹窗
function gameOver(victory) {
  gameState.waveRunning = false;
  gameState.paused = true;
  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-container');
  modal.classList.add('active');

  content.innerHTML = `
    <div class="modal-header">
      <h2>${victory ? '🏆 天穹圣火重燃·阶段大捷！' : '💀 炉火熄灭·防线失守'}</h2>
    </div>
    <div class="modal-body" style="text-align: center; padding: 30px;">
      <p style="font-size: 16px; margin-bottom: 20px; line-height: 1.6;">
        ${victory 
          ? '你成功击溃了第一章守关首领，夺回了第一枚【天穹炉心碎片】！移动铸炉获得了全新锻造阶级！' 
          : '灰潮吞没了最后的避难所，余烬熄灭在严寒的长夜中……'}
      </p>
      <button class="hud-btn primary" onclick="location.reload()" style="font-size: 16px; padding: 10px 24px;">
        ${victory ? '重开新局 (New Cycle)' : '再次挑战 (Retry)'}
      </button>
    </div>
  `;
}

// 打开肉鸽技能三选一弹窗
function openRoguelikeModal() {
  gameState.paused = true;
  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-container');
  modal.classList.add('active');

  const allPerks = [
    { id: 'pierce', name: '穿云之箭', tag: '穿透弹幕流', rarity: 'common', desc: '所有弩塔投射物获得 +1 穿透并提升 15% 暴击率。' },
    { id: 'ember_echo', name: '余烬回响', tag: '全屏灼烧流', rarity: 'rare', desc: '击杀敌人后触发范围火焰爆炸，对附近敌人造成击杀伤害。' },
    { id: 'molten_heart', name: '熔岩之心', tag: '全屏灼烧流', rarity: 'rare', desc: '火焰祭坛伤害提高 40%，且点燃地面形成持续灼烧火海。' },
    { id: 'iron_will', name: '钢铁意志', tag: '防守反击流', rarity: 'common', desc: '炉火圣坛受到伤害时，恢复自身最大生命值的 2%。' },
    { id: 'thunder_resonance', name: '雷霆共鸣', tag: '连锁闪电流', rarity: 'epic', desc: '雷霆脉冲弩的闪电跳跃次数 +2，且不再产生伤害衰减。' }
  ];

  // 随机挑选 3 个未完全选满的技能
  const candidates = allPerks.filter(p => !gameState.activePerks.has(p.id));
  const selectedThree = candidates.sort(() => 0.5 - Math.random()).slice(0, 3);

  let perksHtml = selectedThree.map(p => `
    <div class="perk-card ${p.rarity}" onclick="choosePerk('${p.id}', '${p.name}')">
      <span class="perk-tag">#${p.tag}</span>
      <div class="perk-title">${p.name}</div>
      <div class="perk-desc">${p.desc}</div>
      <button class="perk-select-btn">研习领悟</button>
    </div>
  `).join('');

  content.innerHTML = `
    <div class="modal-header">
      <h2>🔥 战术流派抉择 (Roguelike Perks)</h2>
    </div>
    <div class="modal-body">
      <div class="perk-container">${perksHtml}</div>
    </div>
  `;
}

window.choosePerk = function(perkId, perkName) {
  gameState.activePerks.add(perkId);
  window.soundEngine.playPerkSelect();
  addDamageText(gameState.hearth.x, gameState.hearth.y - 70, `激活流派: ${perkName}`, '#fad65a');
  closeModal();
};

// 打开【防御设施强化升级与核心融合】弹窗 (可玩重点)
function openTurretUpgradeModal(socket) {
  gameState.paused = true;
  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-container');
  modal.classList.add('active');

  const turret = socket.turret;
  if (!turret) return;

  const level = turret.level || 1;
  const isMaxLevel = level >= 3;
  const upgradeCost = level === 1 ? 4 : 8;
  const canAffordUpgrade = gameState.inventory.iron_scrap >= upgradeCost;

  // 核心融合可用性
  const canFuseWolf = gameState.inventory.wolf_core >= 1 && !turret.hasWolfCore;
  const canFuseThunder = gameState.inventory.thunder_core >= 1 && !turret.hasThunderCore;

  const currentDmg = turret.dmg || 0;
  const nextDmg = Math.round(currentDmg * 1.5);
  const currentRate = turret.rate || 0;
  const nextRate = (currentRate * 1.25).toFixed(1);
  const currentRange = turret.range || 0;
  const nextRange = currentRange + 30;

  content.innerHTML = `
    <div class="modal-header">
      <h2>🏰 防御设施强化升级与核心融合 (${socket.label} 槽位)</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="upgrade-layout">
        <!-- 左侧详情与属性 -->
        <div class="upgrade-sidebar">
          <img src="${TEXTURES[turret.texture]}" />
          <div style="font-weight: bold; font-size: 16px; color: #fff;">${turret.name}</div>
          <span style="font-size: 11px; padding: 2px 8px; border-radius: 10px; background: rgba(200, 155, 60, 0.25); color: #fad65a; margin-top: 4px;">
            阶级: Lv.${level} ${isMaxLevel ? '(最高阶 🌟)' : ''}
          </span>
          <div class="upgrade-stat-list">
            ${turret.type === 'wall' ? `
              <div class="upgrade-stat-item"><span>城墙生命</span><span>${Math.round(turret.hp)} / ${turret.maxHp}</span></div>
              <div class="upgrade-stat-item"><span>荆棘反伤</span><span>${Math.round((turret.reflectRate || 0.5) * 100)}%</span></div>
              <div class="upgrade-stat-item"><span>拦截特性</span><span>阻挡敌军/受击爆震</span></div>
              <div class="upgrade-stat-item"><span>圣坛庇护</span><span>+15% 护体减伤</span></div>
            ` : `
              <div class="upgrade-stat-item"><span>攻击伤害</span><span>${currentDmg}</span></div>
              <div class="upgrade-stat-item"><span>攻击速度</span><span>${currentRate} 次/秒</span></div>
              <div class="upgrade-stat-item"><span>有效射程</span><span>${currentRange} px</span></div>
              <div class="upgrade-stat-item"><span>特性能力</span><span>${turret.burst ? '2连发疾速射击' : (turret.chainLightning ? '连锁电弧x4' : '标准实木弹道')}</span></div>
            `}
          </div>
        </div>

        <!-- 右侧操作栏 -->
        <div class="upgrade-actions">
          <!-- 1. 升阶升级 -->
          <div class="upgrade-action-card highlight">
            <h3>🔼 升阶强化 (Level Up)</h3>
            <div style="font-size: 12px; color: #9f96aa; line-height: 1.5;">
              ${!isMaxLevel ? `
                升级消耗: <b style="color: #fad65a;">${upgradeCost} 废铁矿石</b> (当前拥有: ${gameState.inventory.iron_scrap})<br/>
                ${turret.type === 'wall' 
                  ? `提升效果: 最大生命 <b>+600</b>，反伤提升至 <b>${Math.round(((turret.reflectRate || 0.5) + 0.2) * 100)}%</b>，爆震范围 +25px`
                  : `提升效果: 伤害 <b>${currentDmg} → ${nextDmg}</b>，攻速 <b>${currentRate} → ${nextRate}</b>，射程 <b>+30px</b>`
                }
              ` : '✨ 此设施已达到最高阶巅峰形态！'}
            </div>
            ${!isMaxLevel ? `
              <button class="recipe-btn" ${canAffordUpgrade ? '' : 'disabled'} onclick="upgradeTurret(${socket.id}, ${upgradeCost})">
                ${canAffordUpgrade ? `立即升至 Lv.${level + 1}` : '废铁不足'}
              </button>
            ` : ''}
          </div>

          <!-- 2. 核心融合 -->
          <div class="upgrade-action-card">
            <h3>🧬 核心融合组合 (Core Mutation)</h3>
            <div style="font-size: 12px; color: #9f96aa;">将狩猎掉落的怪物核心融入该塔，诱发永久变异组合能力：</div>
            <div class="fusion-options">
              <!-- 风狼核心 -->
              <button class="fusion-btn" ${canFuseWolf ? '' : 'disabled'} onclick="fuseCore(${socket.id}, 'wolf')">
                <span class="f-title">🐺 融合【风狼核心】</span>
                <span class="f-cost">消耗: 1 风狼核心 (拥有: ${gameState.inventory.wolf_core})</span>
                <span class="f-desc">${turret.type === 'wall' ? '变异为【疾风荆棘壁】：反弹80%近战伤害并反弹风刃群' : '变异为【疾风双联弩】：攻速翻倍，每轮 2 连发射击'}</span>
              </button>

              <!-- 雷兽核心 -->
              <button class="fusion-btn" ${canFuseThunder ? '' : 'disabled'} onclick="fuseCore(${socket.id}, 'thunder')">
                <span class="f-title">⚡ 融合【雷兽核心】</span>
                <span class="f-cost">消耗: 1 雷兽核心 (拥有: ${gameState.inventory.thunder_core})</span>
                <span class="f-desc">变异为【雷霆脉冲弩】：普通攻击向周围额外跳跃 4 次电弧连锁</span>
              </button>
            </div>
          </div>

          <!-- 3. 拆除拆解 -->
          <div style="display: flex; justify-content: flex-end; margin-top: auto;">
            <button class="hud-btn" onclick="dismantleTurret(${socket.id})" style="border-color: #e11d48; color: #ff6b81;">
              ♻️ 拆除回收 (返还 3 废铁)
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.upgradeTurret = function(socketId, cost) {
  const socket = gameState.sockets.find(s => s.id === socketId);
  if (!socket || !socket.turret) return;

  gameState.inventory.iron_scrap -= cost;
  const t = socket.turret;
  t.level = (t.level || 1) + 1;
  t.name = `强化·${t.name.replace(/强化·/g, '')}`;

  if (t.type === 'wall') {
    t.maxHp += 600;
    t.hp += 600;
    t.reflectRate = (t.reflectRate || 0.5) + 0.2;
  } else {
    t.dmg = Math.round(t.dmg * 1.5);
    t.rate = Number((t.rate * 1.25).toFixed(1));
    t.range += 30;
  }

  window.soundEngine.playPerkSelect();
  spawnSparks(socket.x, socket.y, '#fad65a', 25);
  addDamageText(socket.x, socket.y - 45, `升阶成功: Lv.${t.level}!`, '#fad65a');
  updateHUD();
  openTurretUpgradeModal(socket);
};

window.fuseCore = function(socketId, coreType) {
  const socket = gameState.sockets.find(s => s.id === socketId);
  if (!socket || !socket.turret) return;

  const t = socket.turret;
  if (coreType === 'wolf') {
    gameState.inventory.wolf_core -= 1;
    t.hasWolfCore = true;
    if (t.type === 'wall') {
      t.name = '疾风荆棘壁';
      t.reflectRate = 0.8;
      t.maxHp += 400;
      t.hp += 400;
    } else {
      t.name = '疾风双联弩';
      t.rate = Number((t.rate * 1.8).toFixed(1));
      t.burst = true;
    }
  } else if (coreType === 'thunder') {
    gameState.inventory.thunder_core -= 1;
    t.hasThunderCore = true;
    t.name = '雷霆脉冲弩';
    t.dmg = Math.round(t.dmg * 1.3);
    t.chainLightning = 4;
  }

  window.soundEngine.playForge();
  spawnSparks(socket.x, socket.y, '#5eead4', 30);
  addDamageText(socket.x, socket.y - 45, `变异质变: ${t.name}!`, '#5eead4');
  updateHUD();
  openTurretUpgradeModal(socket);
};

window.dismantleTurret = function(socketId) {
  const socket = gameState.sockets.find(s => s.id === socketId);
  if (!socket || !socket.turret) return;

  gameState.inventory.iron_scrap += 3;
  addDamageText(socket.x, socket.y - 30, `拆除回收 +3 废铁`, '#fad65a');
  socket.turret = null;
  window.soundEngine.playHit();
  updateHUD();
  closeModal();
};

// 打开锻造工坊弹窗 (concept_02.webp 布局原型)
function openForgeModal() {
  gameState.paused = true;
  const modal = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-container');
  modal.classList.add('active');

  const recipes = [
    {
      id: 'wind_repeater',
      name: '疾风连射弩',
      type: 'crossbow',
      texture: 'turret_crossbow',
      dmg: 22,
      rate: 2.6,
      range: 240,
      burst: true,
      reqScrap: 4,
      reqWolfCore: 1,
      reqThunderCore: 0,
      desc: '融合风狼核心与弹簧弓弦，攻速极大提高，每轮两连发极速压制。'
    },
    {
      id: 'thunder_ballista',
      name: '雷霆脉冲弩',
      type: 'crossbow',
      texture: 'turret_crossbow',
      dmg: 35,
      rate: 1.1,
      range: 260,
      chainLightning: 4,
      reqScrap: 6,
      reqWolfCore: 0,
      reqThunderCore: 1,
      desc: '镶嵌雷兽核心，攻击在敌群间传导 4 次高压电弧连锁。'
    },
    {
      id: 'inferno_shrine',
      name: '焚天余烬坛',
      type: 'flame',
      texture: 'turret_flame',
      dmg: 24,
      rate: 0.8,
      range: 190,
      reqScrap: 5,
      reqWolfCore: 1,
      reqThunderCore: 0,
      desc: '炉火熊熊燃烧，向前方喷吐扇形范围烈焰，极克群怪。'
    },
    {
      id: 'thorns_barricade',
      name: '荆棘岩壁',
      type: 'wall',
      texture: 'turret_wall',
      hp: 1500,
      maxHp: 1500,
      reqScrap: 6,
      reqWolfCore: 0,
      reqThunderCore: 0,
      desc: '厚重的冷铁防守墙，能强力阻挡并吸收近战伤害。'
    }
  ];

  let recipesHtml = recipes.map(r => {
    const hasScrap = gameState.inventory.iron_scrap >= r.reqScrap;
    const hasWolf = gameState.inventory.wolf_core >= r.reqWolfCore;
    const hasThunder = gameState.inventory.thunder_core >= r.reqThunderCore;
    const canForge = hasScrap && hasWolf && hasThunder;

    return `
      <div class="recipe-card">
        <div class="recipe-header">
          <img src="${TEXTURES[r.texture]}" />
          <div>
            <div class="recipe-title">${r.name}</div>
            <div class="recipe-cost">
              <span class="${hasScrap ? 'ok' : 'missing'}">废铁: ${gameState.inventory.iron_scrap}/${r.reqScrap}</span>
              ${r.reqWolfCore > 0 ? `<span class="${hasWolf ? 'ok' : 'missing'}">狼核: ${gameState.inventory.wolf_core}/${r.reqWolfCore}</span>` : ''}
              ${r.reqThunderCore > 0 ? `<span class="${hasThunder ? 'ok' : 'missing'}">雷晶: ${gameState.inventory.thunder_core}/${r.reqThunderCore}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="recipe-desc">${r.desc}</div>
        <button class="recipe-btn" ${canForge ? '' : 'disabled'} onclick='forgeCard(${JSON.stringify(r)})'>
          ${canForge ? '🔨 熔铸此卡' : '素材不足'}
        </button>
      </div>
    `;
  }).join('');

  content.innerHTML = `
    <div class="modal-header">
      <h2>🔨 移动铸炉工坊 (Forge Workshop)</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="forge-grid">${recipesHtml}</div>
    </div>
  `;
}

window.forgeCard = function(recipe) {
  // 扣减材料
  gameState.inventory.iron_scrap -= recipe.reqScrap;
  gameState.inventory.wolf_core -= recipe.reqWolfCore;
  gameState.inventory.thunder_core -= recipe.reqThunderCore;

  // 加入卡组
  gameState.deck.push({
    id: `card_${Date.now()}`,
    name: recipe.name,
    type: recipe.type,
    texture: recipe.texture,
    dmg: recipe.dmg,
    rate: recipe.rate,
    range: recipe.range,
    burst: recipe.burst,
    chainLightning: recipe.chainLightning,
    hp: recipe.hp,
    maxHp: recipe.maxHp
  });

  window.soundEngine.playForge();
  updateHUD();
  renderDeck();
  addDamageText(gameState.hearth.x, gameState.hearth.y - 60, `成功锻造: ${recipe.name}!`, '#fad65a');

  // 刷新工坊
  openForgeModal();
};

window.closeModal = function() {
  document.getElementById('modal-overlay').classList.remove('active');
  gameState.paused = false;
};

// 辅助特效与文字
function addDamageText(x, y, text, color = '#fff') {
  gameState.damageTexts.push({ x, y, text, color, life: 1.0 });
}

function spawnSparks(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 80 + 30;
    gameState.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      radius: Math.random() * 3 + 1,
      life: 0.35
    });
  }
}

// 画面绘制渲染
function render() {
  const ctx = gameState.ctx;
  ctx.clearRect(0, 0, gameState.width, gameState.height);

  // 1. 深渊夜幕背景 (Deep Void Base)
  const hearth = gameState.hearth;
  const time = performance.now() * 0.001;
  ctx.fillStyle = '#08060b';
  ctx.fillRect(0, 0, gameState.width, gameState.height);

  // 2. 要塞石砖地表 (Concentric Bastion Cobblestone Floor)
  ctx.save();
  const bastionR = 235;

  // 石砖基底辐射渐变
  const groundGrad = ctx.createRadialGradient(hearth.x, hearth.y, 30, hearth.x, hearth.y, bastionR);
  groundGrad.addColorStop(0, '#1c1626');
  groundGrad.addColorStop(0.75, '#130f1a');
  groundGrad.addColorStop(1, '#09070c');
  ctx.fillStyle = groundGrad;
  ctx.beginPath();
  ctx.arc(hearth.x, hearth.y, bastionR, 0, Math.PI * 2);
  ctx.fill();

  // 绘制 45度 菱形古石地砖纹理 (Isometric Pavers)
  ctx.strokeStyle = 'rgba(80, 68, 96, 0.18)';
  ctx.lineWidth = 1;
  const tileSize = 36;
  const minX = hearth.x - bastionR;
  const maxX = hearth.x + bastionR;
  const minY = hearth.y - bastionR;
  const maxY = hearth.y + bastionR;

  ctx.beginPath();
  for (let x = minX; x <= maxX; x += tileSize) {
    for (let y = minY; y <= maxY; y += tileSize) {
      if (Math.hypot(x - hearth.x, y - hearth.y) < bastionR - 8) {
        ctx.moveTo(x, y - tileSize / 2);
        ctx.lineTo(x + tileSize / 2, y);
        ctx.lineTo(x, y + tileSize / 2);
        ctx.lineTo(x - tileSize / 2, y);
        ctx.closePath();
      }
    }
  }
  ctx.stroke();

  // 要塞边缘防线石基环与铭文刻痕
  ctx.beginPath();
  ctx.arc(hearth.x, hearth.y, bastionR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(200, 155, 60, 0.4)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([10, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 内圈聚灵符文环
  ctx.beginPath();
  ctx.arc(hearth.x, hearth.y, 115, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(242, 137, 41, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 3. 圣火动态呼吸光照与暗夜迷雾辐射 (Dynamic Light Radius)
  const pulseRadius = hearth.lightRadius + Math.sin(time * 3.5) * 8;
  const lightGrad = ctx.createRadialGradient(hearth.x, hearth.y, 25, hearth.x, hearth.y, pulseRadius);
  lightGrad.addColorStop(0, 'rgba(242, 137, 41, 0.28)');
  lightGrad.addColorStop(0.5, 'rgba(217, 65, 38, 0.08)');
  lightGrad.addColorStop(0.85, 'rgba(10, 8, 14, 0.65)');
  lightGrad.addColorStop(1, 'rgba(8, 6, 11, 0.96)');
  ctx.fillStyle = lightGrad;
  ctx.fillRect(0, 0, gameState.width, gameState.height);
  ctx.restore();

  // 4. 城墙流向中央圣坛的【幽蓝能量光丝】(取代原先突兀的方块文字)
  const activeWalls = gameState.sockets.filter(s => s.turret && s.turret.type === 'wall' && s.turret.hp > 0);
  if (activeWalls.length > 0) {
    ctx.save();
    // 基地受庇护时的环形护盾光晕
    ctx.beginPath();
    ctx.arc(hearth.x, hearth.y, hearth.radius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(94, 234, 212, 0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    activeWalls.forEach(ws => {
      // 动态流动虚线
      ctx.beginPath();
      ctx.lineDashOffset = -(time * 40) % 20;
      ctx.setLineDash([8, 8]);
      ctx.moveTo(ws.x, ws.y);
      ctx.lineTo(hearth.x, hearth.y);
      ctx.strokeStyle = 'rgba(94, 234, 212, 0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    ctx.restore();
  }

  // 5. 绘制中央炉火结界（天穹圣坛 & 跳动像素圣火）
  ctx.save();
  // 圣炉石基
  ctx.beginPath();
  ctx.arc(hearth.x, hearth.y, hearth.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#17121e';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#c89b3c';
  ctx.stroke();

  // 青铜八角装饰环
  ctx.beginPath();
  ctx.arc(hearth.x, hearth.y, hearth.radius - 6, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(250, 214, 90, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 动态跳跃的多层像素圣火
  const flamePulse = Math.sin(time * 6) * 2;
  const flameTip = Math.cos(time * 8) * 3;

  // 外围余烬红晕
  ctx.beginPath();
  ctx.arc(hearth.x, hearth.y, 22 + flamePulse, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(242, 137, 41, 0.45)';
  ctx.shadowColor = '#f28929';
  ctx.shadowBlur = 18;
  ctx.fill();

  // 中层明火金核
  ctx.beginPath();
  ctx.arc(hearth.x + flameTip * 0.4, hearth.y - 2, 14 + flamePulse * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#fad65a';
  ctx.shadowColor = '#fad65a';
  ctx.shadowBlur = 12;
  ctx.fill();

  // 内核白炽余烬
  ctx.beginPath();
  ctx.arc(hearth.x, hearth.y - 1, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.restore();

  // 6. 绘制 4 个防御塔插槽与设施
  gameState.sockets.forEach(sock => {
    ctx.save();
    const isHovered = (gameState.hoveredSocket === sock);
    const hasCardSelected = (gameState.selectedDeckIndex !== null);

    // 插槽石基底座
    ctx.beginPath();
    ctx.arc(sock.x, sock.y, 28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(24, 19, 31, 0.85)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = sock.turret ? '#c89b3c' : '#3e3448';
    ctx.stroke();

    // 插槽四角刻痕
    ctx.beginPath();
    ctx.arc(sock.x, sock.y, 24, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200, 155, 60, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (sock.turret) {
      // 绘制防御塔贴图
      const img = images[sock.turret.texture];
      if (img) {
        ctx.drawImage(img, sock.x - 24, sock.y - 24, 48, 48);
      }

      // 仅在悬浮或手牌选中时，才显示优雅的符文射程圈 (告别平时的生硬CAD圆)
      if (sock.turret.range && (isHovered || hasCardSelected)) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(sock.x, sock.y, sock.turret.range, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(250, 214, 90, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = (time * 15) % 14;
        ctx.stroke();
        ctx.restore();
      }

      // 若为城墙：绘制城墙血条与减伤徽章
      if (sock.turret.type === 'wall') {
        // 城墙拦截光环 (淡绿柔和范围)
        ctx.beginPath();
        ctx.arc(sock.x, sock.y, 58, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(36, 161, 99, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 减伤徽章 (小巧精致)
        ctx.fillStyle = 'rgba(18, 14, 23, 0.88)';
        ctx.fillRect(sock.x - 30, sock.y - 48, 60, 15);
        ctx.strokeStyle = '#5eead4';
        ctx.lineWidth = 1;
        ctx.strokeRect(sock.x - 30, sock.y - 48, 60, 15);
        ctx.fillStyle = '#5eead4';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🛡️ 护体 -15%', sock.x, sock.y - 37);

        // 城墙血条
        const wBar = 46;
        const hBar = 5;
        const wallHpRatio = Math.max(0, sock.turret.hp / sock.turret.maxHp);
        ctx.fillStyle = '#120f18';
        ctx.fillRect(sock.x - wBar / 2, sock.y - 31, wBar, hBar);
        ctx.fillStyle = wallHpRatio > 0.3 ? '#24a163' : '#e11d48';
        ctx.fillRect(sock.x - wBar / 2, sock.y - 31, wBar * wallHpRatio, hBar);
        ctx.strokeStyle = '#3e3448';
        ctx.lineWidth = 1;
        ctx.strokeRect(sock.x - wBar / 2, sock.y - 31, wBar, hBar);
      }

      // 设施等级暗金徽章 (★ Lv.1 / ★★ Lv.2)
      const lvl = sock.turret.level || 1;
      const stars = '★'.repeat(lvl);
      const mutationTag = sock.turret.hasThunderCore ? '⚡' : (sock.turret.hasWolfCore ? '🐺' : '');
      const badgeText = `${mutationTag}${stars} Lv.${lvl}`;
      
      ctx.fillStyle = 'rgba(20, 16, 26, 0.92)';
      ctx.strokeStyle = '#c89b3c';
      ctx.lineWidth = 1;
      ctx.fillRect(sock.x + 8, sock.y - 28, 42, 16);
      ctx.strokeRect(sock.x + 8, sock.y - 28, 42, 16);
      ctx.fillStyle = '#fad65a';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, sock.x + 29, sock.y - 16);
    } else {
      ctx.fillStyle = '#796f86';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sock.label, sock.x, sock.y + 4);
    }

    // 鼠标悬停高亮与浮动提示胶囊 (Floating Action Pill)
    if (isHovered) {
      ctx.beginPath();
      ctx.arc(sock.x, sock.y, 32, 0, Math.PI * 2);
      ctx.strokeStyle = '#fad65a';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#f28929';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 交互提示胶囊
      ctx.save();
      let tip = '';
      let tipColor = '#fad65a';
      if (sock.turret) {
        tip = '👆 点击强化/核心变异';
        tipColor = '#fad65a';
      } else if (gameState.selectedDeckIndex !== null) {
        tip = `👇 放置: ${gameState.deck[gameState.selectedDeckIndex].name}`;
        tipColor = '#5eead4';
      } else {
        tip = '待部署 (按 [1~4] 选卡)';
        tipColor = '#8c8299';
      }

      const pillW = 140;
      const pillH = 22;
      const pillX = sock.x - pillW / 2;
      const pillY = sock.y + 35;

      ctx.fillStyle = 'rgba(14, 11, 18, 0.95)';
      ctx.strokeStyle = tipColor;
      ctx.lineWidth = 1.5;
      ctx.fillRect(pillX, pillY, pillW, pillH);
      ctx.strokeRect(pillX, pillY, pillW, pillH);

      ctx.fillStyle = tipColor;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tip, sock.x, pillY + 15);
      ctx.restore();
    }

    ctx.restore();
  });

  // 5. 绘制敌人
  gameState.enemies.forEach(e => {
    ctx.save();
    const img = images[e.texture];
    const size = e.radius * 2;
    if (img) {
      ctx.drawImage(img, e.x - size / 2, e.y - size / 2, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fillStyle = e.isBoss ? '#e11d48' : '#7c728a';
      ctx.fill();
    }

    // 敌人血条
    const ew = e.radius * 2;
    const eh = 4;
    ctx.fillStyle = '#121016';
    ctx.fillRect(e.x - ew / 2, e.y - e.radius - 8, ew, eh);
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(e.x - ew / 2, e.y - e.radius - 8, ew * (e.hp / e.maxHp), eh);
    ctx.restore();
  });

  // 6. 绘制投射物
  gameState.projectiles.forEach(p => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  });

  // 7. 绘制粒子
  gameState.particles.forEach(part => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
    ctx.fillStyle = part.color;
    ctx.globalAlpha = Math.max(0, part.life);
    ctx.fill();
    ctx.restore();
  });

  // 8. 绘制掉落物
  gameState.lootItems.forEach(loot => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = loot.type === 'wolf_core' ? '#24a163' : (loot.type === 'thunder_core' ? '#55a4db' : '#c89b3c');
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
  });

  // 9. 飘字伤害文本
  gameState.damageTexts.forEach(dt => {
    ctx.save();
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = dt.color;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.globalAlpha = Math.max(0, dt.life);
    ctx.fillText(dt.text, dt.x, dt.y);
    ctx.restore();
  });
}

// 启动入口 (支持 DOMContentLoaded 极速自启动，绝不因网络卡死)
function bootstrap() {
  loadAssets(() => {
    initGame();
  });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  bootstrap();
} else {
  document.addEventListener('DOMContentLoaded', bootstrap);
}

