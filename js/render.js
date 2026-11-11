// 상태를 읽어서 화면에 그리기만 한다. 상태를 바꾸지 않는다. (측면 시점)
// - draw(): 게임 세계를 320x192 캔버스에 그림
// - drawUI(): 3배 크기 화면 위에 대화창·"E 대화하기" 같은 UI 를 그림 (글자를 선명하게)
//
// 명암 규칙: 빛이 막힌 진짜 그림자 = 면(꽉 찬 어두운색, 밀도 1)
//            그림자에서 밝은 곳으로 넘어가는 그라데이션 = 점 (밀도 0~1 사이)

Game.Render = (function () {
  const { WIDTH, HEIGHT, COLORS, SCALE } = Game.CONFIG;
  const { dotAt } = Game.Sprites;

  // 물건이 바닥에 닿는 곳의 그림자: 위 2줄은 면, 아래로 점이 옅어진다
  const CONTACT_SHADOW = [1, 1, 0.7, 0.45, 0.25, 0.1];

  // 밀도 배열(shade)을 화면에 찍는다. 1 이상이면 면, 그 밑이면 점
  function paintShade(ctx, shade, W = WIDTH) {
    ctx.fillStyle = COLORS.light;
    ctx.fillRect(0, 0, W, HEIGHT);
    ctx.fillStyle = COLORS.dark;
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < W; x++) {
        const d = shade[y * W + x];
        if (d >= 1 || (d > 0 && dotAt(x, y, d))) ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // 그림자 가장자리를 부드럽게: 면(1)에서 n 픽셀 동안 점으로 옅어짐
  const falloff = (dist, solid, soft) => (dist < solid ? 1 : Math.max(0, 1 - (dist - solid) / soft) * 0.8);

  function addContactShadows(shade, map, L, R, W = WIDTH) {
    for (const o of map.objects) {
      CONTACT_SHADOW.forEach((density, i) => {
        const y = map.floorY + i;
        for (let x = o.x - 2; x < o.x + o.w + 3; x++) {
          if (x < L || x >= R) continue;
          const k = y * W + x;
          shade[k] = Math.max(shade[k], density);
        }
      });
    }
  }

  // ================= 숙소 (방 단면) =================
  function buildRoom(map, ctx) {
    const { floorY, ceilingY } = map;
    const L = map.bounds.left;
    const R = map.bounds.right;

    const lights = map.windows.map((w) => ({ x: w.x + w.w / 2, y: w.y + w.h / 2, r: 46 }));
    const ambient = (x, y) => {
      let best = Infinity;
      for (const l of lights) best = Math.min(best, Math.hypot(x - l.x, y - l.y) - l.r);
      return Math.max(0, Math.min(1, best / 170)) * 0.35;
    };
    const inShaft = (x, y) => map.windows.some((w) => {
      const top = w.y + w.h;
      if (y < top || y > floorY + 16) return false;
      const off = (y - top) * 0.45;
      return x >= w.x + off && x < w.x + w.w + off;
    });

    const shade = new Float32Array(WIDTH * HEIGHT);
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        let d;
        if (x < L || x >= R || y < ceilingY) {
          d = 1;                                                   // 벽 두께·천장: 면
        } else if (y < floorY) {
          d = ambient(x, y);                                       // 뒷벽 그라데이션
          d = Math.max(d, falloff(y - ceilingY, 3, 10));           // 천장 아래: 3px 면 + 점
          d = Math.max(d, falloff(x - L, 2, 9));                   // 왼쪽 구석
          d = Math.max(d, falloff(R - 1 - x, 2, 9));               // 오른쪽 구석
        } else {
          d = ambient(x, y) + 0.3 * ((y - floorY) / (HEIGHT - floorY));
        }
        if (inShaft(x, y) && d < 1) d *= 0.15;                     // 빛줄기 안은 밝게
        shade[y * WIDTH + x] = d;
      }
    }
    addContactShadows(shade, map, L, R);
    paintShade(ctx, shade);

    const line = (x, y, w, h) => ctx.fillRect(x, y, w, h);
    const dashedH = (x0, x1, y, gap = 2) => { for (let x = x0; x < x1; x += gap) line(x, y, 1, 1); };
    ctx.fillStyle = COLORS.dark;

    line(L - 1, ceilingY, 1, floorY - ceilingY);
    line(R, ceilingY, 1, floorY - ceilingY);
    // 천장 들보 끝 (밝은 단면)
    ctx.fillStyle = COLORS.light;
    for (let x = L + 30; x < R; x += 46) ctx.fillRect(x, ceilingY - 6, 6, 5);
    ctx.fillStyle = COLORS.dark;

    // 뒷벽 판자
    for (let x = L + 18; x < R; x += 18) {
      for (let y = ceilingY + 3; y < floorY - 6; y++) if ((y + x) % 37 !== 0) line(x, y, 1, 1);
    }

    // 걸레받이 (위는 밝고, 바로 아래 바닥과 만나는 선)
    ctx.fillStyle = COLORS.light;
    ctx.fillRect(L, floorY - 6, R - L, 5);
    ctx.fillStyle = COLORS.dark;
    line(L, floorY - 6, R - L, 1);
    line(L, floorY - 1, R - L, 1);

    // 바닥 판자
    line(0, floorY, WIDTH, 1);
    [8, 19, 33].forEach((dy) => dashedH(L, R, floorY + dy, dy > 10 ? 1 : 2));
    for (let x = L + 10; x < R; x += 40) line(x, floorY + 1, 1, 7);
    for (let x = L + 30; x < R; x += 40) line(x, floorY + 9, 1, 10);

    // 창문
    for (const w of map.windows) {
      ctx.fillStyle = COLORS.light;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = COLORS.dark;
      line(w.x - 2, w.y - 2, w.w + 4, 2);
      line(w.x - 2, w.y + w.h, w.w + 4, 2);
      line(w.x - 2, w.y, 2, w.h);
      line(w.x + w.w, w.y, 2, w.h);
      line(w.x + w.w / 2, w.y, 1, w.h);
      line(w.x, w.y + w.h / 2, w.w, 1);
      line(w.x - 4, w.y + w.h + 2, w.w + 8, 1);
      line(w.x - 3, w.y + w.h + 3, w.w + 6, 1);           // 창턱 밑 그림자(면)
      for (let x = w.x; x < w.x + w.w; x++) {
        if (x % 3 === 0) line(x, w.y + w.h - 8, 1, 1);
        if (dotAt(x, w.y + w.h - 6, 0.25)) line(x, w.y + w.h - 6, 1, 1);
      }
    }

    // 문 — 문 밖은 밝은 바깥, 문틀 바로 아래는 면 그림자
    const d = map.door;
    const dy = floorY - d.h;
    ctx.fillStyle = COLORS.light;
    ctx.fillRect(d.x, dy, d.w, d.h);
    ctx.fillStyle = COLORS.dark;
    line(d.x - 3, dy - 3, d.w + 6, 3);
    line(d.x - 3, dy, 3, d.h);
    line(d.x + d.w, dy, 3, d.h);
    line(d.x, dy, d.w, 2);                                  // 문틀 아래 그림자(면)
    for (let y = dy + 2; y < dy + 6; y++) {                 //   └ 점으로 옅어짐
      for (let x = d.x; x < d.x + d.w; x++) if (dotAt(x, y, 0.7 - (y - dy - 2) * 0.17)) line(x, y, 1, 1);
    }
    line(d.x, dy, 8, d.h);                                  // 안쪽으로 열린 문짝 (빛을 등진 면)
    ctx.fillStyle = COLORS.light;
    ctx.fillRect(d.x + 7, dy + 2, 1, d.h - 3);              // 문짝 모서리 하이라이트
  }

  // ================= 부둣가 (바깥) =================
  function buildDock(map, ctx) {
    const { floorY, horizonY } = map;
    const W = Game.mapWidth(map);      // 부둣가는 화면보다 넓다
    const DECK = 7;                    // 부두 윗판 두께
    const beamY = floorY + DECK;       // 부두 앞면(들보) 시작

    const shade = new Float32Array(W * HEIGHT);
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < W; x++) {
        let d = 0;
        if (y < horizonY) {
          d = 0.22 * (1 - y / horizonY);                          // 하늘: 위가 조금 어둡고 수평선은 안개로 밝음
        } else if (y < floorY) {
          d = 0.12 + 0.35 * ((y - horizonY) / (floorY - horizonY)); // 바다: 가까울수록 어둡게
        } else if (y < beamY) {
          d = 0;                                                  // 부두 윗판: 밝음
        } else if (y < beamY + 8) {
          d = 1;                                                  // 부두 들보: 면
        } else {
          d = falloff(y - (beamY + 8), 4, 10);                    // 부두 밑 그림자: 면 → 점
          d = Math.max(d, 0.45);                                  // 그 아래 물
        }
        shade[y * W + x] = d;
      }
    }

    // 왼쪽 숙소 건물이 바다 쪽으로 드리운 그림자
    const B = { x: 0, w: 78, top: 74 };
    for (let y = B.top; y < floorY; y++) {
      for (let x = B.x + B.w; x < B.x + B.w + 12; x++) {
        const k = y * W + x;
        shade[k] = Math.max(shade[k], falloff(x - (B.x + B.w), 2, 10));
      }
    }
    addContactShadows(shade, map, 0, W, W);
    paintShade(ctx, shade, W);

    const line = (x, y, w, h) => ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLORS.dark;

    // 오른쪽 끝 곶과 등대
    const LH = map.lighthouse;
    const hx = LH.headlandX;
    for (let x = hx; x < W; x++) {
      const top = horizonY - 12 + Math.round(Math.pow((x - hx) / (W - hx) - 0.62, 2) * 26);
      line(x, top, 1, horizonY - top);                  // 곶 실루엣: 면
    }
    const T = { x: LH.x, top: 34, base: 90 };
    for (let y = T.top; y < T.base; y++) {              // 위가 좁은 등대 몸통
      const half = 6 + Math.round(((y - T.top) / (T.base - T.top)) * 4);
      ctx.fillStyle = COLORS.light;
      line(T.x - half, y, half * 2, 1);
      ctx.fillStyle = COLORS.dark;
      line(T.x - half, y, 1, 1);
      line(T.x + half - 1, y, 1, 1);
      line(T.x + half - 4, y, 3, 1);                     // 빛 반대쪽 면 그림자
      if (dotAt(T.x + half - 6, y, 0.5)) line(T.x + half - 6, y, 1, 1);
      if (dotAt(T.x + half - 5, y, 0.5)) line(T.x + half - 5, y, 1, 1);
      if ((y - T.top) % 16 < 4) line(T.x - half, y, half * 2, 1); // 줄무늬
    }
    line(T.x - 6, T.top - 8, 12, 8);                    // 등불 방 (지금은 꺼져 있음)
    ctx.fillStyle = COLORS.light;
    line(T.x - 4, T.top - 6, 3, 4);
    line(T.x + 1, T.top - 6, 3, 4);
    ctx.fillStyle = COLORS.dark;
    line(T.x - 8, T.top - 9, 16, 1);
    line(T.x - 5, T.top - 12, 10, 3);                    // 지붕
    line(T.x - 2, T.top - 14, 4, 2);

    // 수평선과 물결
    line(0, horizonY, hx, 1);
    for (let y = horizonY + 6; y < floorY; y += 7) {
      for (let x = (y * 7) % 23; x < W; x += 23) {
        ctx.fillStyle = COLORS.light;
        line(x, y, 6, 1);                                // 물결 하이라이트
        ctx.fillStyle = COLORS.dark;
        line(x + 1, y + 1, 4, 1);
      }
    }
    // 하늘의 안개 띠
    for (const [y, x0, x1] of [[24, 30, 120], [34, 150, 230], [56, 90, 200], [28, 300, 420], [48, 380, 470], [20, 470, 560]]) {
      for (let x = x0; x < x1; x += 3) line(x, y, 1, 1);
    }

    // 부두 옆에 묶인 작은 배 (물 위, 부두 뒤)
    if (map.boat) {
      const { x: bx, w: bw } = map.boat;
      const top = floorY - 13;
      for (let i = 0; i < 9; i++) {                       // 아래로 좁아지는 선체
        const inset = Math.round(i * i * 0.12);
        ctx.fillStyle = COLORS.light;
        line(bx + inset, top + i, bw - inset * 2, 1);
        ctx.fillStyle = COLORS.dark;
        line(bx + inset, top + i, 1, 1);
        line(bx + bw - 1 - inset, top + i, 1, 1);
        if (i >= 5) line(bx + inset, top + i, bw - inset * 2, 1);  // 물에 잠긴 아랫부분: 면
      }
      line(bx, top, bw, 1);                               // 뱃전
      line(bx + 2, top + 3, bw - 4, 1);                   // 띠
      for (let x = bx + 2; x < bx + bw - 2; x++) if (dotAt(x, top + 4, 0.5)) line(x, top + 4, 1, 1);
      line(bx + bw / 2, top - 30, 1, 30);                 // 돛대
      line(bx + bw / 2 - 10, top - 22, 20, 1);            // 활대
      for (let i = 0; i < 12; i++) line(bx + bw / 2 + 1 + i, top - 1 - i * 2, 1, 1); // 줄
      ctx.fillStyle = COLORS.light;                       // 배 그림자 옆 물 반짝임
      line(bx - 4, top + 10, 3, 1); line(bx + bw + 2, top + 9, 4, 1);
      ctx.fillStyle = COLORS.dark;
    }

    // 숙소 건물 외벽 (왼쪽)
    ctx.fillStyle = COLORS.light;
    ctx.fillRect(B.x, B.top, B.w, floorY - B.top);
    ctx.fillStyle = COLORS.dark;
    for (let y = B.top + 6; y < floorY; y += 6) line(B.x, y, B.w, 1);      // 판자벽
    line(B.x + B.w - 1, B.top, 1, floorY - B.top);
    // 지붕: 면, 처마 밑 그림자
    for (let i = 0; i < 12; i++) line(B.x, B.top - 12 + i, B.w + 6 - Math.max(0, 6 - i), 1);
    line(B.x, B.top, B.w, 2);                                              // 처마 밑 그림자(면)
    for (let x = B.x; x < B.x + B.w; x++) {
      if (dotAt(x, B.top + 2, 0.6)) line(x, B.top + 2, 1, 1);
      if (dotAt(x, B.top + 3, 0.3)) line(x, B.top + 3, 1, 1);
    }
    // 건물 창문
    ctx.fillStyle = COLORS.light;
    ctx.fillRect(60, 90, 12, 14);
    ctx.fillStyle = COLORS.dark;
    line(59, 89, 14, 1); line(59, 104, 14, 2); line(59, 89, 1, 16); line(72, 89, 1, 16);
    line(66, 90, 1, 14);

    // 숙소 문 (닫힌 나무문)
    const d = map.door;
    const dy = floorY - d.h;
    line(d.x - 2, dy - 3, d.w + 4, 3);                   // 문틀 위
    ctx.fillStyle = COLORS.light;
    ctx.fillRect(d.x, dy, d.w, d.h);
    ctx.fillStyle = COLORS.dark;
    line(d.x - 2, dy, 2, d.h); line(d.x + d.w, dy, 2, d.h);
    line(d.x, dy, d.w, 2);                               // 문틀 아래 그림자(면)
    for (let x = d.x; x < d.x + d.w; x++) if (dotAt(x, dy + 2, 0.5)) line(x, dy + 2, 1, 1);
    line(d.x + 3, dy + 6, d.w - 6, 1); line(d.x + 3, dy + 6, 1, d.h - 10);   // 문 판
    line(d.x + d.w - 4, dy + 6, 1, d.h - 10); line(d.x + 3, floorY - 5, d.w - 6, 1);
    line(d.x + d.w - 7, dy + d.h / 2, 2, 2);             // 손잡이

    // 부두 윗판, 들보, 기둥
    line(0, floorY, W, 1);
    for (let x = 6; x < W; x += 14) line(x, floorY + 1, 1, DECK - 1);      // 판자 이음새
    line(0, beamY - 1, W, 1);
    ctx.fillStyle = COLORS.light;
    for (let x = 10; x < W; x += 30) line(x, beamY + 3, 2, 2);            // 들보 볼트
    for (let x = 20; x < W; x += 64) {                                     // 물속 기둥
      ctx.fillStyle = COLORS.light;
      line(x, beamY + 8, 8, HEIGHT - beamY - 8);
      ctx.fillStyle = COLORS.dark;
      line(x, beamY + 8, 1, HEIGHT - beamY - 8);
      line(x + 7, beamY + 8, 1, HEIGHT - beamY - 8);
      line(x + 4, beamY + 8, 3, HEIGHT - beamY - 8);                      // 기둥 그림자 면
      line(x, beamY + 8, 8, 3);                                            // 부두 밑 그림자
    }
  }

  // ---------- 배경 캐시 ----------
  const bgCache = {};
  function background(mapId) {
    if (!bgCache[mapId]) {
      const map = Game.MAPS[mapId];
      const c = document.createElement('canvas');
      c.width = Game.mapWidth(map);
      c.height = HEIGHT;
      const ctx = c.getContext('2d');
      if (map.style === 'dock') buildDock(map, ctx);
      else buildRoom(map, ctx);
      bgCache[mapId] = c;
    }
    return bgCache[mapId];
  }

  // ---------- 매 프레임 그리는 것 ----------
  function drawGroundShadow(ctx, state, rect, cx, maxHalf) {
    const ground = Game.Collision.groundBelow(state, rect);
    if (ground === Infinity) return;
    const height = ground - (rect.y + rect.h);
    const half = Math.max(2, maxHalf - Math.floor(height / 5));
    ctx.fillStyle = COLORS.dark;
    for (let sx = Math.round(cx - half); sx < cx + half; sx++) {
      const edge = Math.min(sx - (cx - half), cx + half - 1 - sx); // 가장자리까지 거리
      const density = height > 6 ? 0.5 : edge >= 2 ? 1 : 0.5;      // 가운데는 면, 끝은 점
      if (density >= 1 || dotAt(sx, ground, density)) ctx.fillRect(sx, ground, 1, 1);
      if (edge >= 3 && height <= 6) ctx.fillRect(sx, ground + 1, 1, 1);
    }
  }

  function drawEntity(ctx, state, ent) {
    if (ent.kind === 'object') {
      ctx.drawImage(Game.Sprites.object(ent), ent.x, ent.y);
    } else if (ent.kind === 'npc') {
      drawGroundShadow(ctx, state, { x: ent.x + 4, y: ent.y, w: 8, h: ent.h }, ent.x + ent.w / 2, 7);
      const set = Game.Sprites.npc[ent.id];
      if (set) ctx.drawImage(set[ent.facing], ent.x, ent.y);
    }
    // kind === 'door' 은 배경에 이미 그려져 있다
  }

  function playerImage(p) {
    const set = Game.Sprites.player[p.facing];
    if (!p.onGround) return set.air;
    if (!p.moving) return set.stand;
    const frame = Math.floor(p.animTime * Game.CONFIG.WALK_FPS) % set.walk.length;
    return set.walk[frame];
  }

  function drawPlayer(ctx, state) {
    const p = state.player;
    const hb = Game.Collision.worldHitbox(p);
    drawGroundShadow(ctx, state, hb, Math.round(p.x) + p.w / 2, 7);
    ctx.drawImage(playerImage(p), Math.round(p.x), Math.round(p.y));
  }

  function draw(ctx, state) {
    // 카메라만큼 세계 전체를 왼쪽으로 밀어서 그린다
    ctx.save();
    ctx.translate(-Math.round(state.camera.x), 0);

    ctx.drawImage(background(state.mapId), 0, 0);

    // 뒤쪽 배경 가구 → NPC → 앞을 막는 장애물 → 플레이어 순서로 겹친다
    const order = { object: 0, npc: 1, door: -1 };
    const layered = state.entities
      .filter((e) => e.kind !== 'door')
      .sort((a, b) => (order[a.kind] + (a.solid ? 2 : 0)) - (order[b.kind] + (b.solid ? 2 : 0)));
    layered.forEach((e) => drawEntity(ctx, state, e));
    drawPlayer(ctx, state);

    ctx.restore();
  }

  // ================= UI (3배 화면 위) =================
  // 글자는 브라우저 글꼴로 그린 뒤 2색으로만 남긴다 (중간색 제거 → DO NOT LOSE 유지)
  const textCache = new Map();
  const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

  function textImage(str, size, color) {
    const key = `${str}|${size}|${color}`;
    if (textCache.has(key)) return textCache.get(key);
    const font = `bold ${size}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
    const m = document.createElement('canvas').getContext('2d');
    m.font = font;
    const w = Math.ceil(m.measureText(str).width) + 2;
    const h = Math.ceil(size * 1.35);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    x.font = font;
    x.textBaseline = 'top';
    x.fillStyle = '#000';
    x.fillText(str, 1, 1);
    const img = x.getImageData(0, 0, w, h);
    const [r, g, b] = hexToRgb(COLORS[color]);
    for (let i = 0; i < img.data.length; i += 4) {
      const on = img.data[i + 3] >= 110;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b;
      img.data[i + 3] = on ? 255 : 0;
    }
    x.putImageData(img, 0, 0);
    textCache.set(key, c);
    return c;
  }

  // 논리 좌표(320x192)로 UI 사각형을 그린다 → 게임 픽셀과 같은 굵기
  function uiRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = COLORS[color];
    ctx.fillRect(Math.round(x) * SCALE, Math.round(y) * SCALE, Math.round(w) * SCALE, Math.round(h) * SCALE);
  }
  function uiBox(ctx, x, y, w, h, color = 'dark') {
    uiRect(ctx, x, y, w, 1, color);
    uiRect(ctx, x, y + h - 1, w, 1, color);
    uiRect(ctx, x, y, 1, h, color);
    uiRect(ctx, x + w - 1, y, 1, h, color);
  }

  // "E 대화하기" 말풍선: 대상 머리 위
  function drawPrompt(ctx, state) {
    const ent = state.entities.find((e) => e.id === state.ui.promptTarget);
    if (!ent) return;
    const label = textImage(ent.interact.label, 18, 'dark');
    const keyCap = textImage('E', 18, 'light');
    const labelW = Math.ceil(label.width / SCALE);
    const w = labelW + 15;
    const h = 11;
    const cx = Math.round(ent.x + ent.w / 2 - state.camera.x);   // 화면 기준 위치
    const x = Math.max(2, Math.min(WIDTH - w - 2, Math.round(cx - w / 2)));
    const y = Math.max(2, ent.y - h - 6);

    uiRect(ctx, x, y, w, h, 'light');
    uiBox(ctx, x, y, w, h);
    uiRect(ctx, x + 2, y + 2, 8, 7, 'dark');                 // 키 표시는 반전 (어두운 바탕에 밝은 글자)
    ctx.drawImage(keyCap, (x + 6) * SCALE - keyCap.width / 2, (y + 2) * SCALE + 1);
    ctx.drawImage(label, (x + 12) * SCALE, (y + 2) * SCALE);
    // 말풍선 꼬리
    const tx = Math.round(cx);
    uiRect(ctx, tx - 2, y + h - 1, 5, 1, 'light');
    uiRect(ctx, tx - 1, y + h, 3, 1, 'light');
    uiRect(ctx, tx - 3, y + h - 1, 1, 1, 'dark');
    uiRect(ctx, tx + 3, y + h - 1, 1, 1, 'dark');
    uiRect(ctx, tx - 2, y + h, 1, 1, 'dark');
    uiRect(ctx, tx + 2, y + h, 1, 1, 'dark');
    uiRect(ctx, tx - 1, y + h + 1, 3, 1, 'dark');
  }

  // 대화창: 이중선 테두리의 각진 상자 + 증명사진 초상화 + 이름표(반전) + 두 줄 대사
  function drawDialogue(ctx, state, now) {
    const d = state.ui.dialogue;
    if (!d) return;
    const x = 12, y = 132, w = WIDTH - 24, h = 52;
    const page = d.pages[d.page] || {};
    const lines = Array.isArray(page) ? page : page.lines || [];
    const expr = page.expr || 'normal';

    uiRect(ctx, x, y, w, h, 'light');
    uiBox(ctx, x, y, w, h);                  // 바깥 선
    uiBox(ctx, x + 2, y + 2, w - 4, h - 4);  // 안쪽 선 → 이중선

    // 초상화: 대화창 위로 살짝 올라온 증명사진 카드 (이중선 액자)
    const px = x + 6, py = y - 14, pw = 40, ph = 48;
    uiRect(ctx, px - 3, py - 3, pw + 6, ph + 6, 'light');
    uiBox(ctx, px - 3, py - 3, pw + 6, ph + 6);
    uiBox(ctx, px - 1, py - 1, pw + 2, ph + 2);
    const face = Game.Sprites.portrait(d.npcId, expr);
    if (face) ctx.drawImage(face, px * SCALE, py * SCALE, pw * SCALE, ph * SCALE);

    // 이름표 (반전: 어두운 바탕에 밝은 글자) + 직업
    const tx = px + pw + 8;
    const name = textImage(d.name, 20, 'light');
    const nameW = Math.ceil(name.width / SCALE) + 8;
    uiRect(ctx, tx, y - 8, nameW, 11, 'dark');
    ctx.drawImage(name, (tx + 4) * SCALE, (y - 7) * SCALE);
    if (d.role) {
      const role = textImage(d.role, 16, 'dark');
      uiRect(ctx, tx + nameW, y - 6, Math.ceil(role.width / SCALE) + 6, 9, 'light');
      uiBox(ctx, tx + nameW, y - 6, Math.ceil(role.width / SCALE) + 6, 9);
      ctx.drawImage(role, (tx + nameW + 3) * SCALE, (y - 5) * SCALE + 1);
    }

    // 대사 (최대 두 줄)
    lines.slice(0, 2).forEach((str, i) => {
      ctx.drawImage(textImage(str, 22, 'dark'), tx * SCALE, (y + 12 + i * 14) * SCALE);
    });

    // 몇 번째 장인지 (예: 1/2)
    const count = textImage(`${d.page + 1}/${d.pages.length}`, 14, 'dark');
    ctx.drawImage(count, (x + w - 26) * SCALE, (y + h - 11) * SCALE);

    // 다음 표시 (깜빡임)
    if (Math.floor(now / 450) % 2 === 0) {
      const ax = x + w - 12, ay = y + h - 10;
      uiRect(ctx, ax, ay, 5, 1, 'dark');
      uiRect(ctx, ax + 1, ay + 1, 3, 1, 'dark');
      uiRect(ctx, ax + 2, ay + 2, 1, 1, 'dark');
    }
  }

  function drawUI(ctx, state, now) {
    if (state.ui.mode === 'explore' && state.ui.promptTarget) drawPrompt(ctx, state);
    if (state.ui.mode === 'dialogue') drawDialogue(ctx, state, now);
  }

  return { draw, drawUI };
})();
