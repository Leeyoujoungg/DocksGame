// 키보드 입력만 담당한다. 게임 상태를 직접 바꾸지 않는다.
// e.code 를 쓰므로 한글 입력 상태(ㅈㅁㄴㅇ)에서도 WASD 가 동작한다.

Game.Input = (function () {
  const held = new Set();
  const pressedOnce = new Set(); // 이번 프레임에 새로 눌린 키

  const GAME_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'Digit1', 'Space'];

  window.addEventListener('keydown', (e) => {
    if (!GAME_KEYS.includes(e.code)) return;
    e.preventDefault();
    if (!held.has(e.code)) pressedOnce.add(e.code);
    held.add(e.code);
  });

  window.addEventListener('keyup', (e) => held.delete(e.code));

  // 다른 창을 누르면 키가 눌린 채로 남는 문제 방지
  window.addEventListener('blur', () => held.clear());

  return {
    // 이동 방향 (-1, 0, 1)
    axis() {
      return {
        x: (held.has('KeyD') ? 1 : 0) - (held.has('KeyA') ? 1 : 0),
        y: (held.has('KeyS') ? 1 : 0) - (held.has('KeyW') ? 1 : 0),
      };
    },
    wasPressed(code) {
      return pressedOnce.has(code);
    },
    // 매 프레임 끝에 호출
    endFrame() {
      pressedOnce.clear();
    },
  };
})();
