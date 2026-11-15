/**
 * Task 2 测试：矢量像素网格校验与近邻栅格化引擎 (matrix.js)
 * 运行：node pixelforge/tests/matrix.test.js
 */
import {
  complianceScore,
  computeRasterSize,
  parseViewBox,
  parseRects,
  rasterizeSvg,
  svgToDataUrl,
  toPixelGrid,
  validateSvg
} from '../js/matrix.js';
import { Suite, finish, isDirectRun } from './harness.js';

const suite = new Suite('Task 2 · 网格校验与近邻栅格化 PixelMatrix');

const VALID_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">
  <title>合法像素块</title>
  <rect x="0" y="0" width="4" height="4" fill="#121016"/>
  <rect x="4" y="2" width="2" height="2" fill="#55a4db"/>
</svg>`;

suite.test('合规 SVG 通过校验，且判定为 crispEdges + 网格对齐', () => {
  const result = validateSvg(VALID_SVG);
  suite.ok(result.valid, `应通过校验，实际错误: ${result.errors.join(' | ')}`);
  suite.equal(result.errors.length, 0);
  suite.equal(result.width, 32);
  suite.equal(result.height, 32);
  suite.equal(result.rects.length, 2);
  suite.ok(result.stats.crispEdges);
  suite.ok(result.stats.gridAligned);
  suite.ok(result.stats.standardGrid);
});

suite.test('根节点缺失 shape-rendering="crispEdges" 被拦截并给出修正建议', () => {
  const bad = VALID_SVG.replace(' shape-rendering="crispEdges"', '');
  const result = validateSvg(bad);
  suite.notOk(result.valid);
  suite.ok(
    result.errors.some((message) => message.includes('crispEdges')),
    '错误信息应明确指出 crispEdges 缺失'
  );
  suite.ok(
    result.errors.some((message) => message.includes('边缘会发虚')),
    '错误信息应给出修正建议'
  );
});

suite.test('含 <path> 的普通 SVG 被拦截并给出行号', () => {
  const bad = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
  <rect x="0" y="0" width="4" height="4" fill="#121016"/>
  <path d="M4 4 L8 8 Z" fill="#55a4db"/>
</svg>`;
  const result = validateSvg(bad);
  suite.notOk(result.valid);
  const hit = result.errors.find((message) => message.includes('path'));
  suite.ok(hit, '必须指出 path 违规');
  suite.ok(/第 3 行/.test(hit), `错误应含行号，实际: ${hit}`);
  suite.ok(hit.includes('rect'), '应给出改用 rect 的修正建议');
});

suite.test('含 <circle> 的 SVG 被拦截', () => {
  const bad = VALID_SVG.replace(
    '<rect x="4" y="2" width="2" height="2" fill="#55a4db"/>',
    '<circle cx="8" cy="8" r="4" fill="#55a4db"/>'
  );
  const result = validateSvg(bad);
  suite.notOk(result.valid);
  suite.ok(result.errors.some((message) => message.includes('circle')), '应指出 circle 违规');
});

suite.test('viewBox 非 8 的整数倍被拦截', () => {
  const bad = VALID_SVG.replace('viewBox="0 0 32 32"', 'viewBox="0 0 30 30"');
  const result = validateSvg(bad);
  suite.notOk(result.valid);
  suite.ok(
    result.errors.some((message) => message.includes('8 的整数倍')),
    '应提示网格必须是 8 的整数倍'
  );
});

suite.test('缺失 viewBox 被拦截', () => {
  const bad = VALID_SVG.replace(' viewBox="0 0 32 32"', '');
  const result = validateSvg(bad);
  suite.notOk(result.valid);
  suite.ok(result.errors.some((message) => message.includes('viewBox')));
});

suite.test('非整数坐标被拦截并给出取整建议', () => {
  const bad = VALID_SVG.replace('x="4" y="2"', 'x="4.5" y="2"');
  const result = validateSvg(bad);
  suite.notOk(result.valid);
  const hit = result.errors.find((message) => message.includes('x="4.5"'));
  suite.ok(hit, '应指出具体属性与数值');
  suite.ok(hit.includes('取整'), '应给出取整建议');
});

suite.test('缺失 width 被拦截', () => {
  const bad = VALID_SVG.replace('<rect x="4" y="2" width="2" height="2"', '<rect x="4" y="2" height="2"');
  const result = validateSvg(bad);
  suite.notOk(result.valid);
  suite.ok(result.errors.some((message) => message.includes('缺少 width')));
});

suite.test('负数坐标被拦截', () => {
  const bad = VALID_SVG.replace('x="4" y="2"', 'x="-4" y="2"');
  const result = validateSvg(bad);
  suite.notOk(result.valid);
  suite.ok(result.errors.some((message) => message.includes('不能为负数')));
});

suite.test('rect 使用 transform 被拦截', () => {
  const bad = VALID_SVG.replace('<rect x="4" y="2"', '<rect transform="translate(1,1)" x="4" y="2"');
  const result = validateSvg(bad);
  suite.notOk(result.valid);
  suite.ok(result.errors.some((message) => message.includes('transform')));
});

suite.test('rect 超出 viewBox 仅警告，不阻断合法像素图', () => {
  const bad = VALID_SVG.replace('width="2" height="2" fill="#55a4db"', 'width="2" height="2" fill="#55a4db"').replace(
    'x="4" y="2"',
    'x="31" y="31"'
  );
  const result = validateSvg(bad);
  suite.ok(result.valid, '越界应只警告');
  suite.ok(result.warnings.some((message) => message.includes('超出 viewBox')));
});

suite.test('非标准调色板颜色产生警告但不阻断', () => {
  const alt = VALID_SVG.replace('#55a4db', '#00FF00');
  const result = validateSvg(alt);
  suite.ok(result.valid);
  suite.ok(result.warnings.some((message) => message.includes('非标准调色板颜色')));
  suite.equal(result.stats.offPaletteColors, 1);
});

suite.test('空内容容错返回 invalid', () => {
  const result = validateSvg('');
  suite.notOk(result.valid);
  suite.ok(result.errors[0].includes('为空'));
});

suite.test('parseRects 正确提取整数几何与行号', () => {
  const rects = parseRects(VALID_SVG);
  suite.equal(rects.length, 2);
  suite.deepEqual(
    { x: rects[0].x, y: rects[0].y, width: rects[0].width, height: rects[0].height },
    { x: 0, y: 0, width: 4, height: 4 }
  );
  suite.equal(rects[1].fill, '#55a4db');
  suite.equal(rects[1].line, 4);
});

suite.test('parseViewBox 解析标量与逗号混排', () => {
  suite.deepEqual(parseViewBox('<svg viewBox="0 0 48 48"></svg>'), { minX: 0, minY: 0, width: 48, height: 48 });
  suite.deepEqual(parseViewBox('<svg viewBox="0,0,64,64"></svg>'), { minX: 0, minY: 0, width: 64, height: 64 });
  suite.equal(parseViewBox('<svg></svg>'), null);
});

suite.test('toPixelGrid 输出覆盖优先的逐像素颜色矩阵', () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">
  <rect x="0" y="0" width="8" height="8" fill="#121016"/>
  <rect x="2" y="2" width="2" height="2" fill="#55a4db"/>
</svg>`;
  const grid = toPixelGrid(svg);
  suite.equal(grid.width, 8);
  suite.equal(grid.height, 8);
  suite.equal(grid.cells[0][0], '#121016');
  suite.equal(grid.cells[2][2], '#55a4db');
  suite.equal(grid.cells[3][3], '#55a4db');
  suite.equal(grid.cells[4][4], '#121016');
});

suite.test('computeRasterSize 按倍率精确换算', () => {
  suite.deepEqual(computeRasterSize(VALID_SVG, 1), { width: 32, height: 32, scale: 1 });
  suite.deepEqual(computeRasterSize(VALID_SVG, 4), { width: 128, height: 128, scale: 4 });
  suite.throws(() => computeRasterSize(VALID_SVG, 1.5), TypeError);
  suite.throws(() => computeRasterSize(VALID_SVG, 0), TypeError);
});

suite.test('svgToDataUrl 生成可离线解析的 data URL', () => {
  const url = svgToDataUrl(VALID_SVG);
  suite.ok(url.startsWith('data:image/svg+xml;charset=utf-8,'), '前缀必须为 svg data URL');
  suite.equal(decodeURIComponent(url.split(',').slice(1).join(',')), VALID_SVG.trim());
  suite.throws(() => svgToDataUrl(''), TypeError);
});

suite.test('rasterizeSvg 对非法 SVG 明确拒绝', async () => {
  await suite.rejects(() => rasterizeSvg('<svg viewBox="0 0 32 32"><path d="M0 0"/></svg>', 2), 'SVG 校验未通过');
});

suite.test('rasterizeSvg 在无 Canvas 的 Node 环境给出清晰错误', async () => {
  await suite.rejects(() => rasterizeSvg(VALID_SVG, 2), '不支持 Canvas');
});

suite.test('complianceScore 按 crisp + 网格 + 调色板加权', () => {
  const validation = validateSvg(VALID_SVG);
  suite.close(complianceScore(validation, 100), 100, 0.001, '全合规应为 100 分');
  suite.close(complianceScore(validation, 0), 70, 0.001, '无调色板覆盖应为 70 分');
  const bad = validateSvg(VALID_SVG.replace(' shape-rendering="crispEdges"', ''));
  suite.close(complianceScore(bad, 100), 60, 0.001, '缺 crispEdges 丢掉 40 分');
});

export default suite;

if (isDirectRun(import.meta.url)) {
  await finish(suite);
}
