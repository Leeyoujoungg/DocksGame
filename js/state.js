// 게임 상태(데이터)만 담는다. 그리는 코드는 여기 없다.
// 다음 단계에서 NPC, 퀘스트, 인벤토리도 이 객체에 추가한다.

Game.createState = function (mapId = 'lodging') {
  const state = {
    mapId,
    player: {
      x: 0, y: 0,        // 그림의 왼쪽 위 (픽셀)
      w: 16, h: 35,      // 그림 크기
      hitbox: { x: 4, y: 1, w: 8, h: 34 },
      vx: 0, vy: 0,
      onGround: false,
      facing: 'right',   // left | right
      moving: false,
      animTime: 0,       // 걷기 애니메이션 시간
    },
    solids: [],          // 벽, 바닥, 천장 (맵을 불러올 때 생성)
    entities: [],        // 가구·장애물 (3단계~: NPC 도 여기에 추가)
    flags: {},           // 5단계~: 퀘스트 진행 상태
    inventory: [],       // 6단계~: 획득한 아이템
    ui: {
      mode: 'explore',   // explore | dialogue
      promptTarget: null,// 지금 E 로 상호작용할 수 있는 엔티티 id ("E 대화하기" 표시용)
      dialogue: null,    // 대화 중일 때: { npcId, name, pages, page }
      debug: false,      // 1 키: 충돌 영역 보기
    },
  };
  Game.loadMap(state, mapId);
  return state;
};

// 맵을 불러와 벽·오브젝트를 만들고 플레이어를 시작 위치에 둔다.
// 2단계에서 문을 지나 맵을 바꿀 때도 이 함수를 쓴다.
Game.loadMap = function (state, mapId, spawnX) {
  const { WIDTH, HEIGHT } = Game.CONFIG;
  const map = Game.MAPS[mapId];
  state.mapId = mapId;

  // 방의 벽, 바닥, 천장은 통과할 수 없다 → 화면 밖으로도 나갈 수 없다
  state.solids = [
    { x: 0, y: 0, w: map.bounds.left, h: HEIGHT },                               // 왼쪽 벽
    { x: map.bounds.right, y: 0, w: WIDTH - map.bounds.right, h: HEIGHT },       // 오른쪽 벽
    { x: 0, y: map.floorY, w: WIDTH, h: HEIGHT - map.floorY },                   // 바닥
    { x: 0, y: 0, w: WIDTH, h: map.ceilingY },                                   // 천장
  ];

  state.entities = map.objects.map((o) => ({
    id: o.id,
    kind: 'object',
    type: o.type,
    x: o.x,
    y: o.y !== undefined ? o.y : map.floorY - o.h,
    w: o.w,
    h: o.h,
    solid: o.solid,
  }));

  // 문: 통과 가능, 앞에서 E 를 누르면 다른 맵으로 이동
  if (map.door && map.door.to) {
    const d = map.door;
    state.entities.push({
      id: `door:${mapId}`,
      kind: 'door',
      x: d.x, y: map.floorY - d.h, w: d.w, h: d.h,
      solid: false,
      to: d.to,
      spawnX: d.spawnX,
      interact: { label: d.label },
    });
  }

  // NPC: 통과 가능, 가까이에서 E 를 누르면 대화
  for (const n of map.npcs || []) {
    state.entities.push({
      id: n.id,
      kind: 'npc',
      x: n.x, y: map.floorY - 35, w: 16, h: 35,
      solid: false,
      facing: n.facing || 'left',
      interact: { label: '대화하기' },
    });
  }

  state.ui.promptTarget = null;

  const p = state.player;
  p.x = (spawnX !== undefined ? spawnX : map.spawn.x) - p.w / 2;
  p.y = map.floorY - p.h;
  p.vx = 0;
  p.vy = 0;
  p.onGround = true;
};

Game.currentMap = function (state) {
  return Game.MAPS[state.mapId];
};
