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

/* -------------------- 边界用例补充 -------------------- */

suite.test('边界：null / 非字符串输入不抛异常，返回 invalid', () => {
  for (const input of [null, undefined, 123, {}, []]) {
    const result = validateSvg(input);
    suite.notOk(result.valid, `${String(input)} 应判定为非法`);
    suite.ok(result.errors.length > 0, '必须返回错误说明');
    suite.equal(result.rects.length, 0);
    suite.equal(result.width, 0);
  }
});

suite.test('边界：仅含注释与空白的 SVG 被拦截', () => {
  const result = validateSvg('<!-- 只有注释 -->\n   \n<!-- 没有任何图元 -->');
  suite.notOk(result.valid);
  suite.ok(result.errors.some((message) => message.includes('未找到任何 SVG 元素')));
});

suite.test('边界：自闭合空 <svg/> 缺少 viewBox / rect 时给出明确错误', () => {
  const noViewBox = validateSvg('<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"/>');
  suite.notOk(noViewBox.valid);
  suite.ok(noViewBox.errors.some((message) => message.includes('viewBox')));

  const emptyGrid = validateSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges"/>'
  );
  suite.notOk(emptyGrid.valid);
  suite.ok(emptyGrid.errors.some((message) => message.includes('未找到任何 <rect>')));
});

suite.test('边界：XML 声明、单引号属性与大写标签仍可正确解析', () => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<SVG xmlns='http://www.w3.org/2000/svg' VIEWBOX='0 0 32 32' SHAPE-RENDERING='crispEdges'>
  <TITLE>大写标签</TITLE>
  <RECT X='2' Y='2' WIDTH='4' HEIGHT='4' FILL='#121016'/>
</SVG>`;
  const result = validateSvg(svg);
  suite.ok(result.valid, `应通过校验，实际错误: ${result.errors.join(' | ')}`);
  suite.equal(result.width, 32);
  suite.equal(result.rects.length, 1);
  suite.equal(result.rects[0].fill, '#121016');
});

suite.test('边界：注释中的 <path> / <circle> 不得误报', () => {
  const svg = VALID_SVG.replace(
    '<rect x="0" y="0"',
    '<!-- 反例参考：<path d="M0 0"/> 与 <circle cx="8" cy="8" r="4"/> -->\n  <rect x="0" y="0"'
  );
  const result = validateSvg(svg);
  suite.ok(result.valid, `注释不应参与校验，实际错误: ${result.errors.join(' | ')}`);
  suite.equal(result.errors.length, 0);
});

suite.test('边界：百分比与非数字坐标被拦截且不崩溃', () => {
  const percent = validateSvg(VALID_SVG.replace('x="4" y="2"', 'x="50%" y="2"'));
  suite.notOk(percent.valid);
  suite.ok(percent.errors.some((message) => message.includes('x="50%"')));

  const nan = validateSvg(VALID_SVG.replace('x="4" y="2"', 'x="abc" y="2"'));
  suite.notOk(nan.valid);
  suite.ok(nan.errors.some((message) => message.includes('x="abc"')));
});

suite.test('边界：分数 viewBox 与过小 viewBox 分别被拦截', () => {
  const fractional = validateSvg(VALID_SVG.replace('viewBox="0 0 32 32"', 'viewBox="0 0 32.5 32"'));
  suite.notOk(fractional.valid);
  suite.ok(fractional.errors.some((message) => message.includes('不是整数')));

  const tiny = validateSvg(VALID_SVG.replace('viewBox="0 0 32 32"', 'viewBox="0 0 4 4"'));
  suite.notOk(tiny.valid);
  suite.ok(tiny.errors.some((message) => message.includes('过小')));
});

suite.test('边界：24×24 为 8 的倍数但非标准尺寸，仅警告不拦截', () => {
  const svg = VALID_SVG.replace('viewBox="0 0 32 32"', 'viewBox="0 0 24 24"');
  const result = validateSvg(svg);
  suite.ok(result.valid, '仅应产生警告');
  suite.ok(result.warnings.some((message) => message.includes('非标准尺寸')));
});

suite.test('边界：非正方形 32×48 网格合法', () => {
  const svg = VALID_SVG.replace('viewBox="0 0 32 32"', 'viewBox="0 0 32 48"');
  const result = validateSvg(svg);
  suite.ok(result.valid, `32×48 应合法，实际错误: ${result.errors.join(' | ')}`);
  suite.equal(result.width, 32);
  suite.equal(result.height, 48);
});

suite.test('边界：viewBox 原点非 (0,0) 仅警告', () => {
  const svg = VALID_SVG.replace('viewBox="0 0 32 32"', 'viewBox="-8 -8 32 32"');
  const result = validateSvg(svg);
  suite.ok(result.valid);
  suite.ok(result.warnings.some((message) => message.includes('原点')));
});

suite.test('边界：<g> 与 <use> 被拦截并提示扁平化', () => {
  const group = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
  <g transform="translate(2,2)">
    <rect x="0" y="0" width="4" height="4" fill="#121016"/>
  </g>
</svg>`;
  const groupResult = validateSvg(group);
  suite.notOk(groupResult.valid);
  suite.ok(groupResult.errors.some((message) => message.includes('<g>') && message.includes('扁平化')));

  const use = VALID_SVG.replace(
    '<rect x="4" y="2" width="2" height="2" fill="#55a4db"/>',
    '<use href="#glyph"/>'
  );
  const useResult = validateSvg(use);
  suite.notOk(useResult.valid);
  suite.ok(useResult.errors.some((message) => message.includes('<use>')));
});

suite.test('边界：零尺寸 rect 与 fill="none" 仅警告', () => {
  const zero = validateSvg(
    VALID_SVG.replace('width="2" height="2" fill="#55a4db"', 'width="0" height="0" fill="#55a4db"')
  );
  suite.ok(zero.valid, '零尺寸不应阻断校验');
  suite.ok(zero.warnings.some((message) => message.includes('尺寸为 0')));

  const transparent = validateSvg(VALID_SVG.replace('#55a4db', 'none'));
  suite.ok(transparent.valid);
  suite.ok(transparent.warnings.some((message) => message.includes('fill="none"')));
});

suite.test('边界：非十六进制 fill 给出调色板警告但不拦截', () => {
  const result = validateSvg(VALID_SVG.replace('#55a4db', 'red'));
  suite.ok(result.valid);
  suite.ok(result.warnings.some((message) => message.includes('不是十六进制色值')));
});

suite.test('边界：toPixelGrid 对非法 SVG 抛出明确异常', () => {
  suite.throws(
    () => toPixelGrid('<svg viewBox="0 0 32 32" shape-rendering="crispEdges"><circle cx="4" cy="4" r="2"/></svg>'),
    'SVG 校验未通过'
  );
});

suite.test('边界：rasterizeSvg 拒绝 0 与小数倍率', async () => {
  await suite.rejects(() => rasterizeSvg(VALID_SVG, 0), 'scale 必须是');
  await suite.rejects(() => rasterizeSvg(VALID_SVG, 1.5), 'scale 必须是');
  await suite.rejects(() => rasterizeSvg(VALID_SVG, -2), 'scale 必须是');
});

export default suite;

if (isDirectRun(import.meta.url)) {
  await finish(suite);
}
