// 시작점: 상태를 만들고 "입력 → 업데이트 → 그리기"를 반복한다.
// 게임 세계는 320x192 캔버스에 그린 뒤 3배로 키우고, UI 는 큰 화면에 바로 그린다.

(function () {
  const { WIDTH, HEIGHT, SCALE } = Game.CONFIG;

  const screen = document.getElementById('game');
  screen.width = WIDTH * SCALE;
  screen.height = HEIGHT * SCALE;
  const screenCtx = screen.getContext('2d');
  screenCtx.imageSmoothingEnabled = false;

  const world = document.createElement('canvas');
  world.width = WIDTH;
  world.height = HEIGHT;
  const worldCtx = world.getContext('2d');

  const state = Game.createState('lodging');
  Game.state = state; // 브라우저 콘솔에서 Game.state 로 확인 가능

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, Game.CONFIG.MAX_DT);
    last = now;

    Game.update(state, Game.Input, dt);

    Game.Render.draw(worldCtx, state);
    screenCtx.drawImage(world, 0, 0, screen.width, screen.height);
    Game.Render.drawUI(screenCtx, state, now);

    Game.Input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
