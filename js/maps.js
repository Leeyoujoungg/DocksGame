// 맵 데이터만 담는다. 측면(옆에서 본) 시점의 방 단면이다.
// - floorY: 바닥 높이 (픽셀). 사람과 가구는 이 선 위에 선다
// - objects: 가구와 장애물. solid 가 false 면 뒤쪽 배경 가구라서 앞을 지나간다.
//            solid 가 true 면 앞을 막는 장애물(점프로 넘거나 위에 올라설 수 있음)
//   서랍장·옷장은 오브젝트로 분리해 두어서 나중에 "조사하기" 기능을 바로 붙일 수 있다.
// - door: 문 앞에서 E 를 누르면 to 맵의 spawnX 위치로 이동
// - npcs: 대화할 수 있는 인물 (대사는 dialogues.js)

// 숙소는 화면 한 장 크기 → 화면 가로가 넓어지면 방도 같이 넓어진다 (오른쪽 벽·문·창문이 따라감)
const ROOM_W = Game.CONFIG.WIDTH;

Game.MAPS = {
  lodging: {
    name: '숙소',
    style: 'room',
    floorY: 150,
    ceilingY: 14,
    bounds: { left: 12, right: ROOM_W - 12 }, // 좌우 벽 안쪽 경계

    // 뒷벽의 창문. 여기서 빛줄기가 비스듬히 바닥으로 떨어진다
    windows: [
      { x: 60,  y: 40, w: 36, h: 40 },
      { x: ROOM_W - 124, y: 40, w: 36, h: 40 },
    ],
    // 뒷벽의 문 → 부둣가 (가방을 챙겨야 나갈 수 있다)
    door: { x: ROOM_W - 46, w: 26, h: 50, to: 'dock', spawnX: 45, label: '부둣가로 나가기', requires: 'bag' },
    npcs: [],

    // 줍을 수 있는 물건
    items: [
      { id: 'bag', type: 'bag', x: 62, w: 14, h: 11, label: '가방 챙기기' }, // 심부름꾼 가방
    ],

    // x 는 왼쪽 끝, y 를 생략하면 바닥 위에 놓인다. 크기는 픽셀.
    // 숙소 안에는 점프로 넘어야 하는 장애물이 없다
    objects: [
      { id: 'wardrobe', type: 'wardrobe', x: 18,  w: 34, h: 54, solid: false }, // 옷장
      { id: 'drawer',   type: 'drawer',   x: 100, w: 32, h: 26, solid: false }, // 서랍장
      { id: 'desk',     type: 'desk',     x: 150, w: 38, h: 20, solid: false }, // 책상
      { id: 'chair',    type: 'chair',    x: 176, w: 13, h: 22, solid: false }, // 의자
      { id: 'bed',      type: 'bed',      x: 206, w: 56, h: 22, solid: false }, // 침대
    ],

    // 플레이어 시작 위치 (x 만, 바닥 위에 선다) — 침대에서 막 일어난 자리
    spawn: { x: 196 },
  },

  dock: {
    name: '부둣가',
    style: 'dock',
    width: 640,                      // 화면 두 장 너비 → 카메라가 플레이어를 따라 오른쪽으로 이동
    floorY: 150,
    ceilingY: 0,                     // 바깥이라 천장 없음
    bounds: { left: 4, right: 636 }, // 맵 양 끝
    horizonY: 98,                    // 바다 수평선
    windows: [],
    boat: { x: 196, w: 58 },         // 부두 옆에 묶인 어부의 배 (배경)
    lighthouse: { x: 592, headlandX: 468 }, // 오른쪽 끝 곶 위의 등대 (배경)
    // 왼쪽 숙소 건물의 문 → 숙소
    door: { x: 34, w: 22, h: 40, to: 'lodging', spawnX: ROOM_W - 33, label: '숙소로 들어가기' },

    // search: 랜턴을 찾는 동안(퀘스트 진행 중)에만 E 로 조사할 수 있는 물건. lantern: true 인 곳에 랜턴이 있다
    objects: [
      { id: 'dockCrate1', type: 'crate',  x: 96,  w: 15, h: 15, solid: true,
        search: { text: '(낡은 상자다. 빈 병만 굴러다닌다.)' } },
      { id: 'dockNet',    type: 'net',    x: 168, w: 28, h: 11, solid: false,
        search: { text: '(그물 더미다. 비린내만 난다.)' } },
      { id: 'dockPost1',  type: 'post',   x: 236, w: 6,  h: 14, solid: false }, // 계류 기둥 (배를 묶음)
      { id: 'dockBarrel', type: 'barrel', x: 300, w: 14, h: 18, solid: true,
        search: { text: '(통 안에는 빗물만 고여 있다.)' } },
      { id: 'dockCrate2', type: 'crate',  x: 380, w: 15, h: 15, solid: true,
        search: { text: '(밧줄 뭉치뿐이다.)' } },
      { id: 'dockCrate3', type: 'crate',  x: 395, w: 15, h: 15, solid: true,
        search: { lantern: true } },
      { id: 'dockPost2',  type: 'post',   x: 450, w: 6,  h: 14, solid: false },
      { id: 'dockBarrel2',type: 'barrel', x: 600, w: 14, h: 18, solid: false,
        search: { text: '(등대에 쓰는 기름통이다.)' } },
    ],

    npcs: [
      { id: 'fisher', x: 140, facing: 'right' }, // 어부: 배 앞, 대화만 하는 NPC
      { id: 'keeper', x: 540, facing: 'left' },  // 등대지기: 등대 아래, 퀘스트를 줄 NPC
    ],

    spawn: { x: 45 },
  },
};
