/**
 * Task 3 测试：多动作逐帧动效状态机与洋葱皮时钟 (animator.js)
 * 运行：node pixelforge/tests/animator.test.js
 */
import { AnimationPlayer, MAX_FPS, MIN_FPS, ONION_ALPHA } from '../js/animator.js';
import { Suite, finish, isDirectRun } from './harness.js';

const suite = new Suite('Task 3 · 动效状态机与洋葱皮 AnimationPlayer');

const ANIMATIONS = {
  walk: { frameCount: 4, loop: true, fps: 6 },
  attack: { frameCount: 3, loop: false, fps: 8 },
  death: { frameCount: 3, loop: false, fps: 8 }
};

function createPlayer(overrides = {}) {
  return new AnimationPlayer({
    frameWidth: 32,
    frameHeight: 32,
    fps: 10,
    animations: ANIMATIONS,
    ...overrides
  });
}

function createFakeCtx() {
  const calls = [];
  return {
    calls,
    imageSmoothingEnabled: true,
    globalAlpha: 1,
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    save() {},
    restore() {},
    drawImage(image, x, y, width, height) {
      calls.push({ image, x, y, width, height, alpha: this.globalAlpha });
    }
  };
}

suite.test('构造后默认落在首个动作并停在第 0 帧', () => {
  const player = createPlayer();
  suite.equal(player.state, 'walk');
  suite.equal(player.currentFrame, 0);
  suite.equal(player.frameCount, 4);
  suite.equal(player.isPlaying, false);
  suite.ok(player.fps >= MIN_FPS && player.fps <= MAX_FPS);
});

suite.test('setAnimation 切换动作并归零帧指针，多帧动作自动播放', () => {
  const player = createPlayer();
  player.seek(3);
  player.setAnimation('attack');
  suite.equal(player.state, 'attack');
  suite.equal(player.currentFrame, 0);
  suite.ok(player.isPlaying, '多帧动作切换后应自动播放');
  suite.equal(player.fps, 8, '动作自带帧率应生效');
});

suite.test('setAnimation 拒绝未定义状态', () => {
  const player = createPlayer();
  suite.throws(() => player.setAnimation('idle'), '未定义的动画状态');
});

suite.test('setFps 将帧率钳制在 1~24', () => {
  const player = createPlayer();
  suite.equal(player.setFps(30), MAX_FPS);
  suite.equal(player.setFps(0), MIN_FPS);
  suite.equal(player.setFps(12), 12);
  suite.equal(player.setFps('abc'), 6, '非法值回落到默认帧率');
});

suite.test('Walk 循环：越过尾帧回卷到首帧', () => {
  const player = createPlayer();
  player.setAnimation('walk');
  player.advance(1);
  suite.equal(player.currentFrame, 1);
  player.advance(3);
  suite.equal(player.currentFrame, 0, '4 帧循环应回到 0');
  player.advance(-1);
  suite.equal(player.currentFrame, 3, '反向步进应回卷到末帧');
});

suite.test('Death 不循环：停在最后一帧并停止播放', () => {
  const player = createPlayer();
  player.setAnimation('death');
  suite.equal(player.advance(1), 1);
  suite.equal(player.currentFrame, 1);
  player.advance(5);
  suite.equal(player.currentFrame, 2, '不得越过最后一帧');
  suite.equal(player.isPlaying, false, '单次动作播完必须停止');
  suite.ok(player.isFinished);
});

suite.test('step 按 FPS 累积推进帧指针', () => {
  const player = createPlayer();
  player.setAnimation('walk');
  player.setFps(10); // 100ms / 帧
  suite.equal(player.step(50), 0, '不足一帧不应推进');
  suite.equal(player.step(50), 1, '累计 100ms 推进一帧');
  suite.equal(player.currentFrame, 1);
  suite.equal(player.step(250), 2, '250ms 应推进两帧');
  suite.equal(player.currentFrame, 3);
});

suite.test('step 在暂停状态下不推进', () => {
  const player = createPlayer();
  player.setAnimation('walk');
  player.pause();
  suite.equal(player.step(1000), 0);
  suite.equal(player.currentFrame, 0);
});

suite.test('step 对非循环动作在末帧停止且不越界', () => {
  const player = createPlayer();
  player.setAnimation('attack');
  player.setFps(24);
  let guard = 0;
  while (player.isPlaying && guard < 100) {
    player.step(1000);
    guard += 1;
  }
  suite.equal(player.currentFrame, 2);
  suite.equal(player.isPlaying, false);
  suite.equal(player.step(1000), 0, '停止后 step 不应继续推进');
});

suite.test('play/pause/toggle 控制播放状态', () => {
  const player = createPlayer();
  player.setAnimation('walk');
  player.pause();
  suite.notOk(player.isPlaying);
  player.play();
  suite.ok(player.isPlaying);
  suite.equal(player.toggle(), false);
  suite.equal(player.toggle(), true);
});

suite.test('已播完的单次动作再次 play 时重头开始', () => {
  const player = createPlayer();
  player.setAnimation('death');
  player.advance(10);
  suite.equal(player.currentFrame, 2);
  player.play();
  suite.equal(player.currentFrame, 0, '重播应归零');
  suite.ok(player.isPlaying);
});

suite.test('逐帧步进 nextFrame / prevFrame 会暂停播放', () => {
  const player = createPlayer();
  player.setAnimation('walk');
  suite.ok(player.isPlaying);
  player.nextFrame();
  suite.equal(player.currentFrame, 1);
  suite.equal(player.isPlaying, false, '手动步进应暂停');
  player.prevFrame();
  suite.equal(player.currentFrame, 0);
});

suite.test('洋葱皮索引：循环动作首尾相接', () => {
  const player = createPlayer();
  player.setAnimation('walk');
  suite.deepEqual(player.getOnionFrames(), { prev: 3, next: 1 });
  player.seek(2);
  suite.deepEqual(player.getOnionFrames(), { prev: 1, next: 3 });
});

suite.test('洋葱皮索引：非循环动作端点返回 null', () => {
  const player = createPlayer();
  player.setAnimation('death');
  suite.deepEqual(player.getOnionFrames(), { prev: null, next: 1 });
  player.seek(2);
  suite.deepEqual(player.getOnionFrames(), { prev: 1, next: null });
});

suite.test('洋葱皮开关', () => {
  const player = createPlayer();
  suite.equal(player.onionSkin, false);
  suite.equal(player.toggleOnionSkin(), true);
  suite.equal(player.toggleOnionSkin(false), false);
  suite.equal(player.toggleOnionSkin(), true);
});

suite.test('帧配置支持 frames 数组形式', () => {
  const player = new AnimationPlayer({
    animations: { idle: { frames: [0, 1, 2, 3, 4, 5], loop: true } }
  });
  suite.equal(player.frameCount, 6);
});

suite.test('renderCurrentFrame 以 25% 透明度先绘制前后帧，再绘制当前帧', () => {
  const player = createPlayer();
  player.setAnimation('walk');
  player.seek(1);
  player.toggleOnionSkin(true);
  const ctx = createFakeCtx();
  const images = { 0: { id: 0 }, 1: { id: 1 }, 2: { id: 2 } };
  player.renderCurrentFrame(ctx, 4, false, {
    getFrame: (state, index) => images[index],
    width: 32,
    height: 32
  });
  suite.equal(ctx.calls.length, 3, '应绘制前帧、后帧、当前帧共 3 次');
  suite.equal(ctx.calls[0].image.id, 0, '先画前一帧');
  suite.equal(ctx.calls[0].alpha, ONION_ALPHA, '洋葱皮前后帧透明 25%');
  suite.equal(ctx.calls[1].image.id, 2, '再画后一帧');
  suite.equal(ctx.calls[1].alpha, ONION_ALPHA);
  suite.equal(ctx.calls[2].image.id, 1, '最后画当前帧');
  suite.equal(ctx.calls[2].alpha, 1, '当前帧必须 100% 不透明');
  suite.equal(ctx.calls[2].width, 128, '4x 放大后宽度应为 128');
  suite.equal(ctx.imageSmoothingEnabled, false, '必须关闭插值保持硬边');
});

suite.test('renderCurrentFrame 关闭洋葱皮时只绘制当前帧', () => {
  const player = createPlayer();
  player.setAnimation('walk');
  player.toggleOnionSkin(false);
  const ctx = createFakeCtx();
  player.renderCurrentFrame(ctx, 6, false, {
    getFrame: (state, index) => ({ id: index }),
    width: 32,
    height: 32
  });
  suite.equal(ctx.calls.length, 1);
  suite.equal(ctx.calls[0].alpha, 1);
  suite.equal(ctx.calls[0].width, 192, '6x 放大后宽度应为 192');
});

suite.test('renderCurrentFrame 在开启网格时绘制标尺且不影响当前帧透明度', () => {
  const player = createPlayer();
  player.setAnimation('walk');
  const ctx = createFakeCtx();
  let strokes = 0;
  ctx.stroke = () => {
    strokes += 1;
  };
  player.renderCurrentFrame(ctx, 2, true, {
    getFrame: (state, index) => ({ id: index }),
    width: 16,
    height: 16
  });
  suite.equal(ctx.calls[0].alpha, 1);
  suite.ok(strokes > 0, '网格应产生描边');
});

export default suite;

if (isDirectRun(import.meta.url)) {
  await finish(suite);
}
