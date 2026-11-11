// 맵 데이터만 담는다. 측면(옆에서 본) 시점의 방 단면이다.
// - floorY: 바닥 높이 (픽셀). 사람과 가구는 이 선 위에 선다
// - objects: 가구와 장애물. solid 가 false 면 뒤쪽 배경 가구라서 앞을 지나간다.
//            solid 가 true 면 앞을 막는 장애물(점프로 넘거나 위에 올라설 수 있음)
//   서랍장·옷장은 오브젝트로 분리해 두어서 나중에 "조사하기" 기능을 바로 붙일 수 있다.
// - door: 문 앞에서 E 를 누르면 to 맵의 spawnX 위치로 이동
// - npcs: 대화할 수 있는 인물 (대사는 dialogues.js)

Game.MAPS = {
  lodging: {
    name: '숙소',
    style: 'room',
    floorY: 150,
    ceilingY: 14,
    bounds: { left: 12, right: 308 }, // 좌우 벽 안쪽 경계

    // 뒷벽의 창문. 여기서 빛줄기가 비스듬히 바닥으로 떨어진다
    windows: [
      { x: 60,  y: 40, w: 36, h: 40 },
      { x: 196, y: 40, w: 36, h: 40 },
    ],
    // 뒷벽의 문 → 부둣가
    door: { x: 274, w: 26, h: 50, to: 'dock', spawnX: 45, label: '부둣가로 나가기' },
    npcs: [],

    // x 는 왼쪽 끝, y 를 생략하면 바닥 위에 놓인다. 크기는 픽셀.
    objects: [
      { id: 'wardrobe', type: 'wardrobe', x: 18,  w: 34, h: 54, solid: false }, // 옷장
      { id: 'drawer',   type: 'drawer',   x: 100, w: 32, h: 26, solid: false }, // 서랍장
      { id: 'crate1',   type: 'crate',    x: 140, w: 15, h: 15, solid: true  }, // 상자 (장애물)
      { id: 'desk',     type: 'desk',     x: 160, w: 38, h: 20, solid: false }, // 책상
      { id: 'chair',    type: 'chair',    x: 186, w: 13, h: 22, solid: false }, // 의자
      { id: 'bed',      type: 'bed',      x: 206, w: 56, h: 22, solid: false }, // 침대
      { id: 'barrel1',  type: 'barrel',   x: 254, w: 14, h: 18, solid: true  }, // 통 (장애물)
    ],

    // 플레이어 시작 위치 (x 만, 바닥 위에 선다)
    spawn: { x: 70 },
  },

  dock: {
    name: '부둣가',
    style: 'dock',
    floorY: 150,
    ceilingY: 0,                     // 바깥이라 천장 없음
    bounds: { left: 4, right: 316 }, // 화면 양 끝
    horizonY: 98,                    // 바다 수평선
    windows: [],
    // 왼쪽 숙소 건물의 문 → 숙소
    door: { x: 34, w: 22, h: 40, to: 'lodging', spawnX: 287, label: '숙소로 들어가기' },

    objects: [
      { id: 'dockCrate1', type: 'crate',  x: 96,  w: 15, h: 15, solid: true  }, // 상자 (장애물)
      { id: 'dockPost1',  type: 'post',   x: 150, w: 6,  h: 14, solid: false }, // 계류 기둥
      { id: 'dockNet',    type: 'net',    x: 116, w: 28, h: 11, solid: false }, // 그물 더미
      { id: 'dockBarrel', type: 'barrel', x: 290, w: 14, h: 18, solid: true  }, // 통 (장애물)
    ],

    npcs: [
      { id: 'fisher', x: 190, facing: 'left' }, // 어부: 대화만 하는 NPC
      { id: 'keeper', x: 258, facing: 'left' }, // 등대지기: 퀘스트를 줄 NPC (퀘스트는 다음 단계)
    ],

    spawn: { x: 45 },
  },
};
