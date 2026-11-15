/**
 * Task 1 测试：调色板引擎 (palette.js)
 * 运行：node pixelforge/tests/palette.test.js
 */
import {
  EMBERS_PALETTE,
  EMBERS_PALETTE_HEXES,
  PALETTE_FAMILIES,
  analyzePalette,
  analyzeFamilies,
  colorDistance,
  getPaletteStats,
  normalizeHex,
  quantizeSvg,
  replaceColor,
  retintSvg,
  snapColor,
  snapColorInfo
} from '../js/palette.js';
import { Suite, finish, isDirectRun } from './harness.js';

const suite = new Suite('Task 1 · 调色板引擎 PixelPalette');

const EXPECTED_HEXES = [
  '#121016', '#1e1b24', '#2c2636', '#41394d',
  '#5c5266', '#7c728a', '#a69cb3',
  '#5e1b1b', '#a12b2b', '#d64e2a', '#f28929', '#fad65a',
  '#1d3b5c', '#2b6ba6', '#55a4db', '#bee5fa'
];

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
  <rect x="0" y="0" width="4" height="4" fill="#121016"/>
  <rect x="4" y="0" width="2" height="2" fill="#55A4DB"/>
  <rect x="6" y="0" width="1" height="1" fill="#FFFFFF"/>
  <rect x="7" y="0" width="2" height="2" fill="#55A4DB" stroke="#2C2636"/>
</svg>`;

suite.test('16 色标准调色板常量完整且与 SPEC 一致', () => {
  suite.equal(EMBERS_PALETTE.length, 16, '调色板必须为 16 色');
  suite.deepEqual([...EMBERS_PALETTE_HEXES].sort(), [...EXPECTED_HEXES].sort(), 'HEX 列表应与 SPEC 完全一致');
  const names = new Set(EMBERS_PALETTE.map((entry) => entry.name));
  suite.equal(names.size, 16, '每色名称应唯一');
  EMBERS_PALETTE.forEach((entry) => {
    suite.ok(/^#[0-9a-f]{6}$/.test(entry.hex), `${entry.hex} 必须为小写 6 位 HEX`);
    suite.ok(Object.prototype.hasOwnProperty.call(PALETTE_FAMILIES, entry.family), `${entry.hex} 色系非法`);
  });
});

suite.test('调色板常量被冻结，禁止运行时篡改', () => {
  suite.ok(Object.isFrozen(EMBERS_PALETTE), 'EMBERS_PALETTE 应被冻结');
  suite.ok(EMBERS_PALETTE.every((entry) => Object.isFrozen(entry)), '每个色板条目应被冻结');
  suite.throws(() => {
    EMBERS_PALETTE.push({ hex: '#000000' });
  });
});

suite.test('normalizeHex 支持 3/6 位并拒绝非法输入', () => {
  suite.equal(normalizeHex('#FFF'), '#ffffff');
  suite.equal(normalizeHex('#FAD65A'), '#fad65a');
  suite.throws(() => normalizeHex('#GGGGGG'), TypeError);
  suite.throws(() => normalizeHex('red'), TypeError);
});

suite.test('snapColor 将纯白吸附到最亮的辉光亮蓝', () => {
  suite.equal(snapColor('#FFFFFF'), '#bee5fa');
  suite.equal(snapColor('#ffffff'), '#bee5fa', '大小写应一致处理');
});

suite.test('snapColor 将纯黑吸附到极夜黑', () => {
  suite.equal(snapColor('#000000'), '#121016');
});

suite.test('snapColor 将中灰吸附到铸铁灰', () => {
  suite.equal(snapColor('#808080'), '#7c728a');
});

suite.test('snapColor 将纯红吸附到熔岩红', () => {
  suite.equal(snapColor('#FF0000'), '#d64e2a');
});

suite.test('非标准杂色 #00FF00 吸附结果必须是 16 色中色距最小者', () => {
  const result = snapColor('#00FF00');
  suite.ok(EMBERS_PALETTE_HEXES.includes(result), '结果必须属于 16 色');
  const best = Math.min(...EMBERS_PALETTE_HEXES.map((hex) => colorDistance('#00FF00', hex)));
  suite.close(colorDistance('#00FF00', result), best, 1e-9, '吸附色距应为全局最小');
});

suite.test('snapColor 对标准色精确命中且距离为 0', () => {
  const info = snapColorInfo('#FAD65A');
  suite.equal(info.hex, '#fad65a');
  suite.ok(info.exact, '应标记为精确命中');
  suite.close(info.distance, 0, 1e-9);
});

suite.test('replaceColor 全量热替换且不影响其它颜色', () => {
  const output = replaceColor(SAMPLE_SVG, '#55A4DB', '#F28929');
  suite.ok(!output.includes('#55A4DB'), '旧色必须被完全替换');
  suite.equal(output.match(/#F28929/gi).length, 2, '两处旧色都应替换');
  suite.ok(output.includes('#121016'), '其它颜色不能被误改');
});

suite.test('replaceColor 未命中颜色时原样返回', () => {
  const output = replaceColor(SAMPLE_SVG, '#123456', '#FAD65A');
  suite.equal(output, SAMPLE_SVG);
});

suite.test('analyzePalette 按像素面积统计占比', () => {
  const result = analyzePalette(SAMPLE_SVG);
  suite.equal(result.totalPixels, 25, '总像素面积 = 16 + 4 + 1 + 4');
  suite.equal(result.uniqueColors, 3);
  suite.equal(result.stats[0].color, '#121016', '占比最高应为极夜黑');
  suite.equal(result.stats[0].count, 16);
  suite.equal(result.stats[0].percent, 64);
  suite.equal(result.stats[1].color, '#55a4db', '其次应为冰霜蓝');
  suite.equal(result.stats[1].count, 8);
  suite.equal(result.stats[1].percent, 32);
  suite.ok(result.paletteCoverage > 0 && result.paletteCoverage < 100, '含非标白色，覆盖率应介于 0~100');
});

suite.test('analyzePalette 空 SVG 容错', () => {
  const result = analyzePalette('<svg></svg>');
  suite.equal(result.totalPixels, 0);
  suite.equal(result.stats.length, 0);
  suite.equal(result.paletteCoverage, 0);
});

suite.test('getPaletteStats 为 analyzePalette 的规格别名', () => {
  suite.deepEqual(getPaletteStats(SAMPLE_SVG), analyzePalette(SAMPLE_SVG));
});

suite.test('quantizeSvg 将整图吸附到 16 色且幂等', () => {
  const once = quantizeSvg(SAMPLE_SVG);
  const twice = quantizeSvg(once);
  suite.equal(once, twice, '量化应幂等');
  const stats = analyzePalette(once);
  suite.equal(stats.paletteCoverage, 100, '量化后 16 色覆盖率应为 100%');
  suite.ok(once.includes('#bee5fa'), '白色应被吸附到辉光亮蓝');
});

suite.test('retintSvg 火光换肤：奥术层变火色，暗部结构不变', () => {
  const output = retintSvg(SAMPLE_SVG, 'fire');
  suite.equal(output.match(/#f28929/gi).length, 2, '冰霜蓝应映射到余烬橙');
  suite.ok(output.includes('#121016'), '极夜黑结构色应保留');
  suite.ok(!output.includes('#55A4DB'), '不应残留奥术蓝');
  const families = analyzeFamilies(output);
  suite.equal(families.arcane, 0, '换肤后不应再有奥术色面积');
});

suite.test('retintSvg 目标色系自身颜色保持不变', () => {
  const output = retintSvg(SAMPLE_SVG, 'arcane');
  suite.equal(output.match(/#55a4db/gi).length, 2, '同色系不应被改写');
});

suite.test('retintSvg 拒绝未知色系', () => {
  suite.throws(() => retintSvg(SAMPLE_SVG, 'neon'), TypeError);
});

export default suite;

if (isDirectRun(import.meta.url)) {
  await finish(suite);
}
