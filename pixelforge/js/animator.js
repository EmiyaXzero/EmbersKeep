/**
 * PixelForge 多动作逐帧动效状态机 (animator.js)
 * ---------------------------------------------------------------
 * 职责：
 *  1. 管理 idle / walk / attack / death 多动作状态与帧指针推进。
 *  2. 1~24 FPS 动态调速、循环/单次播放、逐帧步进、洋葱皮索引推算。
 *  3. 在 Canvas 上执行整数倍最近邻渲染、洋葱皮叠影与像素网格标尺。
 *
 * 逻辑层不依赖 DOM，可在 Node 中直接测试；渲染层仅在浏览器调用。
 */

export const MIN_FPS = 1;
export const MAX_FPS = 24;
export const DEFAULT_FPS = 6;
export const ONION_ALPHA = 0.25;

export const ANIMATION_STATES = Object.freeze(['idle', 'walk', 'attack', 'death']);

function clampFps(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_FPS;
  return Math.max(MIN_FPS, Math.min(MAX_FPS, Math.round(numeric)));
}

function normalizeAnimation(config) {
  if (!config || typeof config !== 'object') {
    throw new TypeError('动画配置必须是对象');
  }
  const frameCount = Array.isArray(config.frames)
    ? config.frames.length
    : Number.isInteger(config.frameCount)
      ? config.frameCount
      : 0;
  if (frameCount <= 0) {
    throw new TypeError('动画配置必须包含正整数 frameCount 或非空 frames 数组');
  }
  return {
    frameCount,
    loop: config.loop !== false,
    fps: config.fps === undefined ? null : clampFps(config.fps)
  };
}

export class AnimationPlayer {
  constructor(options = {}) {
    this.frameWidth = options.frameWidth || 32;
    this.frameHeight = options.frameHeight || 32;
    this.fps = clampFps(options.fps === undefined ? DEFAULT_FPS : options.fps);
    this.currentFrame = 0;
    this.isPlaying = false;
    this.onionSkin = Boolean(options.onionSkin);
    this.state = null;
    this.animations = {};
    this._accumulator = 0;
    if (options.animations) this.setAnimations(options.animations);
  }

  /** 批量装载动画配置 */
  setAnimations(animations) {
    const normalized = {};
    for (const [state, config] of Object.entries(animations || {})) {
      normalized[state] = normalizeAnimation(config);
    }
    if (Object.keys(normalized).length === 0) {
      throw new TypeError('animations 不能为空');
    }
    this.animations = normalized;
    const preferred = ['idle', 'walk', 'attack', 'death'].find((state) => normalized[state]);
    this.state = preferred;
    this.currentFrame = 0;
    this._accumulator = 0;
    this.isPlaying = false;
    if (this.animation && this.animation.fps) this.fps = this.animation.fps;
    return this;
  }

  get animation() {
    return this.state ? this.animations[this.state] || null : null;
  }

  get frameCount() {
    return this.animation ? this.animation.frameCount : 0;
  }

  get isFinished() {
    const cfg = this.animation;
    if (!cfg) return true;
    return !cfg.loop && this.currentFrame >= cfg.frameCount - 1;
  }

  get states() {
    return Object.keys(this.animations);
  }

  /** 切换动作状态：帧指针归零，多帧动作自动播放 */
  setAnimation(state) {
    if (!this.animations[state]) {
      throw new Error(`未定义的动画状态: ${state}`);
    }
    this.state = state;
    this.currentFrame = 0;
    this._accumulator = 0;
    if (this.animation.fps) this.fps = this.animation.fps;
    this.isPlaying = this.frameCount > 1;
    return this;
  }

  setFps(fps) {
    this.fps = clampFps(fps);
    this._accumulator = 0;
    return this.fps;
  }

  play() {
    if (this.isFinished && this.currentFrame >= this.frameCount - 1) {
      this.currentFrame = 0;
    }
    this._accumulator = 0;
    this.isPlaying = this.frameCount > 1;
    return this;
  }

  pause() {
    this.isPlaying = false;
    return this;
  }

  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  /**
   * 推进帧指针。
   * @param {number} count 前进帧数，允许为负
   * @returns {number} 实际推进的帧数
   */
  advance(count = 1) {
    const cfg = this.animation;
    if (!cfg || count === 0) return 0;
    const total = cfg.frameCount;
    if (total <= 1) {
      this.currentFrame = 0;
      this.isPlaying = false;
      return 0;
    }
    if (cfg.loop) {
      this.currentFrame = (((this.currentFrame + count) % total) + total) % total;
      return Math.abs(count);
    }
    const target = Math.max(0, Math.min(total - 1, this.currentFrame + count));
    const advanced = Math.abs(target - this.currentFrame);
    this.currentFrame = target;
    if (this.currentFrame >= total - 1 && count > 0) this.isPlaying = false;
    return advanced;
  }

  /**
   * 按时间推进（毫秒）。播放中才会前进。
   * @returns {number} 本次推进的帧数
   */
  step(deltaMs) {
    if (!this.isPlaying) return 0;
    const cfg = this.animation;
    if (!cfg) return 0;
    if (cfg.frameCount <= 1) {
      this.isPlaying = false;
      return 0;
    }
    const delta = Number(deltaMs);
    if (!Number.isFinite(delta) || delta <= 0) return 0;
    const frameDuration = 1000 / this.fps;
    this._accumulator += delta;
    let advanced = 0;
    let guard = 0;
    while (this._accumulator >= frameDuration && guard < 64) {
      this._accumulator -= frameDuration;
      const moved = this.advance(1);
      advanced += moved;
      guard += 1;
      if (!this.isPlaying) {
        this._accumulator = 0;
        break;
      }
      if (moved === 0) break;
    }
    return advanced;
  }

  nextFrame() {
    this.pause();
    return this.advance(1);
  }

  prevFrame() {
    this.pause();
    return this.advance(-1);
  }

  seek(frameIndex) {
    const total = this.frameCount;
    if (total === 0) return this.currentFrame;
    const value = Math.max(0, Math.min(total - 1, Math.round(Number(frameIndex) || 0)));
    this.currentFrame = value;
    this._accumulator = 0;
    return this.currentFrame;
  }

  toggleOnionSkin(force) {
    this.onionSkin = force === undefined ? !this.onionSkin : Boolean(force);
    return this.onionSkin;
  }

  /** 推算洋葱皮前后帧索引（循环动作首尾相接，单次动作端点返回 null） */
  getOnionFrames() {
    const cfg = this.animation;
    if (!cfg || cfg.frameCount <= 1) return { prev: null, next: null };
    const total = cfg.frameCount;
    if (cfg.loop) {
      return {
        prev: (this.currentFrame - 1 + total) % total,
        next: (this.currentFrame + 1) % total
      };
    }
    return {
      prev: this.currentFrame > 0 ? this.currentFrame - 1 : null,
      next: this.currentFrame < total - 1 ? this.currentFrame + 1 : null
    };
  }

  /**
   * 渲染当前帧（含洋葱皮与像素网格）。
   * @param {CanvasRenderingContext2D} ctx 目标上下文
   * @param {number} zoom 整数倍放大（2x / 4x / 6x / 8x）
   * @param {boolean} showGrid 是否绘制像素网格标尺
   * @param {object} options { getFrame(state, index), width, height,
   *                           onionSkin, onionAlpha, background, gridColor }
   */
  renderCurrentFrame(ctx, zoom = 1, showGrid = false, options = {}) {
    if (!ctx) throw new TypeError('renderCurrentFrame 需要有效的 Canvas 上下文');
    const z = Math.max(1, Math.round(Number(zoom) || 1));
    const width = options.width || this.frameWidth;
    const height = options.height || this.frameHeight;
    const canvasWidth = width * z;
    const canvasHeight = height * z;
    const getFrame = options.getFrame || (() => null);
    const onionEnabled = options.onionSkin === undefined ? this.onionSkin : Boolean(options.onionSkin);
    const onionAlpha = options.onionAlpha === undefined ? ONION_ALPHA : Number(options.onionAlpha);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (options.background) {
      ctx.fillStyle = options.background;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    const drawFrame = (index, alpha) => {
      if (index === null || index === undefined) return false;
      const image = getFrame(this.state, index);
      if (!image) return false;
      ctx.globalAlpha = alpha;
      ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);
      ctx.globalAlpha = 1;
      return true;
    };

    if (onionEnabled) {
      const { prev, next } = this.getOnionFrames();
      drawFrame(prev, onionAlpha);
      if (next !== prev) drawFrame(next, onionAlpha);
    }
    drawFrame(this.currentFrame, 1);

    if (showGrid) {
      drawPixelGrid(ctx, canvasWidth, canvasHeight, z, options.gridColor);
    }

    ctx.imageSmoothingEnabled = false;
    ctx.restore();
  }
}

/** 像素网格标尺：每 1 像素细线，每 8 像素加亮，形成专业像素工作台观感 */
export function drawPixelGrid(ctx, width, height, zoom, gridColor) {
  const z = Math.max(1, Math.round(zoom));
  ctx.save();
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += z) {
    const major = Math.round(x / z) % 8 === 0;
    ctx.strokeStyle = gridColor || (major ? 'rgba(200,155,60,0.22)' : 'rgba(255,255,255,0.06)');
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += z) {
    const major = Math.round(y / z) % 8 === 0;
    ctx.strokeStyle = gridColor || (major ? 'rgba(200,155,60,0.22)' : 'rgba(255,255,255,0.06)');
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}
