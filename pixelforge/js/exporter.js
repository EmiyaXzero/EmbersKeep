/**
 * PixelForge 工业化导出流水线 (exporter.js)
 * ---------------------------------------------------------------
 * 职责：
 *  1. 多帧水平拼接 Spritesheet（零间隙、零错位、近邻采样）。
 *  2. 生成符合 Phaser / Godot / Unity 接入习惯的 animations.json。
 *  3. 纯原生 PKZip 写入器，离线环境一键打包 PNG / SVG / JSON 为 .zip Blob。
 *  4. 浏览器端触发下载。
 *
 * ZIP 写入器与 CRC32 为纯计算，可在 Node 中测试；Canvas 相关函数可注入工厂。
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/** 标准 CRC32 校验 */
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toBytes(data) {
  if (typeof data === 'string') return new TextEncoder().encode(data);
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  if (Array.isArray(data)) return Uint8Array.from(data);
  throw new TypeError('ZIP 文件内容必须是字符串、Uint8Array、ArrayBuffer 或字节数组');
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const time = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() / 2) & 0x1f);
  const dateBits = (((year - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0x0f) << 5) | (date.getDate() & 0x1f);
  return { time: time & 0xffff, date: dateBits & 0xffff };
}

export const ZIP_LOCAL_SIGNATURE = 0x04034b50;
export const ZIP_CENTRAL_SIGNATURE = 0x02014b50;
export const ZIP_END_SIGNATURE = 0x06054b50;

/**
 * 纯前端 PKZip 打包（STORE 无压缩模式，零外部依赖）。
 * @param {Array<{name:string, data:Uint8Array|string}>} files
 * @param {{date?:Date}} options
 * @returns {Uint8Array}
 */
export function buildZipBytes(files, options = {}) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('ZIP 打包至少需要一个文件');
  }
  if (files.length > 0xffff) {
    throw new Error('ZIP 文件数量超出 65535 上限');
  }
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(options.date instanceof Date ? options.date : new Date());
  const entries = files.map((file) => {
    if (!file || typeof file.name !== 'string' || file.name.trim() === '') {
      throw new TypeError('每个 ZIP 文件必须包含非空 name');
    }
    const nameBytes = encoder.encode(file.name.replace(/\\/g, '/'));
    if (nameBytes.length > 0xffff) throw new Error(`文件名过长: ${file.name}`);
    const dataBytes = toBytes(file.data);
    return {
      nameBytes,
      dataBytes,
      crc: crc32(dataBytes),
      offset: 0
    };
  });

  const localSize = entries.reduce((sum, entry) => sum + 30 + entry.nameBytes.length + entry.dataBytes.length, 0);
  const centralSize = entries.reduce((sum, entry) => sum + 46 + entry.nameBytes.length, 0);
  const total = localSize + centralSize + 22;
  const buffer = new ArrayBuffer(total);
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  let offset = 0;
  for (const entry of entries) {
    entry.offset = offset;
    view.setUint32(offset, ZIP_LOCAL_SIGNATURE, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 0x0800, true); // UTF-8 文件名
    view.setUint16(offset + 8, 0, true); // STORE
    view.setUint16(offset + 10, time, true);
    view.setUint16(offset + 12, date, true);
    view.setUint32(offset + 14, entry.crc, true);
    view.setUint32(offset + 18, entry.dataBytes.length, true);
    view.setUint32(offset + 22, entry.dataBytes.length, true);
    view.setUint16(offset + 26, entry.nameBytes.length, true);
    view.setUint16(offset + 28, 0, true);
    offset += 30;
    bytes.set(entry.nameBytes, offset);
    offset += entry.nameBytes.length;
    bytes.set(entry.dataBytes, offset);
    offset += entry.dataBytes.length;
  }

  const centralOffset = offset;
  for (const entry of entries) {
    view.setUint32(offset, ZIP_CENTRAL_SIGNATURE, true);
    view.setUint16(offset + 4, 20, true); // version made by
    view.setUint16(offset + 6, 20, true); // version needed
    view.setUint16(offset + 8, 0x0800, true);
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, time, true);
    view.setUint16(offset + 14, date, true);
    view.setUint32(offset + 16, entry.crc, true);
    view.setUint32(offset + 20, entry.dataBytes.length, true);
    view.setUint32(offset + 24, entry.dataBytes.length, true);
    view.setUint16(offset + 28, entry.nameBytes.length, true);
    view.setUint16(offset + 30, 0, true);
    view.setUint16(offset + 32, 0, true);
    view.setUint16(offset + 34, 0, true);
    view.setUint16(offset + 36, 0, true);
    view.setUint32(offset + 38, 0, true);
    view.setUint32(offset + 42, entry.offset, true);
    offset += 46;
    bytes.set(entry.nameBytes, offset);
    offset += entry.nameBytes.length;
  }

  view.setUint32(offset, ZIP_END_SIGNATURE, true);
  view.setUint16(offset + 4, 0, true);
  view.setUint16(offset + 6, 0, true);
  view.setUint16(offset + 8, entries.length, true);
  view.setUint16(offset + 10, entries.length, true);
  view.setUint32(offset + 12, offset - centralOffset, true); // 中央目录大小
  view.setUint32(offset + 16, centralOffset, true);
  view.setUint16(offset + 20, 0, true);
  offset += 22;

  if (offset !== total) {
    throw new Error(`ZIP 字节长度计算异常: ${offset} != ${total}`);
  }
  return bytes;
}

/** 生成 ZIP Blob（离线秒级，无 CDN 依赖） */
export async function createZipBundle(files, options = {}) {
  const bytes = buildZipBytes(files, options);
  return new Blob([bytes], { type: 'application/zip' });
}

/** 计算 Spritesheet 尺寸：宽 = 帧数 × 帧宽 × 倍率，高 = 帧高 × 倍率 */
export function computeSheetSize(frameWidth, frameHeight, frameCount, scale = 1) {
  if (!Number.isInteger(frameCount) || frameCount <= 0) {
    throw new TypeError('frameCount 必须是正整数');
  }
  if (!Number.isInteger(scale) || scale < 1) {
    throw new TypeError('scale 必须是 >= 1 的整数');
  }
  return { width: frameWidth * frameCount * scale, height: frameHeight * scale, scale };
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
  throw new Error('当前环境不支持 Canvas，请在浏览器中生成 Spritesheet');
}

/**
 * 水平拼接单行动作带 Spritesheet（帧间零间隙、零错位）。
 * @param {Array<{width:number,height:number}>} frames 1x 帧画布
 * @param {number} scale 输出倍率
 * @param {{createCanvas?:Function}} options
 */
export function generateSpritesheet(frames, scale = 1, options = {}) {
  if (!Array.isArray(frames) || frames.length === 0) {
    throw new Error('至少需要一帧图像才能生成 Spritesheet');
  }
  if (!Number.isInteger(scale) || scale < 1) {
    throw new TypeError('scale 必须是 >= 1 的整数');
  }
  const frameWidth = frames[0].width;
  const frameHeight = frames[0].height;
  if (!frameWidth || !frameHeight) {
    throw new TypeError('帧图像必须包含有效的 width / height');
  }
  frames.forEach((frame, index) => {
    if (frame.width !== frameWidth || frame.height !== frameHeight) {
      throw new Error(`第 ${index} 帧尺寸 ${frame.width}×${frame.height} 与首帧 ${frameWidth}×${frameHeight} 不一致`);
    }
  });

  const size = computeSheetSize(frameWidth, frameHeight, frames.length, scale);
  const createCanvas = resolveCanvasFactory(options.createCanvas);
  const sheet = createCanvas(size.width, size.height);
  const ctx = sheet.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  frames.forEach((frame, index) => {
    ctx.drawImage(frame, index * frameWidth * scale, 0, frameWidth * scale, frameHeight * scale);
  });
  ctx.imageSmoothingEnabled = false;
  return sheet;
}

/**
 * 生成游戏引擎动画元数据 JSON。
 * config: { texture, frameWidth, frameHeight, frameCount, frameRate, animations }
 */
export function generateAnimationJson(config) {
  if (!config || typeof config !== 'object') {
    throw new TypeError('动画配置必须是对象');
  }
  const { texture, frameWidth, frameHeight, frameCount, frameRate, animations } = config;
  if (typeof texture !== 'string' || texture.trim() === '') throw new TypeError('texture 必须是非空文件名');
  for (const [key, value] of Object.entries({ frameWidth, frameHeight, frameCount, frameRate })) {
    if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${key} 必须是正整数`);
  }
  if (!animations || typeof animations !== 'object' || Object.keys(animations).length === 0) {
    throw new TypeError('animations 必须包含至少一个动作');
  }
  const normalized = {};
  for (const [name, anim] of Object.entries(animations)) {
    if (!anim || !Array.isArray(anim.frames) || anim.frames.length === 0) {
      throw new TypeError(`动作 ${name} 必须包含非空 frames 数组`);
    }
    anim.frames.forEach((frame) => {
      if (!Number.isInteger(frame) || frame < 0 || frame >= frameCount) {
        throw new RangeError(`动作 ${name} 的帧索引 ${frame} 超出 0~${frameCount - 1}`);
      }
    });
    normalized[name] = { frames: [...anim.frames], loop: Boolean(anim.loop) };
  }
  return `${JSON.stringify(
    {
      texture,
      frameWidth,
      frameHeight,
      frameCount,
      frameRate,
      animations: normalized
    },
    null,
    2
  )}\n`;
}

/** Canvas → PNG Blob */
export function canvasToBlob(canvas, type = 'image/png') {
  return new Promise((resolve, reject) => {
    if (!canvas || typeof canvas.toBlob !== 'function') {
      reject(new TypeError('canvas 不支持 toBlob'));
      return;
    }
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas 导出 PNG 失败'));
    }, type);
  });
}

/** Canvas → PNG 字节（供 ZIP 打包直接写入） */
export async function canvasToPngBytes(canvas) {
  const blob = await canvasToBlob(canvas);
  return new Uint8Array(await blob.arrayBuffer());
}

/** 浏览器端触发下载 */
export function triggerDownload(blob, filename) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('triggerDownload 仅在浏览器环境可用');
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename || 'download.zip';
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
