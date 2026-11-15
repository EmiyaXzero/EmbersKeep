/**
 * 《余烬裂隙》摸鱼挂机 ARPG 前端交互控制中心 (ui.js)
 * -------------------------------------------------------------
 * 驱动底栏仪表盘、12 部位装备纸娃娃抽屉、秘银锻炉与老板键伪装。
 */

import { WorkerClient } from './worker_client.js';
import { IdleViewport } from './viewport.js';
import { BossKeyManager } from './bosskey.js';
import { sfx } from './sfx.js';
import { EQUIPMENT_SLOTS, SLOT_NAMES, RARITY_TIERS } from './equipment.js';
import { getForgeRate } from './forge.js';

export class IdleUI {
  constructor() {
    this.client = null;
    this.viewport = null;
    this.bossKey = null;
    this.latestSnapshot = null;
    this.selectedInvIndex = -1;
    this.forgeTargetItem = null;

    this.init();
  }

  init() {
    // 1. 初始化视口 Canvas
    const canvas = document.getElementById('dock-canvas');
    if (canvas) {
      this.viewport = new IdleViewport(canvas);
      window.addEventListener('resize', () => {
        const rect = canvas.getBoundingClientRect();
        this.viewport.resize(rect.width, rect.height);
      });
      const rect = canvas.getBoundingClientRect();
      this.viewport.resize(rect.width, rect.height);
    }

    // 2. 初始化老板键与终端伪装
    this.bossKey = new BossKeyManager({
      container: document.querySelector('.idle-dock'),
      terminalEl: document.getElementById('stealth-terminal')
    });

    // 3. 检查是否为独立弹窗模式
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('popup') === 'true') {
      document.body.classList.add('is-popup');
    }

    // 4. 初始化数值客户端与 Worker
    this.client = new WorkerClient({ heroLevel: 1, initialSigils: 0 });

    // 监听快照与事件
    this.client.on('SNAPSHOT', (data) => {
      this.latestSnapshot = data.snapshot;
      if (this.viewport && data.events) {
        this.viewport.processEvents(data.events);
      }
      this.renderDockHUD(data.snapshot);
    });

    this.client.on('FORGE_RESULT', (data) => {
      this.handleForgeResult(data.result);
      if (data.snapshot) this.latestSnapshot = data.snapshot;
      this.renderDockHUD(this.latestSnapshot);
      this.renderForgeModal();
    });

    this.client.on('DECOMPOSE_RESULT', (data) => {
      this.showToast(`分解完成！获得 金币+${data.yieldData.gold} 玄碳+${data.yieldData.cinders} 晶屑+${data.yieldData.shards}`);
      if (data.snapshot) this.latestSnapshot = data.snapshot;
      this.renderDockHUD(this.latestSnapshot);
      this.renderInventoryModal();
    });

    // 读取存档
    this.client.load();

    // 5. 绑定全局按钮事件
    this.bindDOMEvents();

    // 6. 启动 Canvas 渲染循环
    const animLoop = () => {
      if (this.viewport && this.latestSnapshot && !this.bossKey.isStealth) {
        this.viewport.render(this.latestSnapshot);
      }
      requestAnimationFrame(animLoop);
    };
    requestAnimationFrame(animLoop);

    // 7. 定时自动存档 (每 15 秒)
    setInterval(() => {
      if (this.client) this.client.save();
    }, 15000);
  }

  bindDOMEvents() {
    // 抽屉开关
    const btnBag = document.getElementById('btn-open-bag');
    const modalBag = document.getElementById('modal-bag');
    const btnForge = document.getElementById('btn-open-forge');
    const modalForge = document.getElementById('modal-forge');

    if (btnBag && modalBag) {
      btnBag.onclick = () => {
        if (modalForge) modalForge.classList.remove('is-open');
        modalBag.classList.toggle('is-open');
        if (modalBag.classList.contains('is-open')) this.renderInventoryModal();
      };
      document.getElementById('modal-bag-close').onclick = () => modalBag.classList.remove('is-open');
    }

    if (btnForge && modalForge) {
      btnForge.onclick = () => {
        if (modalBag) modalBag.classList.remove('is-open');
        modalForge.classList.toggle('is-open');
        if (modalForge.classList.contains('is-open')) this.renderForgeModal();
      };
      document.getElementById('modal-forge-close').onclick = () => modalForge.classList.remove('is-open');
    }

    // 老板键
    const btnBoss = document.getElementById('btn-bosskey');
    if (btnBoss) {
      btnBoss.onclick = () => this.bossKey.toggleStealth();
    }
    const stealthExit = document.getElementById('stealth-exit');
    if (stealthExit) {
      stealthExit.onclick = () => this.bossKey.toggleStealth();
    }

    // 独立长条小窗
    const btnPop = document.getElementById('btn-popout');
    if (btnPop) {
      btnPop.onclick = () => BossKeyManager.openPopoutWindow();
    }

    // 一键穿戴与一键分解
    const btnAutoEquip = document.getElementById('btn-auto-equip');
    if (btnAutoEquip) {
      btnAutoEquip.onclick = () => {
        this.client.autoEquip();
        this.showToast('已一键穿戴战力最高神装！');
        setTimeout(() => this.renderInventoryModal(), 80);
      };
    }

    const btnDecomposeAll = document.getElementById('btn-decompose-all');
    if (btnDecomposeAll) {
      btnDecomposeAll.onclick = () => {
        this.client.decomposeAll();
      };
    }

    // 晶屑兑换星石
    const btnExchangeShards = document.getElementById('btn-exchange-shards');
    if (btnExchangeShards) {
      btnExchangeShards.onclick = () => {
        if (!this.latestSnapshot || this.latestSnapshot.wallet.shards < 100) {
          this.showToast('虚空晶屑不足 100 颗！');
          return;
        }
        this.client.exchangeShards();
        this.showToast('成功兑换裂隙星石！');
      };
    }

    // 强化按钮
    const btnExecuteForge = document.getElementById('btn-execute-forge');
    if (btnExecuteForge) {
      btnExecuteForge.onclick = () => {
        if (!this.forgeTargetItem) {
          this.showToast('请先选择一件待强化的装备！');
          return;
        }
        this.client.forgeItem(this.forgeTargetItem);
      };
    }
  }

  /**
   * 刷新底栏仪表盘与 HUD
   */
  renderDockHUD(snap) {
    if (!snap) return;

    // 英雄姓名与等级
    const elName = document.getElementById('hud-hero-name');
    const elLevel = document.getElementById('hud-hero-level');
    const elCp = document.getElementById('hud-hero-cp');
    const elHpFill = document.getElementById('hud-hp-fill');

    if (elName) elName.textContent = snap.hero.name;
    if (elLevel) elLevel.textContent = `Lv.${snap.hero.level}`;
    if (elCp) elCp.textContent = `⚡ 战力 ${snap.hero.combatPower.toLocaleString()}`;
    if (elHpFill) {
      const hpPct = Math.max(0, Math.min(100, (snap.hero.hp / snap.hero.maxHp) * 100));
      elHpFill.style.width = `${hpPct}%`;
    }

    // 裂隙星石进度
    const elSigilCount = document.getElementById('hud-sigil-count');
    if (elSigilCount) {
      const sigils = snap.wallet.riftSigils || 0;
      elSigilCount.textContent = `${sigils} / 20`;
      if (sigils >= 20) {
        elSigilCount.classList.add('is-ready');
        elSigilCount.title = '裂隙星石已满，即将召唤远古方尖碑！';
      } else {
        elSigilCount.classList.remove('is-ready');
      }
    }

    // 钱包金币/材料
    const elGold = document.getElementById('hud-wallet-gold');
    const elCinders = document.getElementById('hud-wallet-cinders');
    const elShards = document.getElementById('hud-wallet-shards');

    if (elGold) elGold.textContent = (snap.wallet.gold || 0).toLocaleString();
    if (elCinders) elCinders.textContent = (snap.wallet.cinders || 0).toLocaleString();
    if (elShards) elShards.textContent = (snap.wallet.shards || 0).toLocaleString();
  }

  /**
   * 渲染 12 部位纸娃娃抽屉与背包
   */
  renderInventoryModal() {
    if (!this.latestSnapshot) return;
    const snap = this.latestSnapshot;

    // 1. 渲染 12 部位装备纸娃娃
    const dollBox = document.getElementById('paper-doll-slots');
    if (dollBox) {
      dollBox.innerHTML = '';
      EQUIPMENT_SLOTS.forEach(slot => {
        const item = snap.equippedMap[slot];
        const cell = document.createElement('div');
        cell.className = 'slot-box';

        const label = document.createElement('div');
        label.className = 'slot-label';
        label.textContent = SLOT_NAMES[slot];

        const nameEl = document.createElement('div');
        nameEl.className = 'slot-name';
        if (item) {
          const rarityConf = RARITY_TIERS[item.rarity] || RARITY_TIERS.common;
          nameEl.style.color = rarityConf.color;
          const rf = item.reinforceLevel > 0 ? `+${item.reinforceLevel} ` : '';
          nameEl.textContent = `${rf}${item.name}`;
          cell.title = `${item.name} (${rarityConf.name})\n战力: ${item.combatPower}`;
          cell.onclick = () => {
            this.forgeTargetItem = item;
            document.getElementById('modal-bag').classList.remove('is-open');
            document.getElementById('modal-forge').classList.add('is-open');
            this.renderForgeModal();
          };
        } else {
          nameEl.textContent = '空';
          nameEl.style.color = 'var(--text-dim)';
        }

        cell.appendChild(label);
        cell.appendChild(nameEl);
        dollBox.appendChild(cell);
      });
    }

    // 2. 渲染 24 格背包
    const invGrid = document.getElementById('inventory-cells');
    if (invGrid) {
      invGrid.innerHTML = '';
      for (let i = 0; i < 24; i++) {
        const item = snap.inventory[i];
        const cell = document.createElement('div');
        cell.className = 'inv-cell';

        if (item) {
          const rarityConf = RARITY_TIERS[item.rarity] || RARITY_TIERS.common;
          cell.style.borderColor = rarityConf.color;
          cell.innerHTML = `<span style="color:${rarityConf.color}">${item.reinforceLevel > 0 ? '+' + item.reinforceLevel : ''}${item.name.slice(0, 4)}</span>`;
          cell.title = `点击穿戴: ${item.name}\n部位: ${SLOT_NAMES[item.slot]}\n战力: ${item.combatPower}`;
          cell.onclick = () => {
            this.client.equipItem(i);
            this.showToast(`已装备: ${item.name}`);
            setTimeout(() => this.renderInventoryModal(), 80);
          };
        } else {
          cell.innerHTML = `<span style="color:#2c2636">-</span>`;
        }
        invGrid.appendChild(cell);
      }
    }
  }

  /**
   * 渲染秘银锻炉模态框
   */
  renderForgeModal() {
    if (!this.latestSnapshot) return;

    // 若未指定目标装备，默认选择当前佩戴的武器
    if (!this.forgeTargetItem) {
      this.forgeTargetItem = this.latestSnapshot.equippedMap.weapon;
    }

    const item = this.forgeTargetItem;
    const targetBox = document.getElementById('forge-target-info');
    const rateBox = document.getElementById('forge-rate-info');

    if (item && targetBox && rateBox) {
      const rarityConf = RARITY_TIERS[item.rarity] || RARITY_TIERS.common;
      const rf = item.reinforceLevel || 0;
      const rateInfo = getForgeRate(rf);

      targetBox.innerHTML = `
        <div style="font-size:14px; font-weight:bold; color:${rarityConf.color};">
          ${rf > 0 ? '+' + rf + ' ' : ''}${item.name}
        </div>
        <div style="font-size:11px; color:var(--text-dim); margin-top:4px;">
          部位: ${SLOT_NAMES[item.slot]} · 品阶: ${rarityConf.name} · 当前战力: ${item.combatPower}
        </div>
      `;

      const riskBadge = rateInfo.riskType === 'safe'
        ? '<span style="color:#4caf50;">安全 (不掉级)</span>'
        : rateInfo.riskType === 'degrade'
        ? '<span style="color:#ff9800;">风险 (失败跌落1级)</span>'
        : '<span style="color:#f44336; font-weight:bold;">高危 (失败装备碎裂为晶屑)</span>';

      rateBox.innerHTML = `
        <div>目标等级: <b>+${rateInfo.targetLevel}</b></div>
        <div>成功率: <b>${Math.round(rateInfo.successRate * 100)}%</b></div>
        <div>消耗金币: <b>${rateInfo.costGold.toLocaleString()}</b> (已有: ${this.latestSnapshot.wallet.gold.toLocaleString()})</div>
        <div>消耗玄碳: <b>${rateInfo.costCinders}</b> (已有: ${this.latestSnapshot.wallet.cinders})</div>
        <div style="grid-column: span 2; margin-top:4px;">风险评级: ${riskBadge}</div>
      `;
    }
  }

  handleForgeResult(res) {
    if (res.success) {
      sfx.playForgeSuccess();
      this.showToast(`✨ 锻造大成！成功晋升为 +${res.item.reinforceLevel}！`);
    } else {
      if (res.shattered) {
        sfx.playForgeFailure();
        this.showToast(`💥 熔炉碎裂！装备已破碎，获得 ${res.returnShards} 颗虚空晶屑 (已自动补发保底铁剑)`);
        this.forgeTargetItem = res.fallbackWeapon;
      } else if (res.degraded) {
        sfx.playForgeFailure();
        this.showToast(`⚠️ 锻造震荡！强化等级掉落至 +${res.item.reinforceLevel}`);
      } else {
        sfx.playForgeFailure();
        this.showToast(`强化未成，装备完好无损。`);
      }
    }
  }

  showToast(msg) {
    let toast = document.getElementById('idle-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'idle-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 175px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(20, 17, 26, 0.95);
        border: 1px solid var(--border-gold);
        color: #fad65a;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10000;
        box-shadow: 0 0 15px rgba(0,0,0,0.8);
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
    }, 2800);
  }
}
