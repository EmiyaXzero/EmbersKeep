/**
 * PixelForge 调色板引擎 (palette.js)
 * ---------------------------------------------------------------
 * Embers Dark Fantasy 16 色标准调色板 + RGB 欧几里得距离吸附 +
 * SVG 色彩热替换 + 像素面积分布统计 + 整图量化 / 家族换肤。
 *
 * 该模块为纯函数模块，不依赖任何 DOM API，可直接在 Node 中运行。
 */

/** 四大色系 */
export const PALETTE_FAMILIES = Object.freeze({
  shadow: Object.freeze({ id: 'shadow', name: '暗部', code: '影', description: '极夜黑 → 铁影的四阶无彩暗部' }),
  iron: Object.freeze({ id: 'iron', name: '铁与石', code: '铁', description: '冷铁 → 冷银的三阶金属灰' }),
  fire: Object.freeze({ id: 'fire', name: '火光', code: '火', description: '凝固血褐 → 炽火金的五阶余烬火色' }),
  arcane: Object.freeze({ id: 'arcane', name: '奥术', code: '奥', description: '渊蓝 → 辉光亮蓝的四阶雷霜奥术' })
});

/**
 * Embers Dark Fantasy 标准 16 色。
 * 顺序即 UI 展示顺序：暗部 → 铁与石 → 火光 → 奥术。
 */
export const EMBERS_PALETTE = Object.freeze([
  Object.freeze({ hex: '#121016', name: '极夜黑', family: 'shadow' }),
  Object.freeze({ hex: '#1e1b24', name: '冷炭黑', family: 'shadow' }),
  Object.freeze({ hex: '#2c2636', name: '暗石灰', family: 'shadow' }),
  Object.freeze({ hex: '#41394d', name: '铁影', family: 'shadow' }),
  Object.freeze({ hex: '#5c5266', name: '冷铁', family: 'iron' }),
  Object.freeze({ hex: '#7c728a', name: '铸铁灰', family: 'iron' }),
  Object.freeze({ hex: '#a69cb3', name: '冷银', family: 'iron' }),
  Object.freeze({ hex: '#5e1b1b', name: '凝固血褐', family: 'fire' }),
  Object.freeze({ hex: '#a12b2b', name: '暗红', family: 'fire' }),
  Object.freeze({ hex: '#d64e2a', name: '熔岩红', family: 'fire' }),
  Object.freeze({ hex: '#f28929', name: '余烬橙', family: 'fire' }),
  Object.freeze({ hex: '#fad65a', name: '炽火金', family: 'fire' }),
  Object.freeze({ hex: '#1d3b5c', name: '渊蓝', family: 'arcane' }),
  Object.freeze({ hex: '#2b6ba6', name: '雷蓝', family: 'arcane' }),
  Object.freeze({ hex: '#55a4db', name: '冰霜蓝', family: 'arcane' }),
  Object.freeze({ hex: '#bee5fa', name: '辉光亮蓝', family: 'arcane' })
]);

/** 16 色 HEX 列表（小写） */
export const EMBERS_PALETTE_HEXES = Object.freeze(EMBERS_PALETTE.map((entry) => entry.hex));

const PALETTE_INDEX = new Map(EMBERS_PALETTE.map((entry) => [entry.hex, entry]));

const HEX_TOKEN_RE = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;

/** 将 #RGB / #RRGGBB 归一化为小写 #rrggbb，非法输入抛出 TypeError */
export function normalizeHex(hex) {
  if (typeof hex !== 'string') {
    throw new TypeError(`非法颜色值: ${String(hex)}（期望 #RGB 或 #RRGGBB 字符串）`);
  }
  const value = hex.trim();
  const short = /^#([0-9a-fA-F]{3})$/.exec(value);
  if (short) {
    const [r, g, b] = short[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const full = /^#([0-9a-fA-F]{6})$/.exec(value);
  if (full) return `#${full[1]}`.toLowerCase();
  throw new TypeError(`非法颜色值: ${hex}（期望 #RGB 或 #RRGGBB）`);
}

export function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16)
  };
}

export function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
}

/** 相对亮度（用于色系内部明度梯度排序） */
export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** RGB 欧几里得距离 */
export function colorDistance(hexA, hexB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/** 判断是否为 16 色标准色（精确匹配） */
export function isPaletteColor(hex) {
  try {
    return PALETTE_INDEX.has(normalizeHex(hex));
  } catch {
    return false;
  }
}

/** 返回某色系按明度从暗到亮排序的色阶 */
export function familyRamp(familyId) {
  if (!PALETTE_FAMILIES[familyId]) {
    throw new TypeError(`未知色系: ${familyId}`);
  }
  return EMBERS_PALETTE.filter((entry) => entry.family === familyId).sort(
    (a, b) => luminance(a.hex) - luminance(b.hex)
  );
}

/** 吸附结果详情：命中色、名称、色距、是否精确命中 */
export function snapColorInfo(hex) {
  const normalized = normalizeHex(hex);
  const target = hexToRgb(normalized);
  let best = EMBERS_PALETTE[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const entry of EMBERS_PALETTE) {
    const candidate = hexToRgb(entry.hex);
    const distance = (target.r - candidate.r) ** 2 + (target.g - candidate.g) ** 2 + (target.b - candidate.b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = entry;
    }
  }
  return {
    hex: best.hex,
    name: best.name,
    family: best.family,
    distance: Math.sqrt(bestDistance),
    exact: best.hex === normalized.toLowerCase()
  };
}

/**
 * 将任意十六进制色值吸附到最接近的标准色。
 * 使用 RGB 空间的欧几里得距离，距离相同则取调色板中靠前者。
 */
export function snapColor(hex) {
  return snapColorInfo(hex).hex;
}

/**
 * 调色板实时热替换：把 SVG 文本中所有 oldHex 替换为 newHex。
 * 支持 #RGB / #RRGGBB，大小写不敏感，未命中时原样返回。
 */
export function replaceColor(svgText, oldHex, newHex) {
  if (typeof svgText !== 'string') throw new TypeError('svgText 必须是字符串');
  const from = normalizeHex(oldHex);
  const to = normalizeHex(newHex);
  return svgText.replace(HEX_TOKEN_RE, (match, token) => {
    const normalized = normalizeHex(`#${token}`);
    return normalized === from ? to : match;
  });
}

/** 按颜色聚合 SVG 中 <rect> 的像素面积 */
export function collectColorStats(svgText) {
  if (typeof svgText !== 'string') throw new TypeError('svgText 必须是字符串');
  const rectRe = /<rect\b([^>]*)>/gi;
  const attrRe = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  const stats = new Map();
  let totalPixels = 0;
  let match;
  while ((match = rectRe.exec(svgText)) !== null) {
    const attrs = {};
    const attrText = match[1];
    let attrMatch;
    attrRe.lastIndex = 0;
    while ((attrMatch = attrRe.exec(attrText)) !== null) {
      attrs[attrMatch[1].toLowerCase()] = attrMatch[3] !== undefined ? attrMatch[3] : attrMatch[4];
    }
    if (!attrs.fill || /^none$/i.test(attrs.fill) || /^url\(/i.test(attrs.fill)) continue;
    let fill;
    try {
      fill = normalizeHex(attrs.fill);
    } catch {
      continue;
    }
    const width = Number(attrs.width);
    const height = Number(attrs.height);
    if (!Number.isFinite(width) || !Number.isFinite(height)) continue;
    const area = Math.max(0, width) * Math.max(0, height);
    totalPixels += area;
    stats.set(fill, (stats.get(fill) || 0) + area);
  }
  return { stats, totalPixels };
}

/**
 * 统计 SVG 中各颜色像素占比。
 * @returns {{ totalPixels:number, uniqueColors:number, paletteCoverage:number,
 *             stats: Array<{color:string,count:number,percent:number,name:string,
 *                           family:string,inPalette:boolean,snapped:string}> }}
 */
export function analyzePalette(svgText) {
  const { stats, totalPixels } = collectColorStats(svgText);
  const entries = [...stats.entries()].sort((a, b) => b[1] - a[1]);
  let paletteArea = 0;
  const list = entries.map(([color, count]) => {
    const info = snapColorInfo(color);
    if (info.exact) paletteArea += count;
    return {
      color,
      count,
      percent: totalPixels > 0 ? Math.round((count / totalPixels) * 10000) / 100 : 0,
      name: info.name,
      family: info.family,
      inPalette: info.exact,
      snapped: info.hex
    };
  });
  return {
    totalPixels,
    uniqueColors: list.length,
    paletteCoverage: totalPixels > 0 ? Math.round((paletteArea / totalPixels) * 10000) / 100 : 0,
    stats: list
  };
}

/** SPEC 中的命名别名 */
export function getPaletteStats(svgText) {
  return analyzePalette(svgText);
}

/** 整图 16 色量化：把所有颜色吸附到最近标准色（相同输入产生相同输出） */
export function quantizeSvg(svgText) {
  if (typeof svgText !== 'string') throw new TypeError('svgText 必须是字符串');
  const cache = new Map();
  return svgText.replace(HEX_TOKEN_RE, (match, token) => {
    const normalized = normalizeHex(`#${token}`);
    if (!cache.has(normalized)) cache.set(normalized, snapColor(normalized));
    return cache.get(normalized);
  });
}

/** 参与换肤的“彩色层”色系；暗部与铁石作为结构层保留，保证换肤后轮廓依旧可读 */
const ACCENT_FAMILIES = new Set(['fire', 'arcane']);

/**
 * 色系换肤：把彩色层（火光 / 奥术）按相对明度映射到目标色系的同名色阶，
 * 暗部与铁石结构色保持不变；已属于目标色系的颜色原样保留。
 */
export function retintSvg(svgText, familyId, options = {}) {
  if (typeof svgText !== 'string') throw new TypeError('svgText 必须是字符串');
  const targetRamp = familyRamp(familyId);
  const preserveNeutrals = options.preserveNeutrals !== false;
  const cache = new Map();
  return svgText.replace(HEX_TOKEN_RE, (match, token) => {
    const normalized = normalizeHex(`#${token}`);
    if (cache.has(normalized)) return cache.get(normalized);
    const info = snapColorInfo(normalized);
    const isNeutral = info.family === 'shadow' || info.family === 'iron';
    let output = match;
    if (info.family !== familyId && !(preserveNeutrals && isNeutral) && ACCENT_FAMILIES.has(info.family)) {
      const sourceRamp = familyRamp(info.family);
      const rank = sourceRamp.findIndex((entry) => entry.hex === info.hex);
      const ratio = sourceRamp.length <= 1 ? 0 : rank / (sourceRamp.length - 1);
      const targetIndex = Math.round(ratio * (targetRamp.length - 1));
      output = targetRamp[targetIndex].hex;
    }
    cache.set(normalized, output);
    return output;
  });
}

/** 统计 SVG 中所有颜色的色系归属面积（用于换肤前的色相诊断） */
export function analyzeFamilies(svgText) {
  const { stats, totalPixels } = collectColorStats(svgText);
  const totals = { shadow: 0, iron: 0, fire: 0, arcane: 0 };
  for (const [color, count] of stats.entries()) {
    totals[snapColorInfo(color).family] += count;
  }
  return Object.fromEntries(
    Object.entries(totals).map(([family, count]) => [
      family,
      totalPixels > 0 ? Math.round((count / totalPixels) * 10000) / 100 : 0
    ])
  );
}

/** 查找标准色元数据（非标准色返回 null） */
export function getPaletteEntry(hex) {
  try {
    return PALETTE_INDEX.get(normalizeHex(hex)) || null;
  } catch {
    return null;
  }
}
