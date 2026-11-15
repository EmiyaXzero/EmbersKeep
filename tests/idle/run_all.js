/**
 * 《余烬裂隙》摸鱼挂机 ARPG 综合测试运行套件 (run_all.js)
 * -------------------------------------------------------------
 * 依次执行：
 * 1. 12 部位装备系统与战力公式测试 (equipment.test.js)
 * 2. 秘银锻炉 +1~+15 强化与碎裂保底测试 (forge.test.js)
 * 3. 战斗引擎状态机、方尖碑破碎与 60s 倒计时/金光柱测试 (battle.test.js)
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suites = [
  { name: 'Task 1: 12部位装备系统 & 战力公式', file: 'equipment.test.js' },
  { name: 'Task 2: 秘银锻炉强化 & 碎裂保底', file: 'forge.test.js' },
  { name: 'Task 3: 战斗状态机 & 裂隙方尖碑Boss循环', file: 'battle.test.js' },
  { name: 'Task 4: 三大神技 & 地面物理喷装与磁吸系统', file: 'skill.test.js' }
];

console.log('====================================================');
console.log('⚡ 开始执行《余烬裂隙》(EmbersRift) 全套自动化测试...');
console.log('====================================================\n');

let totalPassed = 0;
let totalSuites = suites.length;

for (const suite of suites) {
  const filePath = path.join(__dirname, suite.file);
  console.log(`▶ 运行套件: ${suite.name} (${suite.file})`);
  const result = spawnSync('node', [filePath], { stdio: 'inherit', encoding: 'utf-8' });
  
  if (result.status === 0) {
    totalPassed++;
    console.log(`✔ 套件 ${suite.name} 全部通过！\n`);
  } else {
    console.error(`✘ 套件 ${suite.name} 执行失败 (退出码: ${result.status})!\n`);
    process.exit(1);
  }
}

console.log('====================================================');
console.log(`🎉 全部 ${totalPassed}/${totalSuites} 个测试套件通过率 100%！`);
console.log('====================================================');
