/**
 * PixelForge AI 像素工坊 · 工作台主控制器 (app.js)
 * ---------------------------------------------------------------
 * 串联 Palette / Matrix / Animator / Exporter / Presets 五大模块，
 * 驱动左侧资产库、中央 CRT 像素视口与右侧调色板合规看板。
 */
import {
  EMBERS_PALETTE,
  PALETTE_FAMILIES,
  analyzePalette,
  quantizeSvg,
  replaceColor,
  retintSvg,
  snapColorInfo
} from './palette.js';
import { complianceScore, rasterizeSvg, validateSvg } from './matrix.js';
import { AnimationPlayer } from './animator.js';
import {
  canvasToPngBytes,
  createZipBundle,
  generateAnimationJson,
  generateSpritesheet,
  triggerDownload
} from './exporter.js';
import { MONSTERS, PRESET_STATS, TOWERS, buildPrompt, findPreset } from './presets.js';

const STATE_LABELS = {
  idle: '静态单帧',
  walk: '行走',
  attack: '攻击',
  death: '死亡'
};

const ZOOM_LEVELS = [2, 4, 6, 8];

const INVALID_SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <path d="M4 4 L28 4 L28 28 Z" fill="#55a4db"/>
  <circle cx="16" cy="16" r="6" fill="#f28929"/>
  <rect x="10.5" y="12" width="6" height="6" fill="#fad65a"/>
</svg>`;

const $ = (id) => document.getElementById(id);

const els = {
  assetList: $('asset-list'),
  assetCount: $('asset-count'),
  tabTower: $('tab-tower'),
  tabMonster: $('tab-monster'),
  stageKind: $('stage-kind'),
  stageName: $('stage-name'),
  stageRole: $('stage-role'),
  flagCrisp: $('flag-crisp'),
  flagGrid: $('flag-grid'),
  flagZoom: $('flag-zoom'),
  stageCanvas: $('stage-canvas'),
  rulerX: $('ruler-x'),
  rulerY: $('ruler-y'),
  viewportInfo: $('viewport-info'),
  animTabs: $('anim-tabs'),
  playBtn: $('play-btn'),
  playIcon: $('play-icon'),
  playLabel: $('play-label'),
  prevBtn: $('prev-btn'),
  nextBtn: $('next-btn'),
  frameLabel: $('frame-label'),
  frameProgress: $('frame-progress'),
  fpsSlider: $('fps-slider'),
  fpsValue: $('fps-value'),
  onionToggle: $('onion-toggle'),
  gridToggle: $('grid-toggle'),
  zoomGroup: $('zoom-group'),
  paletteCoverage: $('palette-coverage'),
  familyRow: $('family-row'),
  swatchGrid: $('swatch-grid'),
  quantizeBtn: $('quantize-btn'),
  resetBtn: $('reset-btn'),
  scoreValue: $('score-value'),
  meterList: $('meter-list'),
  issueList: $('issue-list'),
  colorBars: $('color-bars'),
  colorCount: $('color-count'),
  promptTabs: $('prompt-tabs'),
  promptOutput: $('prompt-output'),
  copyPrompt: $('copy-prompt'),
  exportBtn: $('export-btn'),
  customToggle: $('custom-toggle'),
  customPanel: $('custom-panel'),
  customClose: $('custom-close'),
  customInput: $('custom-input'),
  customValidate: $('custom-validate'),
  customSample: $('custom-sample'),
  customIssues: $('custom-issues'),
  statusText: $('status-text'),
  statusRight: $('status-right'),
  toast: $('toast')
};

const studio = {
  tab: 'tower',
  asset: null,
  animation: 'idle',
  zoom: 6,
  grid: true,
  onion: false,
  fps: 6,
  working: {},
  frames: {},
  player: null,
  theme: null,
  promptKind: 'tower',
  customAsset: null,
  transportKey: '',
  thumbCache: new Map()
};

let lastTime = 0;
let toastTimer = 0;

/* ============================== 初始化 ============================== */

async function init() {
  buildPaletteUi();
  buildFamilyUi();
  bindEvents();
  const preset = findPreset('tower', 'thunder_ballista') || TOWERS[0];
  await selectAsset(preset);
  els.statusRight.textContent = `${PRESET_STATS.towerCount} 塔 · ${PRESET_STATS.monsterCount} 怪 · ${PRESET_STATS.monsterFrameCount} 帧 · 离线资产内联`;
  requestAnimationFrame(renderLoop);
  setStatus('工作台就绪 · 点击左侧卡牌即时渲染，空格播放，1-4 切换缩放');
}

/* ============================== 静态 UI 构建 ============================== */

function buildPaletteUi() {
  els.swatchGrid.innerHTML = EMBERS_PALETTE.map(
    (entry) =>
      `<button class="swatch" type="button" data-color="${entry.hex}" title="${entry.name} ${entry.hex.toUpperCase()} · ${PALETTE_FAMILIES[entry.family].name}" style="background:${entry.hex}"></button>`
  ).join('');
}

function buildFamilyUi() {
  els.familyRow.innerHTML = Object.values(PALETTE_FAMILIES)
    .map(
      (family) =>
        `<button class="family-btn" type="button" data-family="${family.id}" title="${family.description}">${family.name}</button>`
    )
    .join('');
}

/* ============================== 事件绑定 ============================== */

function bindEvents() {
  els.tabTower.addEventListener('click', () => switchTab('tower'));
  els.tabMonster.addEventListener('click', () => switchTab('monster'));

  els.assetList.addEventListener('click', (event) => {
    const card = event.target.closest('.asset-card');
    if (!card) return;
    const { assetId, assetType } = card.dataset;
    const asset =
      assetType === 'monster'
        ? findPreset('monster', assetId)
        : assetId === 'custom'
          ? studio.customAsset
          : findPreset('tower', assetId);
    if (asset) void guard(selectAsset(asset), '载入资产');
  });

  els.animTabs.addEventListener('click', (event) => {
    const tab = event.target.closest('.anim-tab');
    if (!tab || tab.disabled) return;
    switchAnimation(tab.dataset.state);
  });

  els.zoomGroup.addEventListener('click', (event) => {
    const btn = event.target.closest('.zoom-btn');
    if (!btn) return;
    setZoom(Number(btn.dataset.zoom));
  });

  els.playBtn.addEventListener('click', togglePlay);
  els.prevBtn.addEventListener('click', () => stepFrame(-1));
  els.nextBtn.addEventListener('click', () => stepFrame(1));

  els.fpsSlider.addEventListener('input', () => {
    const value = Number(els.fpsSlider.value);
    studio.fps = studio.player ? studio.player.setFps(value) : value;
    els.fpsValue.textContent = String(studio.fps);
    syncTransport(true);
  });

  els.onionToggle.addEventListener('change', () => {
    studio.onion = els.onionToggle.checked;
    if (studio.player) studio.player.toggleOnionSkin(studio.onion);
    setStatus(studio.onion ? '洋葱皮已开启：前后帧以 25% 透明度叠加' : '洋葱皮已关闭');
  });

  els.gridToggle.addEventListener('change', () => {
    studio.grid = els.gridToggle.checked;
    setStatus(studio.grid ? '像素网格标尺已开启' : '像素网格标尺已关闭');
  });

  els.swatchGrid.addEventListener('click', (event) => {
    const swatch = event.target.closest('.swatch');
    if (swatch) void guard(applySwatch(swatch.dataset.color), '调色板换肤');
  });

  els.familyRow.addEventListener('click', (event) => {
    const btn = event.target.closest('.family-btn');
    if (btn) void guard(applyFamily(btn.dataset.family), '色系换肤');
  });

  els.quantizeBtn.addEventListener('click', () => {
    void guard(applySvgTransform(quantizeSvg, '已完成 16 色量化吸附，覆盖率 100%'), '16 色量化');
  });

  els.resetBtn.addEventListener('click', () => void guard(resetSvg(), '恢复原色'));

  els.promptTabs.addEventListener('click', (event) => {
    const btn = event.target.closest('.prompt-tab');
    if (!btn) return;
    studio.promptKind = btn.dataset.prompt;
    els.promptTabs.querySelectorAll('.prompt-tab').forEach((item) => {
      item.classList.toggle('is-active', item === btn);
    });
    refreshPrompt();
  });

  els.copyPrompt.addEventListener('click', () => void copyPrompt());

  els.exportBtn.addEventListener('click', () => void guard(exportBundle(), '导出资产包'));

  els.customToggle.addEventListener('click', () => {
    els.customPanel.hidden = !els.customPanel.hidden;
    if (!els.customPanel.hidden) {
      els.customInput.focus();
      setStatus('自定义 SVG 校验：仅允许 crispEdges + 整数网格 rect');
    }
  });

  els.customClose.addEventListener('click', () => {
    els.customPanel.hidden = true;
  });

  els.customSample.addEventListener('click', () => {
    els.customInput.value = INVALID_SAMPLE;
    renderCustomIssues(validateSvg(INVALID_SAMPLE));
  });

  els.customValidate.addEventListener('click', () => {
    void guard(loadCustomSvg(els.customInput.value), '自定义 SVG 载入');
  });

  document.addEventListener('keydown', handleHotkey);
}

function handleHotkey(event) {
  const tag = (event.target && event.target.tagName ? event.target.tagName : '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  switch (event.key) {
    case ' ':
      event.preventDefault();
      togglePlay();
      break;
    case '[':
      event.preventDefault();
      stepFrame(-1);
      break;
    case ']':
      event.preventDefault();
      stepFrame(1);
      break;
    case 'g':
    case 'G':
      event.preventDefault();
      els.gridToggle.checked = !els.gridToggle.checked;
      els.gridToggle.dispatchEvent(new Event('change'));
      break;
    case 'o':
    case 'O':
      event.preventDefault();
      els.onionToggle.checked = !els.onionToggle.checked;
      els.onionToggle.dispatchEvent(new Event('change'));
      break;
    case '1':
    case '2':
    case '3':
    case '4':
      event.preventDefault();
      setZoom(ZOOM_LEVELS[Number(event.key) - 1]);
      break;
    default:
      break;
  }
}

/* ============================== 资产选择 ============================== */

async function selectAsset(asset) {
  if (!asset) return;
  studio.asset = asset;
  studio.tab = asset.type === 'monster' ? 'monster' : 'tower';
  studio.animation = asset.type === 'monster' ? 'walk' : 'idle';
  studio.working = cloneBase(asset);
  studio.theme = null;
  studio.onion = false;
  els.onionToggle.checked = false;
  studio.fps = defaultFps(asset, studio.animation);
  els.fpsSlider.value = String(studio.fps);
  els.fpsValue.textContent = String(studio.fps);

  await rebuildFrames();
  buildPlayer();

  syncTabUi();
  renderAssetList();
  syncAssetHeader();
  renderAnimTabs();
  updateZoomUi();
  refreshInspector();
  refreshPrompt();
  syncTransport(true);
  setStatus(`已载入「${asset.name}」· ${asset.width}×${asset.height} · ${Object.keys(studio.working).length} 个动作状态`);
}

function cloneBase(asset) {
  if (asset.type === 'monster') {
    const map = {};
    for (const [state, animation] of Object.entries(asset.animations)) {
      map[state] = [...animation.frames];
    }
    return map;
  }
  return { idle: [asset.svg] };
}

function defaultFps(asset, state) {
  if (asset.type === 'monster' && asset.animations[state]) return asset.animations[state].fps;
  return 6;
}

async function rebuildFrames() {
  const next = {};
  for (const [state, svgs] of Object.entries(studio.working)) {
    next[state] = await Promise.all(svgs.map((svg) => rasterizeSvg(svg, 1)));
  }
  studio.frames = next;
}

function buildPlayer() {
  const asset = studio.asset;
  const animations = {};
  for (const [state, svgs] of Object.entries(studio.working)) {
    const source = asset.type === 'monster' ? asset.animations[state] : null;
    animations[state] = {
      frameCount: svgs.length,
      loop: source ? source.loop : true,
      fps: source ? source.fps : undefined
    };
  }
  studio.player = new AnimationPlayer({
    frameWidth: asset.width,
    frameHeight: asset.height,
    animations,
    onionSkin: studio.onion
  });
  studio.player.setAnimation(studio.animation);
  studio.player.setFps(studio.fps);
  if (studio.player.frameCount <= 1) studio.player.pause();
}

function switchAnimation(state) {
  if (!studio.working[state]) return;
  studio.animation = state;
  const source = studio.asset.type === 'monster' ? studio.asset.animations[state] : null;
  if (source) {
    studio.fps = source.fps;
    els.fpsSlider.value = String(studio.fps);
    els.fpsValue.textContent = String(studio.fps);
  }
  studio.player.setAnimation(state);
  studio.player.setFps(studio.fps);
  if (studio.player.frameCount <= 1) studio.player.pause();
  renderAnimTabs();
  refreshInspector();
  refreshPrompt();
  syncTransport(true);
  setStatus(`${studio.asset.name} · ${STATE_LABELS[state] || state} · ${studio.working[state].length} 帧 · ${studio.fps} FPS`);
}

function switchTab(tab) {
  if (studio.tab === tab && studio.asset) return;
  studio.tab = tab;
  syncTabUi();
  if (tab === 'monster' && studio.asset && studio.asset.type !== 'monster') {
    void guard(selectAsset(MONSTERS[0]), '载入怪物资产');
    return;
  }
  if (tab === 'tower' && studio.asset && studio.asset.type === 'monster') {
    void guard(selectAsset(TOWERS[0]), '载入防御塔资产');
    return;
  }
  renderAssetList();
}

function syncTabUi() {
  els.tabTower.classList.toggle('is-active', studio.tab === 'tower');
  els.tabMonster.classList.toggle('is-active', studio.tab === 'monster');
  els.tabTower.setAttribute('aria-selected', String(studio.tab === 'tower'));
  els.tabMonster.setAttribute('aria-selected', String(studio.tab === 'monster'));
}

/* ============================== 左侧资产列表 ============================== */

function renderAssetList() {
  const items =
    studio.tab === 'tower'
      ? [...TOWERS, ...(studio.customAsset ? [studio.customAsset] : [])]
      : [...MONSTERS];

  els.assetList.innerHTML = items
    .map((asset) => {
      const isActive =
        studio.asset && studio.asset.id === asset.id && studio.asset.type === asset.type;
      const frameCount =
        asset.type === 'monster'
          ? Object.values(asset.animations).reduce((total, animation) => total + animation.frames.length, 0)
          : 1;
      const meta = `${asset.width}×${asset.height} · ${frameCount} 帧 · ${asset.role}`;
      const badge =
        asset.type === 'monster' ? 'ANIM' : asset.custom ? 'CUSTOM' : String(asset.category || 'tower').toUpperCase();
      return `<button class="asset-card ${isActive ? 'is-active' : ''}" type="button" data-asset-id="${asset.id}" data-asset-type="${asset.type}">
        <span class="asset-thumb"><canvas width="${asset.width}" height="${asset.height}"></canvas></span>
        <span class="asset-info">
          <span class="asset-name">${escapeHtml(asset.name)}</span>
          <span class="asset-meta">${escapeHtml(meta)}</span>
        </span>
        <span class="asset-badge">${badge}</span>
      </button>`;
    })
    .join('');

  const customCount = studio.customAsset ? 1 : 0;
  els.assetCount.textContent =
    studio.tab === 'tower'
      ? `${PRESET_STATS.towerCount + customCount} 款防御塔`
      : `${PRESET_STATS.monsterCount} 款怪物`;

  items.forEach((asset) => void drawThumbnail(asset));
}

async function drawThumbnail(asset) {
  const svg = asset.type === 'monster' ? asset.animations.walk.frames[0] : asset.svg;
  const cacheKey = `${asset.type}:${asset.id}:${svg.length}`;
  let source = studio.thumbCache.get(cacheKey);
  try {
    if (!source) {
      source = await rasterizeSvg(svg, 1);
      studio.thumbCache.set(cacheKey, source);
    }
  } catch (error) {
    console.warn('缩略图生成失败', asset.id, error);
    return;
  }
  const card = els.assetList.querySelector(`[data-asset-id="${asset.id}"][data-asset-type="${asset.type}"]`);
  const canvas = card ? card.querySelector('canvas') : null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
}

function syncAssetHeader() {
  const asset = studio.asset;
  if (!asset) return;
  els.stageKind.textContent = asset.type === 'monster' ? 'MONSTER' : asset.custom ? 'CUSTOM' : 'TOWER';
  els.stageName.textContent = asset.name;
  els.stageRole.textContent = asset.role;
}

function renderAnimTabs() {
  const asset = studio.asset;
  if (!asset) return;
  const states = Object.keys(studio.working);
  els.animTabs.innerHTML = states
    .map((state) => {
      const count = studio.working[state].length;
      const label =
        asset.type === 'monster'
          ? `${STATE_LABELS[state] || state} ${state.toUpperCase()}`
          : '静态单帧';
      return `<button class="anim-tab ${state === studio.animation ? 'is-active' : ''}" type="button" data-state="${state}" ${count <= 1 ? 'disabled' : ''}>
        ${label}<em>${count}F</em>
      </button>`;
    })
    .join('');
}

/* ============================== 渲染循环 ============================== */

function renderLoop(now) {
  const delta = lastTime ? Math.min(now - lastTime, 200) : 16;
  lastTime = now;

  if (studio.player) {
    if (studio.player.isPlaying && !document.hidden) studio.player.step(delta);
    drawStage();
    syncTransport(false);
  }
  requestAnimationFrame(renderLoop);
}

function drawStage() {
  const asset = studio.asset;
  if (!asset) return;
  const canvas = els.stageCanvas;
  const width = asset.width * studio.zoom;
  const height = asset.height * studio.zoom;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  studio.player.renderCurrentFrame(ctx, studio.zoom, studio.grid, {
    getFrame: (state, index) => (studio.frames[state] ? studio.frames[state][index] || null : null),
    width: asset.width,
    height: asset.height
  });
}

function syncTransport(force) {
  const player = studio.player;
  if (!player) return;
  const key = `${player.state}|${player.currentFrame}|${player.isPlaying}|${player.frameCount}|${studio.fps}`;
  if (!force && key === studio.transportKey) return;
  studio.transportKey = key;

  const count = player.frameCount;
  const index = Math.min(player.currentFrame, Math.max(0, count - 1));
  els.frameLabel.textContent = `帧 ${index + 1} / ${count}`;
  els.frameProgress.style.width = `${count > 1 ? ((index + 1) / count) * 100 : 100}%`;
  els.playIcon.textContent = player.isPlaying ? '❚❚' : '▶';
  els.playLabel.textContent = player.isPlaying ? '暂停' : '播放';
  els.playBtn.disabled = count <= 1;
  els.prevBtn.disabled = count <= 1;
  els.nextBtn.disabled = count <= 1;
  els.fpsSlider.disabled = count <= 1;
  els.fpsValue.textContent = String(studio.fps);
}

function togglePlay() {
  if (!studio.player) return;
  if (studio.player.frameCount <= 1) {
    toast('当前资产为单帧静态图，无需播放');
    return;
  }
  studio.player.toggle();
  syncTransport(true);
}

function stepFrame(direction) {
  if (!studio.player || studio.player.frameCount <= 1) return;
  if (direction < 0) studio.player.prevFrame();
  else studio.player.nextFrame();
  syncTransport(true);
}

function setZoom(level) {
  if (!ZOOM_LEVELS.includes(level)) return;
  studio.zoom = level;
  updateZoomUi();
  setStatus(`视口缩放 ${level}× · 最近邻采样保持硬边`);
}

function updateZoomUi() {
  const asset = studio.asset;
  if (!asset) return;
  els.flagZoom.textContent = `${studio.zoom}×`;
  els.zoomGroup.querySelectorAll('.zoom-btn').forEach((btn) => {
    btn.classList.toggle('is-active', Number(btn.dataset.zoom) === studio.zoom);
  });

  const canvasWidth = asset.width * studio.zoom;
  const canvasHeight = asset.height * studio.zoom;
  els.rulerX.style.width = `${canvasWidth}px`;
  els.rulerY.style.height = `${canvasHeight}px`;
  els.rulerX.innerHTML = buildRuler(asset.width, studio.zoom, 'x');
  els.rulerY.innerHTML = buildRuler(asset.height, studio.zoom, 'y');

  const frameTotal = Object.values(studio.working).reduce((total, list) => total + list.length, 0);
  els.viewportInfo.textContent = `${asset.width} × ${asset.height} px · ${studio.zoom}× · ${frameTotal} 帧`;
}

function buildRuler(size, zoom, axis) {
  let html = '';
  for (let value = 0; value <= size; value += 8) {
    const major = value % 16 === 0;
    const style = axis === 'x' ? `left:${value * zoom}px` : `top:${value * zoom}px`;
    html += `<span class="${major ? 'major' : ''}" style="${style}">${value}</span>`;
  }
  return html;
}

/* ============================== 调色板操作 ============================== */

async function applySvgTransform(transform, message) {
  const next = {};
  let changed = 0;
  for (const [state, svgs] of Object.entries(studio.working)) {
    next[state] = svgs.map((svg) => {
      const output = transform(svg);
      if (output !== svg) changed += 1;
      return output;
    });
  }
  if (changed === 0) {
    toast('颜色未发生变化');
    return;
  }
  const frame = studio.player ? studio.player.currentFrame : 0;
  const playing = studio.player ? studio.player.isPlaying : false;

  studio.working = next;
  await rebuildFrames();
  if (studio.player) {
    studio.player.seek(frame);
    if (playing && studio.player.frameCount > 1) {
      studio.player.play();
      studio.player.seek(frame);
    } else {
      studio.player.pause();
    }
  }
  refreshInspector();
  syncTransport(true);
  setStatus(message);
  toast(message);
}

async function applySwatch(hex) {
  const representative = studio.working[studio.animation] ? studio.working[studio.animation][0] : '';
  if (!representative) return;
  const analysis = analyzePalette(representative);
  const accent = analysis.stats.find((entry) => {
    const info = snapColorInfo(entry.color);
    return info.family === 'fire' || info.family === 'arcane';
  });
  if (!accent) {
    toast('当前资产没有可替换的彩色层，请尝试色系换肤');
    return;
  }
  const target = hex.toLowerCase();
  if (accent.color === target) {
    toast('该颜色已是当前主色');
    return;
  }
  const name = snapColorInfo(target).name;
  await applySvgTransform(
    (svg) => replaceColor(svg, accent.color, target),
    `换肤：${accent.color.toUpperCase()} → ${target.toUpperCase()}（${name}）`
  );
}

async function applyFamily(familyId) {
  studio.theme = familyId;
  syncFamilyUi();
  const label = PALETTE_FAMILIES[familyId].name;
  await applySvgTransform((svg) => retintSvg(svg, familyId), `色系换肤完成 · ${label}系（保留暗部结构色）`);
}

async function resetSvg() {
  const playing = studio.player ? studio.player.isPlaying : false;
  studio.working = cloneBase(studio.asset);
  studio.theme = null;
  syncFamilyUi();
  await rebuildFrames();
  if (studio.player) {
    studio.player.seek(0);
    if (playing && studio.player.frameCount > 1) {
      studio.player.play();
      studio.player.seek(0);
    } else {
      studio.player.pause();
    }
  }
  refreshInspector();
  syncTransport(true);
  setStatus('已恢复原始配色与原始帧矩阵');
  toast('已恢复原始配色');
}

function syncFamilyUi() {
  els.familyRow.querySelectorAll('.family-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.family === studio.theme);
  });
}

/* ============================== 右侧体检看板 ============================== */

function refreshInspector() {
  const asset = studio.asset;
  if (!asset) return;

  const current = studio.working[studio.animation] || [];
  const representative = current[0] || '';
  const allSvgs = Object.values(studio.working).flat();
  const validations = allSvgs.map((svg) => validateSvg(svg));
  const primary = validateSvg(representative);
  const analysis = analyzePalette(representative);

  const invalidFrames = validations.filter((item) => !item.valid).length;
  const frameCompliance = allSvgs.length
    ? Math.round(((allSvgs.length - invalidFrames) / allSvgs.length) * 1000) / 10
    : 0;
  const score = complianceScore(primary, analysis.paletteCoverage);

  els.scoreValue.textContent = score.toFixed(1);
  els.scoreValue.className =
    'score' + (score >= 95 ? ' is-good' : score >= 70 ? ' is-mid' : ' is-bad');

  const metrics = [
    { label: 'crispEdges', value: primary.stats.crispEdges ? 100 : 0 },
    { label: '整数网格对齐', value: primary.stats.gridAligned ? 100 : 0 },
    { label: '16 色覆盖率', value: analysis.paletteCoverage },
    { label: '帧合规率', value: frameCompliance }
  ];
  els.meterList.innerHTML = metrics
    .map(
      (metric) => `<div class="meter ${metric.value >= 100 ? 'is-ok' : metric.value < 60 ? 'is-bad' : ''}">
        <span>${metric.label}</span>
        <div class="meter-track"><i style="width:${Math.min(100, metric.value)}%"></i></div>
        <b>${formatPercent(metric.value)}</b>
      </div>`
    )
    .join('');

  els.paletteCoverage.textContent = `覆盖 ${formatPercent(analysis.paletteCoverage)}`;
  markUsedSwatches(analysis);

  els.flagCrisp.className = `flag ${primary.stats.crispEdges ? 'flag-ok' : 'flag-bad'}`;
  els.flagCrisp.textContent = primary.stats.crispEdges ? 'crispEdges ✓' : 'crispEdges ✗';
  els.flagGrid.className = `flag ${primary.stats.gridAligned ? 'flag-ok' : 'flag-bad'}`;
  els.flagGrid.textContent = `GRID ${asset.width}×${asset.height}`;

  const issues = [];
  validations.slice(0, 2).forEach((item) => {
    item.errors.slice(0, 2).forEach((message) => issues.push({ type: 'error', message }));
  });
  const warningSet = [...new Set(validations.flatMap((item) => item.warnings))].slice(0, 3);
  warningSet.forEach((message) => issues.push({ type: 'warn', message }));
  if (issues.length === 0) {
    issues.push({
      type: 'ok',
      message: '全部帧通过硬边像素规范：仅 <rect> 图元、整数坐标、crispEdges 声明完整。'
    });
  }
  els.issueList.innerHTML = issues
    .map((issue) => `<li class="is-${issue.type === 'error' ? 'error' : issue.type === 'warn' ? 'warn' : 'ok'}">${escapeHtml(issue.message)}</li>`)
    .join('');

  const topColors = analysis.stats.slice(0, 6);
  els.colorBars.innerHTML = topColors.length
    ? topColors
        .map(
          (entry) => `<div class="color-row">
            <span class="color-chip" style="background:${entry.color}"></span>
            <span class="color-hex">${entry.color.slice(1).toUpperCase()}</span>
            <div class="color-track"><i style="width:${Math.max(2, entry.percent)}%;background:${entry.color}"></i></div>
            <span class="color-percent">${entry.percent}%</span>
          </div>`
        )
        .join('')
    : '<div class="color-row"><span class="color-hex">无像素数据</span></div>';
  els.colorCount.textContent = `${analysis.uniqueColors} 色`;
}

function markUsedSwatches(analysis) {
  const used = new Set(analysis.stats.filter((entry) => entry.inPalette).map((entry) => entry.color));
  els.swatchGrid.querySelectorAll('.swatch').forEach((swatch) => {
    swatch.classList.toggle('is-used', used.has(swatch.dataset.color));
  });
}

function formatPercent(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

/* ============================== Prompt 模板 ============================== */

function refreshPrompt() {
  const asset = studio.asset;
  if (!asset) return;
  let text = '';
  if (studio.promptKind === 'monster') {
    const state = studio.animation === 'idle' ? 'walk' : studio.animation;
    const frames = (studio.working[state] || []).length || 4;
    text = buildPrompt('monster', { name: asset.name, action: state, frames });
  } else if (studio.promptKind === 'core') {
    text = buildPrompt('core', { name: `${asset.name} · 能量核心`, theme: '雷暴' });
  } else {
    text = buildPrompt('tower', { name: asset.name, theme: '暗黑哥特' });
  }
  els.promptOutput.value = text;
}

async function copyPrompt() {
  const text = els.promptOutput.value;
  if (!text) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      els.promptOutput.select();
      document.execCommand('copy');
      els.promptOutput.setSelectionRange(0, 0);
    }
    toast('Prompt 已复制到剪贴板');
    setStatus('Prompt 已复制，可直接粘贴给任意 LLM');
  } catch (error) {
    toast('复制失败，请手动选择文本', 'error');
    console.warn(error);
  }
}

/* ============================== 自定义 SVG ============================== */

function renderCustomIssues(validation) {
  const items = [
    ...validation.errors.map((message) => ({ type: 'error', message })),
    ...validation.warnings.slice(0, 3).map((message) => ({ type: 'warn', message }))
  ];
  els.customIssues.innerHTML = items.length
    ? items
        .map(
          (item) =>
            `<li class="is-${item.type === 'error' ? 'error' : 'warn'}">${escapeHtml(item.message)}</li>`
        )
        .join('')
    : '<li class="is-ok">校验通过：仅含整数网格 &lt;rect&gt; 且已声明 crispEdges。</li>';
}

async function loadCustomSvg(text) {
  if (!text || !text.trim()) {
    toast('请先粘贴 SVG 源码', 'error');
    return;
  }
  const validation = validateSvg(text);
  renderCustomIssues(validation);
  if (!validation.valid) {
    setStatus(`SVG 校验失败：${validation.errors[0]}`);
    toast('SVG 校验未通过，已在右侧定位违规图元', 'error');
    return;
  }
  const custom = {
    id: 'custom',
    name: '自定义 SVG',
    type: 'tower',
    custom: true,
    category: 'custom',
    role: `自定义 ${validation.width}×${validation.height} 矩阵`,
    width: validation.width,
    height: validation.height,
    description: '从自定义输入框导入的矢量像素矩阵',
    svg: text.trim()
  };
  studio.customAsset = custom;
  studio.thumbCache.clear();
  studio.tab = 'tower';
  await selectAsset(custom);
  els.customPanel.hidden = true;
  toast('自定义 SVG 已载入并通过合规校验');
}

/* ============================== 资产包导出 ============================== */

async function exportBundle() {
  const asset = studio.asset;
  if (!asset) return;
  const label = els.exportBtn.textContent;
  els.exportBtn.disabled = true;
  els.exportBtn.classList.add('is-busy');
  els.exportBtn.textContent = '正在打包…';
  setStatus('正在栅格化帧序列并写入 PKZip 资产包…');

  try {
    const files = [];
    const states = Object.keys(studio.working);
    const textureBase = asset.id;

    if (asset.type === 'monster') {
      const allSvgs = [];
      const animationsMeta = {};
      let cursor = 0;

      for (const state of states) {
        const svgs = studio.working[state];
        const canvases = await Promise.all(svgs.map((svg) => rasterizeSvg(svg, 1)));
        const sheet1x = generateSpritesheet(canvases, 1);
        const sheet2x = generateSpritesheet(canvases, 2);
        files.push({ name: `spritesheets/${textureBase}_${state}_1x.png`, data: await canvasToPngBytes(sheet1x) });
        files.push({ name: `spritesheets/${textureBase}_${state}_2x.png`, data: await canvasToPngBytes(sheet2x) });
        svgs.forEach((svg, index) => {
          files.push({ name: `svg/${textureBase}_${state}_frame_${index}.svg`, data: svg });
        });
        animationsMeta[state] = {
          frames: svgs.map((_, index) => cursor + index),
          loop: Boolean(asset.animations[state].loop)
        };
        cursor += svgs.length;
        allSvgs.push(...svgs);
      }

      const allCanvases = await Promise.all(allSvgs.map((svg) => rasterizeSvg(svg, 1)));
      const combined1x = generateSpritesheet(allCanvases, 1);
      const combined2x = generateSpritesheet(allCanvases, 2);
      files.push({ name: `spritesheets/${textureBase}_all_1x.png`, data: await canvasToPngBytes(combined1x) });
      files.push({ name: `spritesheets/${textureBase}_all_2x.png`, data: await canvasToPngBytes(combined2x) });
      files.push({ name: `png/${textureBase}_1x.png`, data: await canvasToPngBytes(allCanvases[0]) });
      files.push({
        name: `png/${textureBase}_2x.png`,
        data: await canvasToPngBytes(await rasterizeSvg(allSvgs[0], 2))
      });
      files.push({
        name: 'animations.json',
        data: generateAnimationJson({
          texture: `${textureBase}_all_1x.png`,
          frameWidth: asset.width,
          frameHeight: asset.height,
          frameCount: allSvgs.length,
          frameRate: studio.fps,
          animations: animationsMeta
        })
      });
    } else {
      const svg = studio.working.idle[0];
      const canvas1x = await rasterizeSvg(svg, 1);
      const canvas2x = await rasterizeSvg(svg, 2);
      const canvas4x = await rasterizeSvg(svg, 4);
      files.push({ name: `png/${textureBase}_1x.png`, data: await canvasToPngBytes(canvas1x) });
      files.push({ name: `png/${textureBase}_2x.png`, data: await canvasToPngBytes(canvas2x) });
      files.push({ name: `png/${textureBase}_4x.png`, data: await canvasToPngBytes(canvas4x) });
      files.push({ name: `svg/${textureBase}.svg`, data: svg });
      files.push({
        name: 'animations.json',
        data: generateAnimationJson({
          texture: `${textureBase}_1x.png`,
          frameWidth: asset.width,
          frameHeight: asset.height,
          frameCount: 1,
          frameRate: studio.fps,
          animations: { idle: { frames: [0], loop: true } }
        })
      });
    }

    files.push({ name: 'README.txt', data: buildReadme(asset, files.length + 1) });

    const blob = await createZipBundle(files);
    const stamp = timestamp();
    triggerDownload(blob, `pixelforge_${textureBase}_${stamp}.zip`);

    const sizeKb = (blob.size / 1024).toFixed(1);
    setStatus(`资产包已导出 · ${files.length} 个文件 · ${sizeKb} KB · ${asset.name}`);
    toast(`ZIP 资产包已开始下载（${sizeKb} KB）`);
  } finally {
    els.exportBtn.disabled = false;
    els.exportBtn.classList.remove('is-busy');
    els.exportBtn.textContent = label;
  }
}

function buildReadme(asset, fileCount) {
  return `PixelForge AI 像素工坊 · 标准游戏资产包
=================================================
资产名称: ${asset.name}
资产标识: ${asset.id}
像素尺寸: ${asset.width} × ${asset.height}
调色板: Embers Dark Fantasy 16 色
文件总数: ${fileCount}

目录说明
-------------------------------------------------
png/            单帧无损 PNG（1x / 2x / 4x，最近邻采样）
spritesheets/   水平单行动作带（每帧宽 ${asset.width}px，帧间零间隙）
svg/            严格整数网格的矢量像素源文件（<rect> 矩阵）
animations.json 引擎动画元数据（texture / frameWidth / frameHeight /
                frameCount / frameRate / animations）

引擎接入
-------------------------------------------------
Phaser:
  this.load.spritesheet('${asset.id}', 'spritesheets/${asset.id}_all_1x.png',
    { frameWidth: ${asset.width}, frameHeight: ${asset.height} });
  this.anims.create({ key: 'walk', frames: this.anims.generateFrameNumbers('${asset.id}',
    { start: 0, end: 3 }), frameRate: 6, repeat: -1 });

Godot:
  AnimatedSprite2D + SpriteFrames，按 animations.json 的帧区间切分。

Unity:
  Sprite Mode = Multiple，Pixels Per Unit = ${asset.width}，按帧宽切分。

所有资源均在浏览器本地生成，未上传任何服务器。
`;
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

/* ============================== 工具函数 ============================== */

function setStatus(message) {
  els.statusText.textContent = message;
}

function toast(message, type) {
  els.toast.textContent = message;
  els.toast.className = `toast is-visible${type === 'error' ? ' is-error' : ''}`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    els.toast.classList.remove('is-visible');
  }, 2600);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function guard(promise, label) {
  try {
    await promise;
  } catch (error) {
    console.error(`[PixelForge] ${label}失败`, error);
    setStatus(`${label}失败：${error.message}`);
    toast(`${label}失败：${error.message}`, 'error');
  }
}

init().catch((error) => {
  console.error('[PixelForge] 初始化失败', error);
  setStatus(`初始化失败：${error.message}`);
  toast(`初始化失败：${error.message}`, 'error');
});
