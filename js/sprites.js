// 2색 + 디더링 규칙으로 임시 그림을 코드로 그린다. (측면 시점)
// 명암 규칙: 바탕은 밝은색, 그늘진 곳에만 어두운 점을 찍는다.
// 나중에 진짜 그림으로 바꿀 때는 이 파일만 교체하면 된다.

Game.Sprites = (function () {
  const { COLORS } = Game.CONFIG;

  // 4x4 Bayer 행렬: 같은 밀도라도 점이 고르게 퍼지게 해준다
  const BAYER = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];
  // (x, y) 위치에 밀도 density(0~1)로 어두운 점을 찍어야 하는지
  const dotAt = (x, y, density) => BAYER[y & 3][x & 3] < density * 16;

  // 작은 캔버스 위에 2색 픽셀만 찍는 도구
  function makeCanvas(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const p = {
      w, h, ctx,
      rect(x, y, rw, rh, color = 'dark') {
        ctx.fillStyle = COLORS[color];
        ctx.fillRect(x, y, rw, rh);
      },
      px(x, y, color = 'dark') { this.rect(x, y, 1, 1, color); },
      // 1px 외곽선
      box(x, y, rw, rh, color = 'dark') {
        this.rect(x, y, rw, 1, color);
        this.rect(x, y + rh - 1, rw, 1, color);
        this.rect(x, y, 1, rh, color);
        this.rect(x + rw - 1, y, 1, rh, color);
      },
      // 밝은 면 + 외곽선
      panel(x, y, rw, rh) { this.rect(x, y, rw, rh, 'light'); this.box(x, y, rw, rh); },
      // 점 그늘: density 0~1 = 어두운 점의 비율. 그라데이션(옅어지는 부분)에만 쓴다
      shade(x, y, rw, rh, density) {
        ctx.fillStyle = COLORS.dark;
        for (let yy = y; yy < y + rh; yy++) {
          for (let xx = x; xx < x + rw; xx++) {
            if (dotAt(xx, yy, density)) ctx.fillRect(xx, yy, 1, 1);
          }
        }
      },
      // 세로 그라데이션: 위 from → 아래 to 밀도로 점이 변한다
      fade(x, y, rw, rh, from, to) {
        for (let i = 0; i < rh; i++) {
          const t = rh === 1 ? 0 : i / (rh - 1);
          this.shade(x, y + i, rw, 1, from + (to - from) * t);
        }
      },
      // 그림자: 진한 부분은 면(꽉 찬 어두운색), 가장자리 edge 줄만 점으로 옅어진다
      shadow(x, y, rw, rh, edge = 2) {
        this.fade(x, y, rw, edge, 0.25, 0.75);
        this.rect(x, y + edge, rw, rh - edge, 'dark');
      },
    };
    draw(p);
    return c;
  }

  // 글자로 그린 픽셀 그림을 캔버스로 바꾼다
  //   '#' 어두운색   'o' 밝은색   ':' 진한 그늘(점 50%)   ',' 옅은 그늘(점 25%)   '.' 투명
  function fromPixels(rows) {
    return makeCanvas(rows[0].length, rows.length, (p) => {
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch === '#') p.px(x, y, 'dark');
          else if (ch === 'o') p.px(x, y, 'light');
          else if (ch === ':') p.px(x, y, dotAt(x, y, 0.5) ? 'dark' : 'light');
          else if (ch === ',') p.px(x, y, dotAt(x, y, 0.25) ? 'dark' : 'light');
        }
      });
    });
  }

  function flipped(src) {
    return makeCanvas(src.width, src.height, (p) => {
      p.ctx.translate(src.width, 0);
      p.ctx.scale(-1, 1);
      p.ctx.drawImage(src, 0, 0);
    });
  }

  // ================= 사람 (심부름꾼) 16 x 35, 오른쪽을 보는 옆모습 =================
  // 납작모자 · 뒷머리 · 귀 · 눈 · 코 · 턱 / 외투 · 허리띠 / 바지 · 장화 / 크로스백
  // 실루엣이 잘 읽히도록: 모자·머리·바지·장화는 진하게, 얼굴·외투는 밝게
  const BODY = [
    '.....######.....', //  0 모자 윗부분
    '....########....', //  1
    '...##########...', //  2
    '...#############', //  3 모자 띠 + 앞챙
    '...##oooooooo#..', //  4 뒷머리(##) + 이마
    '...##ooooo#oo#..', //  5 눈
    '...#o#oooooooo#.', //  6 귀 + 코
    '...##oooooooo#..', //  7 뒷머리
    '....#oooooo##...', //  8 입·턱선
    '.....#ooooo#....', //  9 턱
    '......#ooo#.....', // 10 목
    '....#########...', // 11 옷깃
    '...#,,oooooo#...', // 12 외투 (등 쪽은 옅은 그늘)
    '..#,,,oooooo#...', // 13
    '..#,,,oooooo#...', // 14
    '..#,,,oooooo#...', // 15
    '..#,,,oooooo#...', // 16
    '..#,,,oooooo#...', // 17
    '..##########....', // 18 허리띠
    '..#,,,oooooo#...', // 19
    '..#,,,ooooooo#..', // 20 외투 자락
    '..#:::,oooooo#..', // 21
    '..############..', // 22 외투 끝단
  ];

  // 다리: 서 있기 / 걷기(보폭 벌림). 바지는 진하게, 두 다리 사이만 밝은 선
  const LEGS_STAND = [
    '....########....', // 23 골반
    '....###o####....',
    '....###o####....',
    '....###o####....',
    '....###o####....',
    '....###o####....',
    '....###o####....',
    '....###o####....',
    '....###o####....',
    '....###o####....', // 32
    '....##########..', // 33 장화 (앞코가 앞으로)
    '....##########..', // 34
  ];
  const LEGS_STRIDE = [
    '....########....',
    '...#########....',
    '...####.#####...',
    '..####...####...',
    '..####...#####..',
    '..####....####..',
    '.####.....####..',
    '.####......####.',
    '.####......####.',
    '.####......####.',
    '#####......#####',
    '#####......#####',
  ];

  // 팔 (12번 줄부터 겹쳐 그림): 내림 / 앞으로 흔듦
  const ARM_DOWN = [
    '......#oo#......',
    '......#oo#......',
    '......#oo#......',
    '......#oo#......',
    '......#oo#......',
    '......#oo#......',
    '......#oo#......',
    '......#oo#......',
    '......#oo#......',
    '.......##.......',
  ];
  const ARM_SWING = [
    '......#oo#......',
    '......#ooo#.....',
    '.......#oo#.....',
    '.......#ooo#....',
    '........#oo#....',
    '........#ooo#...',
    '.........#oo#...',
    '.........#oo#...',
    '.........#oo#...',
    '..........##....',
  ];

  // 크로스백 (등 쪽 허리, 16번 줄부터) + 어깨끈
  const BAG = [
    '#####...........',
    '#ooo#...........',
    '#####...........',
    '#ooo#...........',
    '#####...........',
  ];
  const STRAP = [[8, 12], [7, 13], [6, 14], [5, 15]];

  function overlay(base, layer, top) {
    layer.forEach((row, i) => {
      const y = top + i;
      const chars = base[y].split('');
      for (let x = 0; x < row.length; x++) if (row[x] !== '.') chars[x] = row[x];
      base[y] = chars.join('');
    });
  }

  // withBag: 가방을 챙긴 뒤에만 크로스백과 어깨끈이 보인다
  function personFrame(legs, arm, withBag) {
    const rows = BODY.concat(legs);
    if (withBag) {
      STRAP.forEach(([x, y]) => {
        const chars = rows[y].split('');
        chars[x] = '#';
        rows[y] = chars.join('');
      });
      overlay(rows, BAG, 16);
    }
    overlay(rows, arm, 12);
    return fromPixels(rows);
  }

  function playerSet(withBag) {
    const stand = personFrame(LEGS_STAND, ARM_DOWN, withBag);
    const stride = personFrame(LEGS_STRIDE, ARM_SWING, withBag);
    // 걷기 순서: 보폭 → 모음 → 보폭 → 모음
    const walkRight = [stride, stand, stride, stand];
    return {
      right: { stand, walk: walkRight, air: stride },
      left: { stand: flipped(stand), walk: walkRight.map(flipped), air: flipped(stride) },
    };
  }

  const player = { bag: playerSet(true), noBag: playerSet(false) };

  // ================= NPC: 어부 16 x 35 =================
  // 털모자 · 수염 · 긴 비옷 · 장화 — 플레이어와 실루엣이 달라 보이도록
  const FISHER = [
    '................', //  0
    '.....######.....', //  1 털모자
    '....########....', //  2
    '...##########...', //  3
    '...#o#o#o#o##...', //  4 모자 골지 무늬
    '...##oooooo#....', //  5 뒷머리 + 이마
    '...##oooo#oo#...', //  6 눈
    '...#o#ooooooo#..', //  7 귀 + 코
    '...##o#######...', //  8 수염 시작
    '....#########...', //  9 수염
    '.....#######....', // 10
    '......#####.....', // 11
    '....#########...', // 12 비옷 깃
    '...#,,oooooo#...', // 13 긴 비옷
    '..#,,,oooooo#...', // 14
    '..#,,,ooo#oo#...', // 15 단추
    '..#,,,oooooo#...', // 16
    '..#,,,oooooo#...', // 17
    '..#,,,ooo#oo#...', // 18 단추
    '..#,,,oooooo#...', // 19
    '..#,,,oooooo#...', // 20
    '..#,,,ooo#oo#...', // 21 단추
    '..#,,,ooooooo#..', // 22
    '..#:::,oooooo#..', // 23
    '..#:::,ooooooo#.', // 24 비옷 자락
    '..#:::,ooooooo#.', // 25
    '..#############.', // 26 끝단
    '....###o####....', // 27 바지
    '....###o####....',
    '....###o####....',
    '....###o####....',
    '....###o####....',
    '....###o####....', // 32
    '....##########..', // 33 장화
    '....##########..', // 34
  ];

  function npcFrame(rows, armTop) {
    const copy = rows.slice();
    overlay(copy, ARM_DOWN, armTop);
    return fromPixels(copy);
  }

  const fisherRight = npcFrame(FISHER, 13);

  // ================= NPC: 등대지기 16 x 35 =================
  // 벗어진 머리 + 흰 옆머리 · 동그란 안경 · 콧수염 · 목도리 · 지팡이
  const KEEPER = [
    '................', //  0
    '................', //  1
    '.....#####......', //  2 벗어진 정수리
    '....#ooooo#.....', //  3
    '...#ooooooo#....', //  4
    '...#,,ooooo#....', //  5 흰 옆머리 (옅은 점)
    '...#,,oo###o#...', //  6 안경테
    '...#o#oo#o#oo#..', //  7 귀 + 안경알
    '...#,,oo###ooo#.', //  8 코
    '...#,ooo####o#..', //  9 콧수염
    '....#ooooooo#...', // 10 턱
    '.....#ooooo#....', // 11
    '...##########...', // 12 목도리
    '...##########...', // 13
    '..#,,####oooo#..', // 14 목도리 끝
    '..#,,,oo#ooo#...', // 15 두 줄 단추 외투
    '..#,,,oooooo#...', // 16
    '..#,,,oo#ooo#...', // 17
    '..#,,,oooooo#...', // 18
    '..#,,,oo#ooo#...', // 19
    '..##########....', // 20 허리띠
    '..#,,,oooooo#...', // 21
    '..#,,,ooooooo#..', // 22
    '..#:::,oooooo#..', // 23
    '..############..', // 24 외투 끝단
    '....###o####....', // 25 바지
    '....###o####....',
    '....###o####....',
    '....###o####....',
    '....###o####....',
    '....###o####....',
    '....###o####....',
    '....###o####....', // 32
    '....##########..', // 33 장화
    '....##########..', // 34
  ];

  function keeperFrame() {
    const rows = KEEPER.slice();
    overlay(rows, ARM_SWING, 13);               // 앞으로 내민 팔 → 지팡이를 짚음
    for (let y = 22; y < 35; y++) {             // 지팡이
      const chars = rows[y].split('');
      chars[12] = '#';
      rows[y] = chars.join('');
    }
    const top = rows[22].split('');
    top[11] = '#'; top[13] = '#';               // 지팡이 손잡이
    rows[22] = top.join('');
    return fromPixels(rows);
  }

  const keeperRight = keeperFrame();
  const npc = {
    fisher: { right: fisherRight, left: flipped(fisherRight) },
    keeper: { right: keeperRight, left: flipped(keeperRight) },
  };

  // ================= 초상화: 정면 상반신, 증명사진 느낌 (40 x 48) =================
  // 빛은 왼쪽에서 → 얼굴·옷의 오른쪽이 그림자(면), 넘어가는 경계만 점
  // 표정(expr): normal | smile | worried
  const PW = 40;
  const PH = 48;
  const FACE = { cx: 20, cy: 22, rx: 9, ry: 11 };

  // 타원 한 줄씩 [y, 왼쪽 x, 오른쪽 x]
  function ellipseRows(cx, cy, rx, ry) {
    const rows = [];
    for (let y = cy - ry; y <= cy + ry; y++) {
      const t = (y - cy) / ry;
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
      rows.push([y, cx - half, cx + half]);
    }
    return rows;
  }

  // 밝은 면 + 외곽선 + 오른쪽 그림자(면 2px, 점 2px)
  function litShape(p, rows, shadowW = 2) {
    let prev = null;
    for (const [y, x0, x1] of rows) {
      p.rect(x0, y, x1 - x0 + 1, 1, 'light');
      p.rect(x1 - shadowW, y, shadowW, 1);
      p.shade(x1 - shadowW - 2, y, 2, 1, 0.5);
      // 외곽선 (줄 사이 끊김 없이)
      if (prev) {
        p.rect(Math.min(prev[1], x0), y, Math.abs(prev[1] - x0) + 1, 1);
        p.rect(Math.min(prev[2], x1), y, Math.abs(prev[2] - x1) + 1, 1);
      } else {
        p.rect(x0, y, x1 - x0 + 1, 1);
      }
      p.px(x0, y); p.px(x1, y);
      prev = [y, x0, x1];
    }
    if (prev) p.rect(prev[1], prev[0], prev[2] - prev[1] + 1, 1);
  }

  function drawBody(p) {
    // 어깨: 아래로 넓어지는 사다리꼴
    const rows = [];
    for (let y = 37; y < PH; y++) {
      const half = Math.min(17, 8 + (y - 37) * 2);
      rows.push([y, 20 - half, 20 + half]);
    }
    litShape(p, rows, 4);
    // 목
    p.rect(16, 31, 9, 7, 'light');
    p.rect(16, 31, 1, 7); p.rect(24, 31, 1, 7);
    p.rect(22, 33, 2, 5);                       // 목 오른쪽 그림자(면)
    p.rect(17, 33, 7, 1);                       // 턱 밑 그림자(면)
    p.shade(17, 34, 5, 2, 0.5);                 //   └ 경계는 점
  }

  function drawFeatures(p, expr) {
    // 눈썹
    if (expr === 'worried') {
      p.px(14, 19); p.px(15, 19); p.px(16, 18); p.px(17, 17);
      p.px(23, 17); p.px(24, 18); p.px(25, 19); p.px(26, 19);
    } else {
      const by = expr === 'smile' ? 17 : 18;
      p.rect(14, by, 4, 1); p.rect(23, by, 4, 1);
    }
    // 눈
    if (expr === 'smile') {
      p.px(14, 22); p.px(15, 21); p.px(16, 21); p.px(17, 22);
      p.px(23, 22); p.px(24, 21); p.px(25, 21); p.px(26, 22);
    } else if (expr === 'worried') {
      p.rect(15, 22, 2, 1); p.rect(24, 22, 2, 1);
      p.px(15, 21); p.px(25, 21);
    } else {
      p.rect(15, 21, 2, 2); p.rect(24, 21, 2, 2);
    }
    // 코 (오른쪽 그림자)
    p.px(20, 23); p.px(20, 24);
    p.rect(21, 24, 1, 2);
    p.rect(19, 26, 3, 1);
  }

  function drawMouth(p, expr, y = 29) {
    if (expr === 'smile') {
      p.px(17, y - 1); p.rect(18, y, 5, 1); p.px(23, y - 1);
    } else if (expr === 'worried') {
      p.px(17, y + 1); p.rect(18, y, 5, 1); p.px(23, y + 1);
    } else {
      p.rect(18, y, 5, 1);
    }
  }

  function backdrop(p) {
    p.rect(0, 0, PW, PH, 'light');
    // 사진 배경: 오른쪽으로 갈수록 그늘 (점)
    for (let x = 0; x < PW; x++) p.shade(x, 0, 1, PH, Math.max(0, (x - 30) / 10) * 0.3);
  }

  const portraitDrawers = {
    fisher(p, expr) {
      backdrop(p);
      drawBody(p);
      // 비옷 깃: 목을 감싸는 높은 깃
      p.rect(11, 35, 6, 4, 'light'); p.box(11, 35, 6, 4);
      p.rect(24, 35, 6, 4, 'light'); p.box(24, 35, 6, 4);
      p.rect(27, 36, 2, 2);
      p.rect(20, 40, 1, PH - 40);                 // 단추선
      p.px(18, 42); p.px(18, 45);
      litShape(p, ellipseRows(FACE.cx, FACE.cy, FACE.rx, FACE.ry));
      // 귀
      p.rect(10, 20, 2, 4, 'light'); p.box(9, 20, 3, 4);
      p.rect(29, 20, 2, 4); p.box(29, 20, 3, 4);
      drawFeatures(p, expr);
      // 수염: 턱과 볼 아래를 덮는 면, 입 부분만 밝게
      for (const [y, x0, x1] of ellipseRows(FACE.cx, FACE.cy, FACE.rx, FACE.ry)) {
        if (y >= 26) p.rect(x0, y, x1 - x0 + 1, 1);
        else if (y >= 22) { p.rect(x0, y, 2, 1); p.rect(x1 - 1, y, 2, 1); }
      }
      p.rect(17, 28, 7, 3, 'light');
      p.shade(17, 30, 7, 1, 0.5);
      drawMouth(p, expr, 29);
      // 털모자: 정수리를 덮는 면 + 접힌 골지 띠
      for (const [y, x0, x1] of ellipseRows(20, 15, 11, 8)) {
        if (y <= 16) p.rect(x0, y, x1 - x0 + 1, 1);
      }
      p.rect(9, 14, 23, 3);
      for (let x = 10; x < 31; x += 2) p.px(x, 15, 'light');
      p.rect(18, 5, 4, 2);                        // 꼭지
    },
    keeper(p, expr) {
      backdrop(p);
      drawBody(p);
      p.rect(20, 40, 1, PH - 40);
      p.px(17, 42); p.px(23, 42); p.px(17, 45); p.px(23, 45); // 두 줄 단추
      litShape(p, ellipseRows(FACE.cx, FACE.cy, FACE.rx, FACE.ry));
      // 귀
      p.rect(10, 20, 2, 4, 'light'); p.box(9, 20, 3, 4);
      p.rect(29, 20, 2, 4); p.box(29, 20, 3, 4);
      // 흰 옆머리 (밝은 머리카락 + 옅은 점 + 외곽선)
      for (const [x0, x1] of [[8, 12], [28, 32]]) {
        p.rect(x0, 13, x1 - x0, 7, 'light');
        p.shade(x0, 13, x1 - x0, 7, 0.25);
        p.box(x0, 13, x1 - x0, 7);
      }
      // 이마 주름
      for (let x = 16; x < 25; x += 2) p.px(x, 14);
      drawFeatures(p, expr);
      // 동그란 안경
      for (const cx of [16, 25]) {
        p.rect(cx - 3, 19, 6, 1); p.rect(cx - 3, 24, 6, 1);
        p.rect(cx - 4, 20, 1, 4); p.rect(cx + 2, 20, 1, 4);
      }
      p.rect(19, 21, 3, 1);                       // 안경 다리
      // 콧수염 (면) + 입
      p.rect(16, 27, 9, 1); p.rect(15, 28, 4, 1); p.rect(22, 28, 4, 1);
      drawMouth(p, expr, 30);
      // 목도리: 목을 감싸는 어두운 면, 아래 경계만 점
      p.rect(13, 33, 15, 5);
      p.shade(13, 38, 15, 1, 0.5);
      p.rect(22, 38, 4, 6);                       // 늘어진 목도리 끝
      p.px(23, 39, 'light'); p.px(23, 41, 'light');
    },
  };

  const portraitCache = {};
  function portrait(id, expr = 'normal') {
    const key = `${id}:${expr}`;
    if (!portraitCache[key]) {
      const drawer = portraitDrawers[id];
      if (!drawer) return null;
      portraitCache[key] = makeCanvas(PW, PH, (p) => {
        drawer(p, expr);
        p.box(0, 0, PW, PH);                      // 사진 테두리
      });
    }
    return portraitCache[key];
  }

  // ================= 가구 (정면에서 본 모습, 크기 자유) =================
  const objectDrawers = {
    // 그림자 규칙: 빛이 막힌 곳(가구 밑, 장식 아래)은 면으로 어둡게,
    //             면에서 밝은 쪽으로 넘어가는 경계만 점으로 옅어진다
    wardrobe(p) {
      const { w, h } = p;
      p.panel(0, 0, w, 5);                      // 윗장식
      p.panel(2, 5, w - 4, h - 8);              // 몸통
      p.rect(2, 5, w - 4, 1);                   // 장식 아래 그림자(면)
      p.shade(3, 6, w - 6, 2, 0.5);             //   └ 경계는 점
      p.rect(w / 2, 6, 1, h - 10);              // 문 두 짝 사이
      p.box(5, 9, w / 2 - 7, h - 18);           // 왼쪽 문 판
      p.box(w / 2 + 3, 9, w / 2 - 7, h - 18);   // 오른쪽 문 판
      p.rect(w / 2 - 3, h / 2, 2, 1); p.rect(w / 2 + 2, h / 2, 2, 1); // 손잡이
      p.fade(3, h - 12, w - 6, 8, 0.0, 0.4);    // 아래로 갈수록 어두워지는 그라데이션
      p.rect(3, h - 3, w - 6, 3);               // 옷장 밑 그림자(면)
      p.panel(3, h - 3, 3, 3); p.panel(w - 6, h - 3, 3, 3); // 다리
    },
    drawer(p) {
      const { w, h } = p;
      p.panel(0, 0, w, 3);                      // 상판
      p.panel(1, 2, w - 2, h - 4);              // 몸통
      for (let i = 0; i < 3; i++) {
        const y = 4 + i * 6;
        p.box(3, y, w - 6, 5);                  // 서랍
        p.rect(4, y + 3, w - 8, 1);             // 서랍 손잡이 아래 그림자(면)
        p.rect(w / 2 - 1, y + 1, 2, 1);         // 손잡이
      }
      p.rect(2, h - 2, w - 4, 2);               // 서랍장 밑 그림자(면)
      p.panel(2, h - 2, 3, 2); p.panel(w - 5, h - 2, 3, 2); // 다리
    },
    desk(p) {
      const { w, h } = p;
      p.shadow(2, 9, w - 4, h - 9, 3);          // 책상 밑: 면 그림자 + 위쪽 경계만 점
      p.panel(0, 6, w, 3);                      // 상판
      p.panel(2, 9, 2, h - 9);                  // 다리
      p.panel(w - 4, 9, 2, h - 9);
      p.panel(w - 16, 9, 12, 5);                // 서랍
      p.rect(w - 11, 11, 2, 1);
      // 책상 위 소품: 종이 더미와 작은 촛대
      p.panel(5, 3, 10, 3); p.rect(6, 4, 8, 1);
      p.panel(22, 2, 3, 4); p.rect(23, 0, 1, 2);
    },
    chair(p) {
      const { w, h } = p;
      p.shadow(1, 14, w - 2, h - 14, 2);        // 의자 밑 그림자
      p.panel(w - 3, 0, 3, h);                  // 등받이 기둥
      p.rect(w - 6, 2, 3, 1); p.rect(w - 6, 6, 3, 1);
      p.panel(0, 11, w, 3);                     // 앉는 판
      p.panel(1, 14, 2, h - 14);                // 다리
      p.panel(w - 3, 14, 2, h - 14);
    },
    bed(p) {
      const { w, h } = p;
      p.shadow(4, 14, w - 8, h - 14, 2);        // 침대 밑 그림자
      p.panel(0, 0, 4, h);                      // 머리판
      p.panel(w - 4, 6, 4, h - 6);              // 발판
      p.panel(4, 8, w - 8, 6);                  // 매트리스
      p.panel(5, 4, 12, 5);                     // 베개
      p.shade(6, 7, 10, 1, 0.5);
      p.panel(16, 6, w - 21, 7);                // 이불
      p.rect(16, 9, w - 21, 1);                 // 접힌 선
      p.fade(17, 10, w - 23, 2, 0.5, 0.25);     // 접힌 곳 아래 옅은 그라데이션
    },
    crate(p) {
      const { w, h } = p;
      p.panel(0, 0, w, h);
      p.rect(0, 4, w, 1); p.rect(0, 9, w, 1);   // 판자
      p.fade(1, 10, w - 2, h - 11, 0.15, 0.6);  // 아래로 갈수록 어두워짐
      for (let i = 0; i < w; i++) p.px(i, Math.round((i * (h - 1)) / (w - 1))); // 대각 보강목
      p.box(0, 0, w, h);
    },
    barrel(p) {
      const { w, h } = p;
      // 가운데가 볼록한 통
      for (let y = 0; y < h; y++) {
        const t = Math.abs(y - h / 2) / (h / 2);
        const inset = Math.round(t * t * 2);
        p.rect(inset, y, w - inset * 2, 1, 'light');
        p.rect(w - 4 - inset, y, 3, 1);         // 빛 반대쪽 옆면: 면 그림자
        p.shade(w - 6 - inset, y, 2, 1, 0.5);   //   └ 둥글게 넘어가는 경계는 점
        p.px(inset, y); p.px(w - 1 - inset, y);
      }
      p.rect(2, 0, w - 4, 1); p.rect(2, h - 1, w - 4, 1);
      p.rect(1, 4, w - 2, 1); p.rect(1, h - 5, w - 2, 1); // 쇠테
    },
    // 그물 더미 (부둣가)
    net(p) {
      const { w, h } = p;
      for (let y = 0; y < h; y++) {
        const half = Math.round((w / 2) * Math.sqrt(1 - Math.pow((h - y) / h, 2)));
        p.rect(w / 2 - half, y, half * 2, 1, 'light');
        p.px(w / 2 - half, y); p.px(w / 2 + half - 1, y);
      }
      for (let x = 2; x < w - 2; x += 3) {     // 그물코
        for (let y = 2; y < h - 1; y++) if ((x + y) % 3 === 0) p.px(x, y);
      }
      p.rect(2, h - 2, w - 4, 2);               // 밑 그림자(면)
      p.shade(3, h - 4, w - 6, 2, 0.4);
    },
    // 계류 기둥 (부둣가)
    post(p) {
      const { w, h } = p;
      p.panel(0, 0, w, h);
      p.rect(w - 2, 1, 1, h - 2);               // 오른쪽 면 그림자
      p.rect(0, 3, w, 1);
      p.panel(-1, 5, w + 2, 2);                  // 감긴 밧줄
    },
    // 바닥에 놓인 심부름꾼 가방 (숙소)
    bag(p) {
      const { w, h } = p;
      p.rect(3, 0, w - 6, 1); p.rect(2, 1, 1, 2); p.rect(w - 3, 1, 1, 2); // 어깨끈 고리
      p.panel(0, 3, w, h - 3);                  // 가방 몸통
      p.panel(0, 3, w, 5);                      // 덮개
      p.rect(1, 8, w - 2, 1);                   // 덮개 밑 그림자(면)
      p.shade(1, 9, w - 2, 1, 0.5);
      p.rect(w / 2 - 1, 6, 2, 3);               // 버클
      p.rect(w - 3, 4, 2, h - 5);               // 오른쪽 면 그림자
    },
    // 그림이 없는 새 오브젝트는 X 표시 상자로 보여준다
    fallback(p) {
      p.panel(0, 0, p.w, p.h);
      for (let i = 0; i < Math.min(p.w, p.h); i++) { p.px(i, i); p.px(p.w - 1 - i, i); }
    },
  };

  const objectCache = {};
  function object(ent) {
    const key = `${ent.type}:${ent.w}x${ent.h}`;
    if (!objectCache[key]) {
      const drawer = objectDrawers[ent.type] || objectDrawers.fallback;
      objectCache[key] = makeCanvas(ent.w, ent.h, drawer);
    }
    return objectCache[key];
  }

  // ================= 아이콘 (인벤토리·주머니 표시) =================
  const icons = {
    // 등대 랜턴 12 x 14
    lantern: fromPixels([
      '....####....',
      '...#....#...',
      '....####....',
      '..########..',
      '..#oooooo#..',
      '..#o#oo,,#..',
      '..#oo##,,#..',
      '..#oo##,,#..',
      '..#o#oo,,#..',
      '..#oooo,,#..',
      '..########..',
      '...######...',
      '..########..',
      '............',
    ]),
    // 돌돌 말린 양피지 쪽지 14 x 10
    scroll: fromPixels([
      '.############.',
      '#oo#oooooooo##',
      '#o#oooooooooo#',
      '.#o#####ooooo#',
      '.#oooooooo,,o#',
      '.#o#####oo,,o#',
      '.#oooooooooo#.',
      '##oooooooooo#.',
      '#oo#oooooo,,#.',
      '.############.',
    ]),
  };

  return { object, player, npc, portrait, icons, makeCanvas, fromPixels, dotAt };
})();
