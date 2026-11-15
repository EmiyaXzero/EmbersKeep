/**
 * Task 7：全量测试与回归套件单入口
 * 运行：node pixelforge/tests/run_all.js
 *
 * 依序执行 palette / matrix / animator / exporter 四套核心算法测试，
 * 追加一组针对内置 12 塔 3 怪 32 帧的集成回归，确保离线资产与导出链路可用。
 */
import { Suite } from './harness.js';
import paletteSuite from './palette.test.js';
import matrixSuite from './matrix.test.js';
import animatorSuite from './animator.test.js';
import exporterSuite from './exporter.test.js';

import { analyzePalette, quantizeSvg } from '../js/palette.js';
import { validateSvg } from '../js/matrix.js';
import { computeSheetSize, createZipBundle } from '../js/exporter.js';
import { MONSTERS, PRESET_STATS, TOWERS } from '../js/presets.js';

const suites = [paletteSuite, matrixSuite, animatorSuite, exporterSuite];

const integration = new Suite('集成回归 · 内置资产库与导出流水线');

const allSvgs = [
  ...TOWERS.map((tower) => tower.svg),
  ...MONSTERS.flatMap((monster) =>
    Object.values(monster.animations).flatMap((animation) => [...animation.frames])
  )
];

integration.test('资产库包含 12 款防御塔与 3 款怪物共 32 帧', () => {
  integration.equal(TOWERS.length, 12, '防御塔数量必须为 12');
  integration.equal(MONSTERS.length, 3, '怪物数量必须为 3');
  integration.equal(PRESET_STATS.monsterFrameCount, 32, '怪物帧总数必须为 32');
  integration.equal(allSvgs.length, 44, 'SVG 资产总数 = 12 塔 + 32 帧');
});

integration.test('全部 44 份 SVG 通过硬边像素规范校验', () => {
  const failures = [];
  allSvgs.forEach((svg, index) => {
    const result = validateSvg(svg);
    if (!result.valid) failures.push(`#${index}: ${result.errors[0]}`);
  });
  integration.equal(failures.length, 0, failures.slice(0, 3).join(' | '));
});

integration.test('全部预设量化后 16 色覆盖率均为 100%', () => {
  const failures = [];
  allSvgs.forEach((svg, index) => {
    const coverage = analyzePalette(quantizeSvg(svg)).paletteCoverage;
    if (coverage !== 100) failures.push(`#${index}: ${coverage}%`);
  });
  integration.equal(failures.length, 0, failures.slice(0, 3).join(' | '));
});

integration.test('三款怪物的各动作带尺寸精确等于 帧数 × 帧宽', () => {
  MONSTERS.forEach((monster) => {
    Object.entries(monster.animations).forEach(([state, animation]) => {
      const size = computeSheetSize(monster.width, monster.height, animation.frames.length, 2);
      integration.equal(
        size.width,
        monster.width * animation.frames.length * 2,
        `${monster.id}/${state} 2x 宽度错误`
      );
      integration.equal(size.height, monster.height * 2, `${monster.id}/${state} 2x 高度错误`);
    });
  });
});

integration.test('全量资产 ZIP 打包产出合法 PKZip Blob', async () => {
  const files = allSvgs.map((svg, index) => ({ name: `svg/asset_${index}.svg`, data: svg }));
  files.push({ name: 'animations.json', data: '{"frameWidth":32}' });
  const blob = await createZipBundle(files);
  const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  integration.deepEqual([...head], [0x50, 0x4b, 0x03, 0x04], 'ZIP 头必须为 PK\\x03\\x04');
  integration.equal(blob.type, 'application/zip');
  integration.ok(blob.size > 10000, 'ZIP 应包含全部 SVG 数据');
});

async function main() {
  let failed = 0;
  for (const suite of suites) {
    failed += await suite.run();
  }
  failed += await integration.run();

  const line = '═'.repeat(64);
  console.log(`\n${line}`);
  if (failed === 0) {
    console.log('  \x1b[32m✓ 全量回归通过：4 套单元测试 + 1 套集成回归，100% PASS\x1b[0m');
  } else {
    console.log(`  \x1b[31m✗ 全量回归失败：共 ${failed} 个用例未通过\x1b[0m`);
  }
  console.log(`${line}\n`);
  process.exitCode = failed === 0 ? 0 : 1;
}

await main();
