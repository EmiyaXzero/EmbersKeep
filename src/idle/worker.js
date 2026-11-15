/**
 * 《余烬裂隙》后台抗休眠战斗 Web Worker (worker.js)
 * -------------------------------------------------------------
 * 运行在独立后台线程，不受浏览器最小化或标签页未激活的降频节流影响，
 * 维持 100ms 一次的恒定战斗心跳，并通过 postMessage 同步快照。
 */

import { BattleEngine } from './battle_engine.js';
import { executeForge, exchangeShardsForSigils } from './forge.js';

let engine = null;
let intervalId = null;

self.onmessage = function (e) {
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT': {
      engine = new BattleEngine(payload || {});
      if (intervalId) clearInterval(intervalId);

      intervalId = setInterval(() => {
        if (!engine) return;
        const events = engine.tick(100);
        self.postMessage({
          type: 'SNAPSHOT',
          snapshot: engine.getStateSnapshot(),
          events
        });
      }, 100);

      self.postMessage({
        type: 'INITIALIZED',
        snapshot: engine.getStateSnapshot()
      });
      break;
    }

    case 'EQUIP_ITEM': {
      if (engine) {
        engine.equipItem(payload.index);
        self.postMessage({ type: 'SNAPSHOT', snapshot: engine.getStateSnapshot(), events: [] });
      }
      break;
    }

    case 'AUTO_EQUIP': {
      if (engine) {
        engine.autoEquipBest();
        self.postMessage({ type: 'SNAPSHOT', snapshot: engine.getStateSnapshot(), events: [] });
      }
      break;
    }

    case 'DECOMPOSE_ALL': {
      if (engine) {
        const yieldData = engine.decomposeAllJunk();
        self.postMessage({
          type: 'DECOMPOSE_RESULT',
          yieldData,
          snapshot: engine.getStateSnapshot()
        });
      }
      break;
    }

    case 'FORGE_ITEM': {
      if (engine) {
        const item = payload.item;
        const forgeResult = executeForge(item, engine.wallet);
        if (forgeResult.fallbackWeapon) {
          engine.equippedMap.weapon = forgeResult.fallbackWeapon;
        }
        engine.updateHeroStats();
        self.postMessage({
          type: 'FORGE_RESULT',
          result: forgeResult,
          snapshot: engine.getStateSnapshot()
        });
      }
      break;
    }

    case 'EXCHANGE_SHARDS': {
      if (engine && engine.wallet.shards >= 100) {
        const res = exchangeShardsForSigils(engine.wallet.shards);
        engine.wallet.riftSigils += res.sigilsGained;
        engine.wallet.shards = res.remainingShards;
        self.postMessage({
          type: 'SNAPSHOT',
          snapshot: engine.getStateSnapshot(),
          events: [{ type: 'SHARDS_EXCHANGED', gained: res.sigilsGained }]
        });
      }
      break;
    }

    case 'TRIGGER_RIFT': {
      if (engine) {
        const ok = engine.checkOrTriggerRiftEvent();
        self.postMessage({
          type: 'SNAPSHOT',
          snapshot: engine.getStateSnapshot(),
          events: ok ? [{ type: 'RIFT_TRIGGERED' }] : []
        });
      }
      break;
    }

    case 'LOAD_SAVE': {
      if (engine && payload) {
        if (payload.wallet) Object.assign(engine.wallet, payload.wallet);
        if (payload.equippedMap) engine.equippedMap = payload.equippedMap;
        if (payload.inventory) engine.inventory = payload.inventory;
        if (payload.heroLevel) engine.hero.level = payload.heroLevel;
        engine.updateHeroStats();
        self.postMessage({ type: 'SNAPSHOT', snapshot: engine.getStateSnapshot(), events: [] });
      }
      break;
    }

    default:
      break;
  }
};
