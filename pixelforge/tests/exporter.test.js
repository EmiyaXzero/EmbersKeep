/**
 * Task 4 测试：精灵图拼接与纯前端轻量 ZIP 打包器 (exporter.js)
 * 运行：node pixelforge/tests/exporter.test.js
 */
import {
  ZIP_CENTRAL_SIGNATURE,
  ZIP_END_SIGNATURE,
  ZIP_LOCAL_SIGNATURE,
  buildZipBytes,
  computeSheetSize,
  crc32,
  createZipBundle,
  generateAnimationJson,
  generateSpritesheet,
  triggerDownload
} from '../js/exporter.js';
import { Suite, finish, isDirectRun } from './harness.js';

const suite = new Suite('Task 4 · Spritesheet 与 PKZip 导出流水线');

function createFakeCanvasFactory() {
  const created = [];
  function createCanvas(width, height) {
    const canvas = {
      width,
      height,
      draws: [],
      ctx: {
        imageSmoothingEnabled: true,
        drawImage(...args) {
          canvas.draws.push(args);
        }
      },
      getContext(type) {
        if (type !== '2d') throw new Error('仅支持 2d');
        return this.ctx;
      }
    };
    created.push(canvas);
    return canvas;
  }
  return { createCanvas, created };
}

function createFrames(count, width = 32, height = 32) {
  return Array.from({ length: count }, (_, index) => ({ width, height, index }));
}

function readAscii(bytes, start, length) {
  return Array.from(bytes.slice(start, start + length))
    .map((byte) => String.fromCharCode(byte))
    .join('');
}

suite.test('computeSheetSize 精确计算水平单行尺寸', () => {
  suite.deepEqual(computeSheetSize(32, 32, 4, 1), { width: 128, height: 32, scale: 1 });
  suite.deepEqual(computeSheetSize(32, 32, 4, 2), { width: 256, height: 64, scale: 2 });
  suite.deepEqual(computeSheetSize(48, 48, 12, 1), { width: 576, height: 48, scale: 1 });
  suite.throws(() => computeSheetSize(32, 32, 0, 1), TypeError);
  suite.throws(() => computeSheetSize(32, 32, 4, 1.5), TypeError);
});

suite.test('generateSpritesheet 水平零间隙拼接（1x）', () => {
  const { createCanvas, created } = createFakeCanvasFactory();
  const frames = createFrames(4);
  const sheet = generateSpritesheet(frames, 1, { createCanvas });
  suite.equal(sheet.width, 128);
  suite.equal(sheet.height, 32);
  suite.equal(sheet.draws.length, 4, '每帧绘制一次');
  suite.deepEqual(
    sheet.draws.map((draw) => draw[0].index),
    [0, 1, 2, 3],
    '绘制顺序必须与帧序列一致'
  );
  suite.deepEqual(
    sheet.draws.map((draw) => draw[1]),
    [0, 32, 64, 96],
    '帧起点必须精确为 index × frameWidth'
  );
  sheet.draws.forEach((draw) => {
    suite.equal(draw[2], 0, '纵向必须贴顶，零偏移');
    suite.equal(draw[3], 32, '每帧绘制宽度为帧宽');
    suite.equal(draw[4], 32, '每帧绘制高度为帧高');
  });
  suite.equal(sheet.ctx.imageSmoothingEnabled, false, '必须关闭插值');
  suite.equal(created.length, 1, '只创建一个画布');
});

suite.test('generateSpritesheet 2x 输出尺寸与位置翻倍', () => {
  const { createCanvas } = createFakeCanvasFactory();
  const sheet = generateSpritesheet(createFrames(4), 2, { createCanvas });
  suite.equal(sheet.width, 256);
  suite.equal(sheet.height, 64);
  suite.deepEqual(sheet.draws.map((draw) => draw[1]), [0, 64, 128, 192]);
  suite.equal(sheet.draws[0][3], 64);
  suite.equal(sheet.draws[0][4], 64);
});

suite.test('generateSpritesheet 拒绝空帧与尺寸不一致', () => {
  const { createCanvas } = createFakeCanvasFactory();
  suite.throws(() => generateSpritesheet([], 1, { createCanvas }), '至少需要一帧');
  suite.throws(
    () => generateSpritesheet([{ width: 32, height: 32 }, { width: 48, height: 48 }], 1, { createCanvas }),
    '尺寸'
  );
  suite.throws(() => generateSpritesheet(createFrames(2), 0, { createCanvas }), TypeError);
});

suite.test('generateAnimationJson 输出符合 SPEC 的 schema', () => {
  const json = generateAnimationJson({
    texture: 'ashen_wolf_1x.png',
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 10,
    frameRate: 6,
    animations: {
      walk: { frames: [0, 1, 2, 3], loop: true },
      attack: { frames: [4, 5, 6], loop: false },
      death: { frames: [7, 8, 9], loop: false }
    }
  });
  const parsed = JSON.parse(json);
  suite.deepEqual(Object.keys(parsed), ['texture', 'frameWidth', 'frameHeight', 'frameCount', 'frameRate', 'animations']);
  suite.equal(parsed.texture, 'ashen_wolf_1x.png');
  suite.equal(parsed.frameWidth, 32);
  suite.equal(parsed.frameCount, 10);
  suite.equal(parsed.frameRate, 6);
  suite.deepEqual(parsed.animations.walk, { frames: [0, 1, 2, 3], loop: true });
  suite.equal(parsed.animations.attack.loop, false);
  suite.ok(json.endsWith('\n'), 'JSON 文件应以换行结尾');
});

suite.test('generateAnimationJson 拒绝越界帧索引与非法配置', () => {
  const base = {
    texture: 'a.png',
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 2,
    frameRate: 6,
    animations: { idle: { frames: [0], loop: true } }
  };
  suite.throws(
    () => generateAnimationJson({ ...base, animations: { idle: { frames: [3], loop: true } } }),
    RangeError
  );
  suite.throws(() => generateAnimationJson({ ...base, frameCount: -1 }), TypeError);
  suite.throws(() => generateAnimationJson({ ...base, animations: {} }), TypeError);
  suite.throws(() => generateAnimationJson({ ...base, texture: '' }), TypeError);
});

suite.test('crc32 与标准测试向量一致', () => {
  const bytes = new TextEncoder().encode('123456789');
  suite.equal(crc32(bytes), 0xcbf43926);
});

suite.test('buildZipBytes 写入标准 PKZip 本地头 / 中央目录 / EOCD', () => {
  const content = new TextEncoder().encode('hello pixelforge');
  const bytes = buildZipBytes([{ name: 'manifest.json', data: content }], { date: new Date(2026, 0, 1) });
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  suite.equal(view.getUint32(0, true), ZIP_LOCAL_SIGNATURE, '本地头签名必须为 PK\\x03\\x04');
  suite.equal(readAscii(bytes, 0, 4), 'PK\u0003\u0004');
  suite.equal(view.getUint16(4, true), 20, '解压版本号');
  suite.equal(view.getUint16(6, true), 0x0800, 'UTF-8 文件名标志');
  suite.equal(view.getUint16(8, true), 0, 'STORE 无压缩');
  suite.equal(view.getUint32(14, true), crc32(content), 'CRC32 必须匹配');
  suite.equal(view.getUint32(18, true), content.length, '压缩后长度');
  suite.equal(view.getUint32(22, true), content.length, '原始长度');
  const nameLength = view.getUint16(26, true);
  suite.equal(readAscii(bytes, 30, nameLength), 'manifest.json');
  const dataStart = 30 + nameLength;
  suite.deepEqual([...bytes.slice(dataStart, dataStart + content.length)], [...content], '文件内容必须原样写入');

  const centralStart = dataStart + content.length;
  suite.equal(view.getUint32(centralStart, true), ZIP_CENTRAL_SIGNATURE);
  suite.equal(view.getUint16(centralStart + 10, true), 0, '中央目录同样标记 STORE');
  suite.equal(view.getUint32(centralStart + 42, true), 0, '本地头相对偏移');

  const eocdStart = bytes.length - 22;
  suite.equal(view.getUint32(eocdStart, true), ZIP_END_SIGNATURE);
  suite.equal(view.getUint16(eocdStart + 8, true), 1, '总条目数 1');
  suite.equal(view.getUint16(eocdStart + 10, true), 1);
  suite.equal(view.getUint32(eocdStart + 16, true), centralStart, '中央目录偏移必须正确');
});

suite.test('buildZipBytes 支持多文件与中文文件名', () => {
  const files = [
    { name: 'spritesheets/wolf_1x.png', data: new Uint8Array([137, 80, 78, 71]) },
    { name: '配置/animations.json', data: '{"a":1}' },
    { name: 'svg/frame_0.svg', data: '<svg/>' }
  ];
  const bytes = buildZipBytes(files);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdStart = bytes.length - 22;
  suite.equal(view.getUint16(eocdStart + 10, true), 3, '三个文件条目');
  suite.ok(Buffer.from(bytes).includes(Buffer.from('配置/animations.json', 'utf8')), '中文目录名应写入');
  suite.ok(Buffer.from(bytes).includes(Buffer.from('spritesheets/wolf_1x.png')), '路径应保留');
});

suite.test('buildZipBytes 拒绝空文件列表与缺失文件名', () => {
  suite.throws(() => buildZipBytes([]), '至少需要一个文件');
  suite.throws(() => buildZipBytes([{ data: 'x' }]), 'name');
});

suite.test('createZipBundle 生成 application/zip Blob', async () => {
  const blob = await createZipBundle([{ name: 'a.txt', data: 'pixel' }]);
  suite.equal(blob.type, 'application/zip');
  suite.ok(blob.size > 22, 'ZIP Blob 应包含完整结构');
  const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  suite.deepEqual([...head], [0x50, 0x4b, 0x03, 0x04], 'Blob 头必须是 PK\\x03\\x04');
});

suite.test('triggerDownload 在 Node 环境给出清晰错误', () => {
  suite.throws(() => triggerDownload(new Blob(['x']), 'a.zip'), '仅在浏览器环境可用');
});

export default suite;

if (isDirectRun(import.meta.url)) {
  await finish(suite);
}
