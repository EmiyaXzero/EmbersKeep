/**
 * PixelForge 矢量像素矩阵引擎 (matrix.js)
 * ---------------------------------------------------------------
 * 职责：
 *  1. 严格校验 SVG 是否符合硬边像素规范（crispEdges / 整数网格 / 仅 rect）。
 *  2. 解析 <rect> 像素块，输出可复用的几何数据与像素矩阵。
 *  3. 通过 Canvas2D 双缓冲实现 imageSmoothingEnabled = false 的最近邻无损放大。
 *
 * 校验器为纯正则实现，无 DOM 依赖，可在 Node 中直接测试；
 * 栅格化函数仅在浏览器环境调用 Canvas API。
 */
import { isPaletteColor } from './palette.js';

const ELEMENT_RE = /<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const ATTRIBUTE_RE = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
const HEX_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

const ALLOWED_ELEMENTS = new Set(['svg', 'rect', 'title', 'desc']);

const FORBIDDEN_ELEMENTS = {
  path: '仅支持 <rect> 像素块，请用整数坐标的矩形重绘 <path> 曲线',
  circle: '圆形会产生抗锯齿软边，请改用若干 <rect> 方格近似',
  ellipse: '椭圆会产生抗锯齿软边，请改用若干 <rect> 方格近似',
  polygon: '多边形会产生非整数边缘，请改用整数网格 <rect>',
  polyline: '折线不产生像素块，请改用整数坐标 <rect>',
  line: '直线会产生亚像素边缘，请改用整数坐标 <rect>',
  text: '文本渲染依赖系统字体，不属于像素矩阵，请移除',
  image: '不支持栅格图片，请改用整数网格 <rect>',
  use: '不支持 <use> 引用，请展开为顶层 <rect>',
  g: '请扁平化 <g> 分组，直接以顶层 <rect> 堆叠绘制',
  defs: '不支持 <defs> 定义，请展开为顶层 <rect>',
  style: '不支持内联 <style>，请把 fill 直接写在 <rect> 上',
  filter: '不支持滤镜，滤镜会产生半透明软边',
  linearGradient: '不支持渐变，渐变会产生非离散色阶，请使用纯色 <rect>',
  radialGradient: '不支持渐变，渐变会产生非离散色阶，请使用纯色 <rect>',
  clipPath: '不支持裁剪路径，请直接按整数网格绘制',
  mask: '不支持遮罩，遮罩会产生半透明边缘'
};

/** 支持的网格尺寸（SPEC: 32 / 48 / 64 等 8 的整数倍） */
const STANDARD_GRID_SIZES = new Set([16, 32, 48, 64, 96, 128]);

function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i += 1) {
    if (text[i] === '\n') line += 1;
  }
  return line;
}

function stripComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, (match) => match.replace(/[^\n]/g, ' '));
}

function parseAttributes(raw) {
  const attrs = {};
  let match;
  ATTRIBUTE_RE.lastIndex = 0;
  while ((match = ATTRIBUTE_RE.exec(raw)) !== null) {
    attrs[match[1].toLowerCase()] = match[3] !== undefined ? match[3] : match[4];
  }
  return attrs;
}

function isInteger(value) {
  if (value === undefined || value === null || String(value).trim() === '') return false;
  return Number.isInteger(Number(value));
}

/** 解析 viewBox，返回 { width, height, minX, minY } 或 null */
export function parseViewBox(svgText) {
  const match = /<svg\b[^>]*\bviewBox\s*=\s*("([^"]*)"|'([^']*)')/i.exec(svgText);
  if (!match) return null;
  const value = match[2] !== undefined ? match[2] : match[3];
  const parts = value.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
}

/** 提取所有 <rect> 几何信息（不做合法性判断） */
export function parseRects(svgText) {
  if (typeof svgText !== 'string') throw new TypeError('svgText 必须是字符串');
  const clean = stripComments(svgText);
  const rects = [];
  let match;
  ELEMENT_RE.lastIndex = 0;
  while ((match = ELEMENT_RE.exec(clean)) !== null) {
    const tag = match[1].toLowerCase();
    if (tag !== 'rect') continue;
    const attrs = parseAttributes(match[2] || '');
    rects.push({
      x: Number(attrs.x || 0),
      y: Number(attrs.y || 0),
      width: Number(attrs.width),
      height: Number(attrs.height),
      fill: attrs.fill || '',
      raw: match[0],
      index: match.index,
      line: lineAt(clean, match.index)
    });
  }
  return rects;
}

/**
 * 校验 SVG 是否符合 PixelForge 硬边像素规范。
 * @returns {{valid:boolean, errors:string[], warnings:string[],
 *           width:number, height:number, rects:Array, stats:object}}
 */
export function validateSvg(svgText) {
  const errors = [];
  const warnings = [];
  const rects = [];

  if (typeof svgText !== 'string' || svgText.trim() === '') {
    return {
      valid: false,
      errors: ['SVG 内容为空，请上传符合像素规范的 <svg> 文本'],
      warnings: [],
      width: 0,
      height: 0,
      rects,
      stats: { rectCount: 0, uniqueColors: 0, crispEdges: false }
    };
  }

  const clean = stripComments(svgText);
  const elements = [];
  let match;
  ELEMENT_RE.lastIndex = 0;
  while ((match = ELEMENT_RE.exec(clean)) !== null) {
    elements.push({
      tag: match[1].toLowerCase(),
      attrs: parseAttributes(match[2] || ''),
      raw: match[0],
      index: match.index,
      line: lineAt(clean, match.index)
    });
  }

  if (elements.length === 0) {
    errors.push('未找到任何 SVG 元素，请提供合法的 <svg> 根节点');
  }

  const root = elements.find((el) => el.tag === 'svg');
  if (!root) {
    errors.push('缺少 <svg> 根节点');
  } else if (elements[0] !== root) {
    errors.push(`第 ${elements[0].line} 行: <${elements[0].tag}> 出现在 <svg> 根节点之前，请调整结构`);
  }

  if (root) {
    const rendering = root.attrs['shape-rendering'];
    if (rendering !== 'crispEdges') {
      errors.push(
        `第 ${root.line} 行: <svg> 根节点必须声明 shape-rendering="crispEdges"（当前为 ${rendering || '未声明'}），否则放大后边缘会发虚`
      );
    }
  }

  const viewBox = parseViewBox(svgText);
  if (!viewBox) {
    errors.push('缺少合法的 viewBox 属性，请声明如 viewBox="0 0 32 32" 的整数网格');
  }

  let width = viewBox ? viewBox.width : 0;
  let height = viewBox ? viewBox.height : 0;

  if (viewBox) {
    if (viewBox.minX !== 0 || viewBox.minY !== 0) {
      warnings.push(`viewBox 原点为 (${viewBox.minX}, ${viewBox.minY})，建议归一化为 (0, 0)`);
    }
    for (const [label, value] of [['宽度', viewBox.width], ['高度', viewBox.height]]) {
      if (!Number.isInteger(value)) {
        errors.push(`viewBox ${label} ${value} 不是整数，像素网格必须为整数`);
      } else if (value < 8) {
        errors.push(`viewBox ${label} ${value} 过小，至少需要 8 像素`);
      } else if (value % 8 !== 0) {
        errors.push(`viewBox ${label} ${value} 不是 8 的整数倍，请调整为 32 / 48 / 64 等标准网格`);
      } else if (!STANDARD_GRID_SIZES.has(value)) {
        warnings.push(`viewBox ${label} ${value} 非标准尺寸，推荐使用 32 / 48 / 64`);
      }
    }
  }

  const offPalette = new Map();

  for (const element of elements) {
    const { tag, attrs, line } = element;

    if (tag === 'svg' || tag === 'title' || tag === 'desc') continue;

    if (tag === 'rect') {
      rects.push({
        x: Number(attrs.x || 0),
        y: Number(attrs.y || 0),
        width: Number(attrs.width),
        height: Number(attrs.height),
        fill: attrs.fill || '',
        line,
        index: element.index
      });

      if (attrs.transform) {
        errors.push(`第 ${line} 行: <rect> 不允许使用 transform，请直接把坐标改为整数`);
      }

      for (const key of ['x', 'y', 'width', 'height']) {
        const raw = attrs[key];
        if (raw === undefined) {
          if (key === 'width' || key === 'height') {
            errors.push(`第 ${line} 行: <rect> 缺少 ${key} 属性`);
          }
          continue;
        }
        if (!isInteger(raw)) {
          errors.push(
            `第 ${line} 行: <rect> 的 ${key}="${raw}" 不是整数，请取整为 ${Math.round(Number(raw) || 0)}`
          );
        } else if (Number(raw) < 0) {
          errors.push(`第 ${line} 行: <rect> 的 ${key} 不能为负数（当前 ${raw}）`);
        }
      }

      const x = Number(attrs.x || 0);
      const y = Number(attrs.y || 0);
      const w = Number(attrs.width);
      const h = Number(attrs.height);
      if (Number.isFinite(w) && Number.isFinite(h) && (w === 0 || h === 0)) {
        warnings.push(`第 ${line} 行: <rect> 尺寸为 0，不会绘制任何像素`);
      }
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        if (viewBox && (x + w > viewBox.width || y + h > viewBox.height)) {
          warnings.push(
            `第 ${line} 行: <rect> 超出 viewBox 边界（${x},${y} ${w}×${h}），超出部分会被裁切`
          );
        }
      }

      if (!attrs.fill) {
        warnings.push(`第 ${line} 行: <rect> 未声明 fill，将渲染为透明像素`);
      } else if (/^none$/i.test(attrs.fill)) {
        warnings.push(`第 ${line} 行: <rect> fill="none" 不会产生可见像素`);
      } else if (HEX_RE.test(attrs.fill)) {
        if (!isPaletteColor(attrs.fill) && !offPalette.has(attrs.fill.toLowerCase())) {
          offPalette.set(attrs.fill.toLowerCase(), line);
        }
      } else if (!/^url\(/i.test(attrs.fill)) {
        warnings.push(`第 ${line} 行: fill="${attrs.fill}" 不是十六进制色值，可能破坏调色板约束`);
      } else {
        warnings.push(`第 ${line} 行: fill 使用了渐变色引用，无法吸附到 16 色调色板`);
      }
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(FORBIDDEN_ELEMENTS, tag) || !ALLOWED_ELEMENTS.has(tag)) {
      const hint = FORBIDDEN_ELEMENTS[tag] || '像素矩阵仅允许 <rect> 图元，请移除非标准元素';
      errors.push(`第 ${line} 行: 不允许的图元 <${tag}>，${hint}`);
    }
  }

  if (rects.length === 0 && errors.length === 0) {
    errors.push('未找到任何 <rect> 像素块，无法构成像素矩阵');
  }

  if (offPalette.size > 0) {
    const preview = [...offPalette.entries()]
      .slice(0, 6)
      .map(([hex, line]) => `${hex}（第 ${line} 行）`)
      .join('、');
    warnings.push(`发现 ${offPalette.size} 种非标准调色板颜色：${preview}，可使用「16 色吸附」一键量化`);
  }

  const uniqueColors = new Set(rects.map((r) => (r.fill || '').toLowerCase()).filter(Boolean));
  const crispEdges = Boolean(root && root.attrs['shape-rendering'] === 'crispEdges');
  const gridAligned =
    rects.length > 0 &&
    rects.every(
      (r) =>
        Number.isInteger(r.x) &&
        Number.isInteger(r.y) &&
        Number.isInteger(r.width) &&
        Number.isInteger(r.height)
    );

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    width,
    height,
    rects,
    stats: {
      rectCount: rects.length,
      uniqueColors: uniqueColors.size,
      crispEdges,
      gridAligned,
      standardGrid: Boolean(viewBox && STANDARD_GRID_SIZES.has(viewBox.width)),
      offPaletteColors: offPalette.size
    }
  };
}

/**
 * 将 SVG 解析为逐像素颜色矩阵（后绘制的 rect 覆盖先绘制的）。
 * @returns {{ width:number, height:number, cells:string[][] }}
 */
export function toPixelGrid(svgText) {
  const result = validateSvg(svgText);
  if (!result.valid) {
    throw new Error(`SVG 校验未通过: ${result.errors[0]}`);
  }
  const cells = Array.from({ length: result.height }, () => new Array(result.width).fill(''));
  for (const rect of result.rects) {
    if (!rect.fill || /^none$/i.test(rect.fill)) continue;
    const x0 = Math.max(0, Math.round(rect.x));
    const y0 = Math.max(0, Math.round(rect.y));
    const x1 = Math.min(result.width, Math.round(rect.x + rect.width));
    const y1 = Math.min(result.height, Math.round(rect.y + rect.height));
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        cells[y][x] = rect.fill.toLowerCase();
      }
    }
  }
  return { width: result.width, height: result.height, cells };
}

function resolveCanvasFactory(explicit) {
  if (typeof explicit === 'function') return explicit;
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    return (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    };
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    return (width, height) => new OffscreenCanvas(width, height);
  }
  throw new Error('当前环境不支持 Canvas，请在浏览器中调用 rasterizeSvg');
}

/** 计算栅格化后的像素尺寸 */
export function computeRasterSize(svgText, scale = 1) {
  const result = validateSvg(svgText);
  if (!result.valid) throw new Error(`SVG 校验未通过: ${result.errors[0]}`);
  assertScale(scale);
  return { width: result.width * scale, height: result.height * scale, scale };
}

function assertScale(scale) {
  if (!Number.isInteger(scale) || scale < 1) {
    throw new TypeError(`scale 必须是 >= 1 的整数，当前为 ${scale}`);
  }
}

/**
 * 最近邻无损栅格化：先按 1x 精确绘制原始像素块，
 * 再以 imageSmoothingEnabled = false 放大到目标倍率。
 */
export async function rasterizeSvg(svgText, scale = 1, options = {}) {
  assertScale(scale);
  const result = validateSvg(svgText);
  if (!result.valid) {
    throw new Error(`SVG 校验未通过: ${result.errors.join('；')}`);
  }
  const createCanvas = resolveCanvasFactory(options.createCanvas);
  const { width, height } = result;

  const base = createCanvas(width, height);
  const baseCtx = base.getContext('2d');
  baseCtx.clearRect(0, 0, width, height);
  for (const rect of result.rects) {
    if (!rect.fill || /^none$/i.test(rect.fill) || /^url\(/i.test(rect.fill)) continue;
    baseCtx.fillStyle = rect.fill;
    baseCtx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  if (scale === 1) {
    baseCtx.imageSmoothingEnabled = false;
    return base;
  }

  const output = createCanvas(width * scale, height * scale);
  const ctx = output.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, output.width, output.height);
  }
  ctx.drawImage(base, 0, 0, output.width, output.height);
  ctx.imageSmoothingEnabled = false;
  return output;
}

/** SVG 文本转 data URL（无外链、可离线） */
export function svgToDataUrl(svgText) {
  if (typeof svgText !== 'string' || svgText.trim() === '') {
    throw new TypeError('svgText 不能为空');
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText.trim())}`;
}

/** 合规评分：crispEdges 40 + 网格对齐 30 + 调色板覆盖 30 */
export function complianceScore(validation, paletteCoverage = 0) {
  let score = 0;
  if (validation.stats.crispEdges) score += 40;
  if (validation.stats.gridAligned) score += 30;
  score += Math.max(0, Math.min(100, paletteCoverage)) * 0.3;
  return Math.round(score * 10) / 10;
}
