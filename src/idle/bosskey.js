/**
 * 《余烬裂隙》摸鱼专精：老板键与独立长条小窗管理器 (bosskey.js)
 */

export class BossKeyManager {
  constructor(options = {}) {
    this.isStealth = false;
    this.container = options.container;
    this.terminalEl = options.terminalEl;
    this.onToggle = options.onToggle || (() => {});
    this.logTimer = null;
    this.init();
  }

  init() {
    window.addEventListener('keydown', (e) => {
      // 按 Esc 或波浪键 ~ 触发老板键
      if (e.key === 'Escape' || e.key === '`' || e.key === '~') {
        // 如果有弹出的抽屉，先关抽屉；否则触发伪装
        const openModal = document.querySelector('.idle-modal.is-open');
        if (openModal) {
          openModal.classList.remove('is-open');
        } else {
          this.toggleStealth();
        }
      }
    });
  }

  toggleStealth() {
    this.isStealth = !this.isStealth;

    if (this.isStealth) {
      if (this.container) this.container.classList.add('stealth-active');
      if (this.terminalEl) {
        this.terminalEl.classList.remove('is-hidden');
        this.startFauxLogStream();
      }
    } else {
      if (this.container) this.container.classList.remove('stealth-active');
      if (this.terminalEl) {
        this.terminalEl.classList.add('is-hidden');
        if (this.logTimer) clearInterval(this.logTimer);
      }
    }

    this.onToggle(this.isStealth);
  }

  startFauxLogStream() {
    if (!this.terminalEl) return;
    const logBox = this.terminalEl.querySelector('.terminal-logs');
    if (!logBox) return;

    const templates = [
      () => `[INFO] ${new Date().toLocaleTimeString()} [Worker-${Math.floor(Math.random()*8)+1}] Fetching CRM customer sync batch #${Math.floor(Math.random()*9000)+1000}... OK (24ms)`,
      () => `[DEBUG] ${new Date().toLocaleTimeString()} [ThreadPool-Executor] Evaluating active shards index... checksum matches.`,
      () => `[BUILD] ${new Date().toLocaleTimeString()} [Maven] Compiling dependency artifacts... 48/48 modules verified.`,
      () => `[INFO] ${new Date().toLocaleTimeString()} [KafkaConsumer] Partition 4 committed offset at 918420.`,
      () => `[TRACE] ${new Date().toLocaleTimeString()} [CacheEviction] TTL verified for namespace 'user.crm.tenant.v2'.`
    ];

    if (this.logTimer) clearInterval(this.logTimer);
    this.logTimer = setInterval(() => {
      const msg = templates[Math.floor(Math.random() * templates.length)]();
      const line = document.createElement('div');
      line.className = 'terminal-line';
      line.textContent = msg;
      logBox.appendChild(line);

      while (logBox.children.length > 30) {
        logBox.removeChild(logBox.firstChild);
      }
      logBox.scrollTop = logBox.scrollHeight;
    }, 1200);
  }

  static openPopoutWindow() {
    const width = 1600;
    const height = 220;
    const left = (window.screen.width - width) / 2;
    const top = window.screen.height - height - 60; // 贴在 Dock / 任务栏上方

    window.open(
      'idle.html?popup=true',
      'EmbersRiftDock',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );
  }
}
