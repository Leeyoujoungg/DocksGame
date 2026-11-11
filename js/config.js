// 게임 전체에서 공유하는 설정값. 숫자를 바꿀 때는 여기만 고치면 된다.
window.Game = window.Game || {};

Game.CONFIG = {
  WIDTH: 320,         // 논리 해상도
  HEIGHT: 192,
  SCALE: 3,           // 화면에서는 3배로 키워 보여준다 (글자는 이 해상도로 선명하게)

  INTERACT_RANGE: 22, // NPC·문과 이 거리(px) 안에 있어야 E 로 상호작용

  // 측면 시점 이동
  MOVE_SPEED: 70,     // 좌우 이동 속도 (초당 픽셀)
  JUMP_ENABLED: true, // 상자 같은 장애물을 넘기 위한 점프(Space). false 로 끌 수 있다
  JUMP_SPEED: 185,    // 점프 순간 위로 향하는 속도 → 약 24px 높이
  GRAVITY: 700,       // 초당 아래로 더해지는 속도
  MAX_FALL: 400,

  MAX_DT: 0.05,       // 탭 전환 후 순간이동 방지용 프레임 시간 상한
  WALK_FPS: 8,        // 걷기 애니메이션 속도

  // DO NOT LOSE: 이 2색 외에는 쓰지 않는다
  COLORS: {
    dark: '#333319',
    light: '#E5FFFF',
  },
};
