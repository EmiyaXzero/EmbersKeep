/**
 * 《余烬裂隙》160px 极窄视口长廊 Canvas 渲染器 (viewport.js)
 * -------------------------------------------------------------
 * 专为屏幕边缘设计的横版暗黑地牢长廊，承载流浪剑士行走砍杀、
 * 怪物硬直、视差背景滚动、跳字暴击与通天太古史诗金光。
 */

import { sfx } from './sfx.js';

export class IdleViewport {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false; // 严格保持像素硬边

    this.width = canvas.width;
    this.height = canvas.height;

    this.floatingTexts = [];
    this.particles = [];
    this.epicBeam = null; // 当前史诗金光特效
    this.slashAnim = 0; // 剑气挥砍动画计数器

    // 预加载怪物贴图
    this.images = {
      ashen_wolf: new Image(),
      crawler: new Image(),
      boss_wolf: new Image()
    };
    this.images.ashen_wolf.src = 'assets/textures/1x/monsters/ashen_wolf.png';
    this.images.crawler.src = 'assets/textures/1x/monsters/crawler.png';
    this.images.boss_wolf.src = 'assets/textures/1x/monsters/boss_wolf.png';
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.width = w;
    this.height = h;
    this.ctx.imageSmoothingEnabled = false;
  }

  /**
   * 消费并执行事件 (音效与粒子生成)
   */
  processEvents(events = []) {
    events.forEach(evt => {
      switch (evt.type) {
        case 'DAMAGE_NUMBER':
          this.floatingTexts.push({
            x: evt.x,
            y: evt.y,
            text: `${evt.isCrit ? '暴击! ' : ''}-${evt.damage}`,
            color: evt.isCrit ? '#fad65a' : '#ffffff',
            size: evt.isCrit ? 16 : 13,
            alpha: 1.0,
            vy: -1.2
          });
          if (evt.isCrit) sfx.playHit();
          else sfx.playSlash();
          break;

        case 'OBELISK_HIT':
          this.floatingTexts.push({
            x: evt.x,
            y: evt.y,
            text: `-${evt.damage}`,
            color: '#55a4db',
            size: 14,
            alpha: 1.0,
            vy: -1.0
          });
          sfx.playObeliskHit();
          break;

        case 'OBELISK_SHATTER':
          this.spawnBurstParticles(evt.boss.x, this.height - 40, '#ff4d4d', 25);
          sfx.playHit();
          break;

        case 'EPIC_DROP':
          sfx.playEpicDrop();
          this.epicBeam = {
            x: evt.x,
            itemName: evt.item.name,
            rarityColor: '#fad65a',
            timer: 4500, // 持续 4.5 秒金光与光斑
            alpha: 1.0
          };
          this.spawnBurstParticles(evt.x, this.height - 35, '#fad65a', 40);
          break;

        case 'BOSS_FLED':
          this.floatingTexts.push({
            x: this.width * 0.5,
            y: this.height * 0.5,
            text: '霸主潜入虚空遁走 (已获得保底虚空晶屑)',
            color: '#a26cdb',
            size: 14,
            alpha: 1.0,
            vy: -0.6
          });
          break;

        default:
          break;
      }
    });
  }

  spawnBurstParticles(x, y, color, count = 20) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color,
        size: 2 + Math.random() * 3,
        alpha: 1.0,
        decay: 0.02 + Math.random() * 0.03
      });
    }
  }

  /**
   * 主渲染通道
   */
  render(snapshot) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. 清屏与深暗地牢底色
    ctx.fillStyle = '#100d16';
    ctx.fillRect(0, 0, w, h);

    // 2. 多层视差暗黑长廊背景
    this.renderParallaxBackground(snapshot.distanceWalked);

    // 3. 绘制裂隙方尖碑 (若激活)
    if (snapshot.activeObelisk) {
      this.renderObelisk(snapshot.activeObelisk);
    }

    // 4. 绘制怪物与 Boss
    this.renderMonsters(snapshot.monsters, snapshot.activeBoss);

    // 5. 绘制主角流浪剑士与武器强化光环
    this.renderHero(snapshot.hero, snapshot.equippedMap.weapon);

    // 6. 绘制通天史诗金光柱特效
    if (this.epicBeam) {
      this.renderEpicBeam();
    }

    // 7. 绘制粒子
    this.renderParticles();

    // 8. 绘制浮动伤害数字
    this.renderFloatingTexts();

    // 9. 顶部 HUD 轻量状态指示 (Boss 限时倒计时等)
    if (snapshot.state === 'BOSS_ENCOUNTER') {
      const remainingSec = Math.max(0, Math.ceil(snapshot.bossTimer / 1000));
      ctx.fillStyle = 'rgba(255, 59, 74, 0.85)';
      ctx.font = 'bold 12px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`⚡ 裂隙霸主激战中！限时逃逸: ${remainingSec}s`, w * 0.5, 22);
    }
  }

  /**
   * 视差暗黑石板地面与远景拱门
   */
  renderParallaxBackground(distance) {
    const ctx = this.ctx;
    const groundY = this.height - 30;

    // 远景石柱拱廊 (低速视差 0.2)
    ctx.fillStyle = '#17141f';
    const archSpacing = 160;
    const archOffset = (distance * 0.2) % archSpacing;
    for (let x = -archOffset; x < this.width + archSpacing; x += archSpacing) {
      ctx.fillRect(x, 15, 24, groundY - 15);
      // 拱柱火把微光
      ctx.fillStyle = '#ff7a29';
      ctx.fillRect(x + 10, 45, 4, 6);
      ctx.fillStyle = '#17141f';
    }

    // 近景石板地面 (速度 1.0)
    ctx.fillStyle = '#1e1b24';
    ctx.fillRect(0, groundY, this.width, 30);
    ctx.strokeStyle = '#2c2636';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(this.width, groundY);
    ctx.stroke();

    // 移动石缝
    const tileW = 40;
    const tileOffset = distance % tileW;
    ctx.strokeStyle = '#121016';
    for (let x = -tileOffset; x < this.width + tileW; x += tileW) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
  }

  /**
   * 绘制主角剑士
   */
  renderHero(hero, weapon) {
    const ctx = this.ctx;
    const x = hero.x;
    const y = this.height - 30;

    ctx.save();
    ctx.translate(x, y);

    // 强化光效光环 (+10 紫气，+12 金焰)
    const rfLevel = weapon ? (weapon.reinforceLevel || 0) : 0;
    if (rfLevel >= 12) {
      ctx.fillStyle = 'rgba(250, 214, 90, 0.25)';
      ctx.beginPath();
      ctx.arc(0, -22, 26 + Math.sin(Date.now() * 0.01) * 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (rfLevel >= 10) {
      ctx.fillStyle = 'rgba(162, 108, 219, 0.25)';
      ctx.beginPath();
      ctx.arc(0, -22, 22 + Math.sin(Date.now() * 0.01) * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 简易高精硬边像素剑士 (兜帽披风、流浪皮甲、长剑)
    ctx.fillStyle = '#121016'; // 阴影
    ctx.fillRect(-8, -2, 16, 3);

    // 身体与护甲
    ctx.fillStyle = '#2c2636';
    ctx.fillRect(-6, -26, 12, 18);
    // 披风后摆
    ctx.fillStyle = '#a12b2b';
    ctx.fillRect(-10, -22, 5, 14);
    // 银铁胸甲
    ctx.fillStyle = '#7c728a';
    ctx.fillRect(-4, -22, 8, 8);
    // 头部兜帽
    ctx.fillStyle = '#1e1b24';
    ctx.fillRect(-5, -34, 10, 9);
    // 双眼微光
    ctx.fillStyle = '#fad65a';
    ctx.fillRect(2, -30, 2, 2);

    // 手中神兵与挥砍剑气
    ctx.fillStyle = rfLevel >= 12 ? '#fad65a' : rfLevel >= 10 ? '#a26cdb' : '#c5bfd2';
    ctx.fillRect(5, -28, 16, 3);
    ctx.fillRect(8, -32, 2, 10); // 剑格

    ctx.restore();
  }

  /**
   * 绘制小怪与霸主
   */
  renderMonsters(monsters, activeBoss) {
    const ctx = this.ctx;
    const groundY = this.height - 30;

    monsters.forEach(mob => {
      ctx.save();
      ctx.translate(mob.x, groundY);

      const img = this.images[mob.type];
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -16, -32, 32, 32);
      } else {
        // Fallback 像素怪
        ctx.fillStyle = mob.type === 'ashen_wolf' ? '#41394d' : '#2b6ba6';
        ctx.fillRect(-14, -22, 28, 18);
        ctx.fillStyle = '#ff3b3b';
        ctx.fillRect(-10, -18, 4, 3); // 凶光红眼
      }

      // 小怪简易血条
      const barW = 24;
      const hpPercent = Math.max(0, mob.hp / mob.maxHp);
      ctx.fillStyle = '#121016';
      ctx.fillRect(-barW * 0.5, -38, barW, 3);
      ctx.fillStyle = '#ff4d4d';
      ctx.fillRect(-barW * 0.5, -38, barW * hpPercent, 3);

      ctx.restore();
    });

    // 绘制裂隙霸主 Boss
    if (activeBoss) {
      ctx.save();
      ctx.translate(activeBoss.x, groundY);

      const bossImg = this.images.boss_wolf;
      if (bossImg && bossImg.complete && bossImg.naturalWidth > 0) {
        ctx.drawImage(bossImg, -32, -64, 64, 64);
      } else {
        ctx.fillStyle = '#5e1b1b';
        ctx.fillRect(-28, -50, 56, 46);
        ctx.fillStyle = '#fad65a';
        ctx.fillRect(-18, -42, 6, 4);
      }

      // Boss 霸气多层血条
      const bW = 60;
      const bHpRatio = Math.max(0, activeBoss.hp / activeBoss.maxHp);
      ctx.fillStyle = '#121016';
      ctx.fillRect(-bW * 0.5, -70, bW, 6);
      ctx.fillStyle = '#f44336';
      ctx.fillRect(-bW * 0.5 + 1, -69, (bW - 2) * bHpRatio, 4);

      // 名称标牌
      ctx.fillStyle = '#fad65a';
      ctx.font = 'bold 11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(activeBoss.name, 0, -74);

      ctx.restore();
    }
  }

  /**
   * 绘制裂隙方尖碑
   */
  renderObelisk(obelisk) {
    const ctx = this.ctx;
    const groundY = this.height - 30;

    ctx.save();
    ctx.translate(obelisk.x, groundY);

    // 石碑主体
    ctx.fillStyle = '#2c2636';
    ctx.fillRect(-15, -60, 30, 60);
    ctx.fillStyle = '#41394d';
    ctx.fillRect(-11, -56, 22, 52);

    // 阶段裂纹与符文发光 (Stage 1: 蓝光, Stage 2: 橙色裂开, Stage 3: 赤红崩解)
    const runeColor = obelisk.stage === 3 ? '#ff3b3b' : obelisk.stage === 2 ? '#ff9800' : '#55a4db';
    ctx.fillStyle = runeColor;
    ctx.fillRect(-3, -48, 6, 8);
    ctx.fillRect(-3, -32, 6, 12);
    ctx.fillRect(-3, -14, 6, 6);

    if (obelisk.stage >= 2) {
      ctx.strokeStyle = runeColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-10, -50);
      ctx.lineTo(2, -30);
      ctx.lineTo(-4, -10);
      ctx.stroke();
    }

    // 血条
    const obW = 34;
    const ratio = Math.max(0, obelisk.hp / obelisk.maxHp);
    ctx.fillStyle = '#121016';
    ctx.fillRect(-obW * 0.5, -68, obW, 4);
    ctx.fillStyle = runeColor;
    ctx.fillRect(-obW * 0.5, -68, obW * ratio, 4);

    ctx.restore();
  }

  /**
   * 经典的“太古史诗通天金色光柱”与深渊闪光
   */
  renderEpicBeam() {
    const ctx = this.ctx;
    const beam = this.epicBeam;
    if (!beam) return;

    beam.timer -= 16.6;
    if (beam.timer <= 0) {
      this.epicBeam = null;
      return;
    }

    ctx.save();

    // 1. 全屏微弱暗金微光 (深渊黑屏闪烁)
    if (beam.timer > 4000) {
      ctx.fillStyle = 'rgba(250, 214, 90, 0.15)';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. 垂直贯穿天地的金色光柱
    const beamW = 42 + Math.sin(Date.now() * 0.02) * 8;
    const grad = ctx.createLinearGradient(beam.x - beamW * 0.5, 0, beam.x + beamW * 0.5, 0);
    grad.addColorStop(0, 'rgba(250, 214, 90, 0)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)'); // 纯白高亮核心
    grad.addColorStop(1, 'rgba(250, 214, 90, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(beam.x - beamW * 0.5, 0, beamW, this.height - 30);

    // 3. 落地金光光斑
    ctx.fillStyle = 'rgba(250, 214, 90, 0.8)';
    ctx.beginPath();
    ctx.ellipse(beam.x, this.height - 30, 35, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. 浮空神装标牌
    ctx.fillStyle = '#121016';
    ctx.fillRect(beam.x - 65, 30, 130, 22);
    ctx.strokeStyle = '#fad65a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(beam.x - 65, 30, 130, 22);

    ctx.fillStyle = '#fad65a';
    ctx.font = 'bold 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`★ 太古史诗 · 掉落!`, beam.x, 45);

    ctx.restore();
  }

  renderParticles() {
    const ctx = this.ctx;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    }
  }

  renderFloatingTexts() {
    const ctx = this.ctx;
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy;
      t.alpha -= 0.022;

      if (t.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      // 文字描边增强可读性
      ctx.strokeStyle = '#100d16';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }
}
