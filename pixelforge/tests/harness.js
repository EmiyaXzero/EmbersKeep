/**
 * PixelForge 极简测试夹具 (无第三方依赖)
 * 供 palette / matrix / animator / exporter 四套测试共用。
 * 支持同步与异步用例，直接运行与 run_all.js 聚合运行两种模式。
 */

export class Suite {
  constructor(title) {
    this.title = title;
    this.queue = [];
    this.results = [];
  }

  test(name, fn) {
    this.queue.push({ name, fn });
    return this;
  }

  ok(condition, message = '断言失败：期望为真值') {
    if (!condition) throw new Error(message);
  }

  notOk(condition, message = '断言失败：期望为假值') {
    if (condition) throw new Error(message);
  }

  equal(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(
        `${message || '断言失败：值不相等'} (实际: ${format(actual)}, 期望: ${format(expected)})`
      );
    }
  }

  notEqual(actual, expected, message = '') {
    if (actual === expected) {
      throw new Error(`${message || '断言失败：值不应相等'} (两者均为: ${format(actual)})`);
    }
  }

  close(actual, expected, epsilon = 1e-6, message = '') {
    if (Math.abs(actual - expected) > epsilon) {
      throw new Error(
        `${message || '断言失败：数值超出容差'} (实际: ${format(actual)}, 期望: ${format(expected)})`
      );
    }
  }

  deepEqual(actual, expected, message = '') {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b) {
      throw new Error(`${message || '断言失败：结构不相等'}\n实际: ${a}\n期望: ${b}`);
    }
  }

  throws(fn, matcher, message = '') {
    let error = null;
    try {
      fn();
    } catch (err) {
      error = err;
    }
    if (!error) throw new Error(message || '断言失败：期望抛出异常，但函数正常返回');
    if (matcher instanceof RegExp && !matcher.test(error.message)) {
      throw new Error(`${message || '断言失败：异常信息不匹配'}\n实际: ${error.message}\n期望匹配: ${matcher}`);
    }
    if (typeof matcher === 'string' && !error.message.includes(matcher)) {
      throw new Error(`${message || '断言失败：异常信息不匹配'}\n实际: ${error.message}\n期望包含: ${matcher}`);
    }
    return error;
  }

  async rejects(promiseFactory, matcher, message = '') {
    let error = null;
    try {
      await promiseFactory();
    } catch (err) {
      error = err;
    }
    if (!error) throw new Error(message || '断言失败：期望 Promise 拒绝，但正常完成');
    if (matcher && !String(error.message).includes(matcher)) {
      throw new Error(`${message || '断言失败：拒绝原因不匹配'}\n实际: ${error.message}\n期望包含: ${matcher}`);
    }
    return error;
  }

  async run() {
    const line = '─'.repeat(64);
    console.log(`\n${line}`);
    console.log(`  ${this.title}`);
    console.log(line);
    for (const { name, fn } of this.queue) {
      try {
        await fn();
        this.results.push({ name, ok: true });
        console.log(`  \x1b[32m✓ PASS\x1b[0m  ${name}`);
      } catch (error) {
        this.results.push({ name, ok: false, error });
        console.log(`  \x1b[31m✗ FAIL\x1b[0m  ${name}`);
        console.log(`          ${String(error && error.message).split('\n').join('\n          ')}`);
      }
    }
    const total = this.results.length;
    const failed = this.results.filter((item) => !item.ok).length;
    const passed = total - failed;
    const color = failed === 0 ? '\x1b[32m' : '\x1b[31m';
    console.log(line);
    console.log(`  ${color}${passed}/${total} 通过，${failed} 失败\x1b[0m`);
    return failed;
  }
}

function format(value) {
  if (typeof value === 'string') return `"${value}"`;
  if (value instanceof Map) return `Map(${value.size})`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** 判断当前测试文件是否被 node 直接执行（而非被 run_all.js import） */
export function isDirectRun(importMetaUrl) {
  if (!process.argv[1]) return false;
  try {
    return importMetaUrl === new URL(`file://${process.argv[1]}`).href;
  } catch {
    return false;
  }
}

export async function finish(suite) {
  const failed = await suite.run();
  if (failed > 0) process.exitCode = 1;
  return failed;
}
