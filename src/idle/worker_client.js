/**
 * 《余烬裂隙》Web Worker 客户端连接器与本地回退适配器 (worker_client.js)
 */

import { BattleEngine } from './battle_engine.js';
import { executeForge, exchangeShardsForSigils } from './forge.js';

export class WorkerClient {
  constructor(options = {}) {
    this.options = options;
    this.worker = null;
    this.fallbackEngine = null;
    this.fallbackTimer = null;
    this.listeners = new Set();
    this.lastSnapshot = null;
    this.init();
  }

  init() {
    try {
      // 尝试加载 ES 模块化 Web Worker
      this.worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e) => {
        const { type, snapshot, events, yieldData, result } = e.data;
        if (snapshot) this.lastSnapshot = snapshot;
        this.emit(type, { snapshot, events, yieldData, result });
      };

      this.worker.postMessage({ type: 'INIT', payload: this.options });
    } catch (err) {
      console.warn('[EmbersRift] Web Worker 不可用，无缝降级为主线程定时器:', err);
      this.initFallback();
    }
  }

  initFallback() {
    this.fallbackEngine = new BattleEngine(this.options);
    this.lastSnapshot = this.fallbackEngine.getStateSnapshot();

    this.fallbackTimer = setInterval(() => {
      if (!this.fallbackEngine) return;
      const events = this.fallbackEngine.tick(100);
      this.lastSnapshot = this.fallbackEngine.getStateSnapshot();
      this.emit('SNAPSHOT', { snapshot: this.lastSnapshot, events });
    }, 100);

    setTimeout(() => {
      this.emit('INITIALIZED', { snapshot: this.lastSnapshot });
    }, 50);
  }

  on(type, callback) {
    this.listeners.add({ type, callback });
    return () => {
      this.listeners.forEach(l => {
        if (l.type === type && l.callback === callback) {
          this.listeners.delete(l);
        }
      });
    };
  }

  emit(type, data) {
    this.listeners.forEach(l => {
      if (l.type === type || l.type === '*') {
        l.callback(data);
      }
    });
  }

  equipItem(index) {
    if (this.worker) {
      this.worker.postMessage({ type: 'EQUIP_ITEM', payload: { index } });
    } else if (this.fallbackEngine) {
      this.fallbackEngine.equipItem(index);
      this.lastSnapshot = this.fallbackEngine.getStateSnapshot();
      this.emit('SNAPSHOT', { snapshot: this.lastSnapshot, events: [] });
    }
  }

  autoEquip() {
    if (this.worker) {
      this.worker.postMessage({ type: 'AUTO_EQUIP' });
    } else if (this.fallbackEngine) {
      this.fallbackEngine.autoEquipBest();
      this.lastSnapshot = this.fallbackEngine.getStateSnapshot();
      this.emit('SNAPSHOT', { snapshot: this.lastSnapshot, events: [] });
    }
  }

  decomposeAll() {
    if (this.worker) {
      this.worker.postMessage({ type: 'DECOMPOSE_ALL' });
    } else if (this.fallbackEngine) {
      const yieldData = this.fallbackEngine.decomposeAllJunk();
      this.lastSnapshot = this.fallbackEngine.getStateSnapshot();
      this.emit('DECOMPOSE_RESULT', { yieldData, snapshot: this.lastSnapshot });
    }
  }

  forgeItem(item) {
    if (this.worker) {
      this.worker.postMessage({ type: 'FORGE_ITEM', payload: { item } });
    } else if (this.fallbackEngine) {
      const forgeResult = executeForge(item, this.fallbackEngine.wallet);
      if (forgeResult.fallbackWeapon) {
        this.fallbackEngine.equippedMap.weapon = forgeResult.fallbackWeapon;
      }
      this.fallbackEngine.updateHeroStats();
      this.lastSnapshot = this.fallbackEngine.getStateSnapshot();
      this.emit('FORGE_RESULT', { result: forgeResult, snapshot: this.lastSnapshot });
    }
  }

  exchangeShards() {
    if (this.worker) {
      this.worker.postMessage({ type: 'EXCHANGE_SHARDS' });
    } else if (this.fallbackEngine && this.fallbackEngine.wallet.shards >= 100) {
      const res = exchangeShardsForSigils(this.fallbackEngine.wallet.shards);
      this.fallbackEngine.wallet.riftSigils += res.sigilsGained;
      this.fallbackEngine.wallet.shards = res.remainingShards;
      this.lastSnapshot = this.fallbackEngine.getStateSnapshot();
      this.emit('SNAPSHOT', {
        snapshot: this.lastSnapshot,
        events: [{ type: 'SHARDS_EXCHANGED', gained: res.sigilsGained }]
      });
    }
  }

  triggerRift() {
    if (this.worker) {
      this.worker.postMessage({ type: 'TRIGGER_RIFT' });
    } else if (this.fallbackEngine) {
      const ok = this.fallbackEngine.checkOrTriggerRiftEvent();
      this.lastSnapshot = this.fallbackEngine.getStateSnapshot();
      this.emit('SNAPSHOT', {
        snapshot: this.lastSnapshot,
        events: ok ? [{ type: 'RIFT_TRIGGERED' }] : []
      });
    }
  }

  castSkill(key) {
    if (this.worker) {
      this.worker.postMessage({ type: 'CAST_SKILL', payload: { key } });
    } else if (this.fallbackEngine) {
      const events = [];
      const res = this.fallbackEngine.castSkill(key, events);
      this.lastSnapshot = this.fallbackEngine.getStateSnapshot();
      this.emit('SNAPSHOT', { snapshot: this.lastSnapshot, events });
      return res;
    }
  }

  toggleAutoCast(enable) {
    if (this.worker) {
      this.worker.postMessage({ type: 'TOGGLE_AUTO_CAST', payload: { enable } });
    } else if (this.fallbackEngine) {
      if (enable !== undefined) {
        this.fallbackEngine.autoCastSkills = Boolean(enable);
      } else {
        this.fallbackEngine.autoCastSkills = !this.fallbackEngine.autoCastSkills;
      }
      this.lastSnapshot = this.fallbackEngine.getStateSnapshot();
      this.emit('SNAPSHOT', { snapshot: this.lastSnapshot, events: [] });
    }
  }

  save() {
    if (this.lastSnapshot) {
      try {
        localStorage.setItem('embers_rift_save_v1', JSON.stringify({
          wallet: this.lastSnapshot.wallet,
          equippedMap: this.lastSnapshot.equippedMap,
          inventory: this.lastSnapshot.inventory,
          heroLevel: this.lastSnapshot.hero.level,
          savedAt: Date.now()
        }));
      } catch (e) {
        // storage quota exceeded or disabled
      }
    }
  }

  load() {
    try {
      const raw = localStorage.getItem('embers_rift_save_v1');
      if (raw) {
        const data = JSON.parse(raw);
        if (this.worker) {
          this.worker.postMessage({ type: 'LOAD_SAVE', payload: data });
        } else if (this.fallbackEngine) {
          if (data.wallet) Object.assign(this.fallbackEngine.wallet, data.wallet);
          if (data.equippedMap) this.fallbackEngine.equippedMap = data.equippedMap;
          if (data.inventory) this.fallbackEngine.inventory = data.inventory;
          if (data.heroLevel) this.fallbackEngine.hero.level = data.heroLevel;
          this.fallbackEngine.updateHeroStats();
          this.lastSnapshot = this.fallbackEngine.getStateSnapshot();
          this.emit('SNAPSHOT', { snapshot: this.lastSnapshot, events: [] });
        }
      }
    } catch (e) {
      // ignore corrupted save
    }
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }
}
