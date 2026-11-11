// 매 프레임 상태를 바꾸는 규칙. 그리지 않는다.

Game.update = function (state, input, dt) {
  const ui = state.ui;
  Game.updateMonologue(state, dt);

  // 쪽지 펼치기 / 주머니에 넣기 연출 중에는 아무것도 하지 않는다
  if (ui.anim) {
    ui.anim.t += dt;
    if (ui.anim.t >= ui.anim.dur) Game.finishAnim(state);
    return;
  }

  // 조작법 쪽지를 읽는 중: E(또는 H, Space, Esc)로 주머니에 넣는다
  if (ui.mode === 'note' || ui.mode === 'help') {
    const close = ['KeyE', 'KeyH', 'Space', 'Escape'].some((k) => input.wasPressed(k));
    if (close) ui.anim = { type: 'pocket', t: 0, dur: 0.5 };
    return;
  }

  // 대화 중: 이동하지 않고 대화창만 넘긴다
  if (ui.mode === 'dialogue') {
    Game.updateDialogue(state, input);
    return;
  }

  // H: 주머니에서 쪽지 꺼내 보기
  if (input.wasPressed('KeyH') && state.flags.pocketed) {
    Game.stopPlayer(state);
    ui.mode = 'help';
    ui.promptTarget = null;
    ui.anim = { type: 'unroll', t: 0, dur: 0.35 };
    return;
  }

  Game.movePlayer(state, input, dt);
  Game.updateCamera(state);
  Game.npcsNoticePlayer(state);

  // 가까운 NPC·문·물건 찾기 → "E 대화하기" 표시 대상
  const target = Game.findInteractTarget(state);
  ui.promptTarget = target ? target.id : null;
  if (target && input.wasPressed('KeyE')) Game.interact(state, target);
};

Game.stopPlayer = function (state) {
  const p = state.player;
  p.vx = 0;
  p.moving = false;
  p.animTime = 0;
};

// 연출이 끝났을 때
Game.finishAnim = function (state) {
  const ui = state.ui;
  const type = ui.anim.type;
  ui.anim = null;
  if (type === 'pocket') {
    const first = !state.flags.pocketed;
    ui.mode = 'explore';
    state.flags.pocketed = true;
    if (first) Game.say(state, '(일 나가기 전에 가방부터 챙기자.)');
  }
};

// ---------- 혼잣말 (화면 아래, 이동은 막지 않음) ----------

// now: true 면 앞의 혼잣말을 끊고 바로 보여준다 (E 를 눌렀을 때의 반응처럼 즉시 보여야 하는 말)
Game.say = function (state, text, now = false) {
  const m = state.ui.monologue;
  if (now) {
    m.queue = [];
    m.current = null;
  }
  m.queue.push({ text, dur: 1.6 + text.length * 0.06 });
};

Game.updateMonologue = function (state, dt) {
  const m = state.ui.monologue;
  if (state.ui.mode === 'dialogue') return; // 대화 중에는 멈춰 둔다
  if (!m.current && m.queue.length) {
    m.current = m.queue.shift();
    m.t = 0;
  }
  if (m.current) {
    m.t += dt;
    if (m.t >= m.current.dur) m.current = null;
  }
};

// ---------- NPC 반응 ----------

// 플레이어가 가까이 오면 NPC 가 그쪽으로 돌아본다 (멀어지면 원래 방향으로)
Game.npcsNoticePlayer = function (state) {
  const p = state.player;
  const pc = p.x + p.w / 2;
  for (const ent of state.entities) {
    if (ent.kind !== 'npc') continue;
    if (!ent.homeFacing) ent.homeFacing = ent.facing;
    const nc = ent.x + ent.w / 2;
    const near = Math.abs(pc - nc) <= Game.CONFIG.INTERACT_RANGE * 2;
    ent.noticed = near;
    ent.facing = near ? (pc > nc ? 'right' : 'left') : ent.homeFacing;
  }
};

// ---------- 상호작용 ----------

// 플레이어 가까이(INTERACT_RANGE 안)에 있는 상호작용 대상 중 가장 가까운 것.
// 멀리 있으면 null → E 를 눌러도 아무 일도 일어나지 않는다
Game.findInteractTarget = function (state) {
  const p = state.player;
  if (!p.onGround) return null;
  const hb = Game.Collision.worldHitbox(p);
  const px = hb.x + hb.w / 2;
  let best = null;
  let bestDist = Infinity;
  for (const ent of state.entities) {
    if (!ent.interact) continue;
    // 상자·통·그물은 랜턴을 찾는 동안에만 조사할 수 있다 (그 전후에는 그냥 배경)
    if (ent.search && state.flags.quest !== 'active') continue;
    const dist = Math.abs(ent.x + ent.w / 2 - px);
    const sameLevel = hb.y + hb.h > ent.y && hb.y < ent.y + ent.h;
    if (sameLevel && dist <= Game.CONFIG.INTERACT_RANGE && dist < bestDist) {
      best = ent;
      bestDist = dist;
    }
  }
  return best;
};

Game.interact = function (state, ent) {
  if (ent.kind === 'npc') Game.openDialogue(state, ent);
  else if (ent.kind === 'door') Game.useDoor(state, ent);
  else if (ent.kind === 'item') Game.pickUp(state, ent);
  else if (ent.kind === 'object' && ent.search) Game.searchObject(state, ent);
};

Game.useDoor = function (state, door) {
  if (door.requires === 'bag' && !state.flags.hasBag) {
    Game.say(state, '(아차, 가방을 두고 나갈 뻔했네.)', true);
    return;
  }
  Game.loadMap(state, door.to, door.spawnX);
};

// 가방 줍기 → 인벤토리가 생긴다
Game.pickUp = function (state, item) {
  state.entities = state.entities.filter((e) => e !== item);
  state.flags.taken[item.id] = true;
  state.ui.promptTarget = null;
  if (item.id === 'bag') {
    state.flags.hasBag = true;
    state.ui.bagShownAt = performance.now();
    Game.say(state, '(좋아, 가방도 챙겼고.)', true);
    Game.say(state, '(오늘은 부둣가에 일거리가 있으려나.)');
  }
};

// 상자·통·그물 조사
Game.searchObject = function (state, obj) {
  const f = state.flags;
  if (f.quest !== 'active') return;     // 퀘스트 중에만 조사 가능
  if (obj.search.lantern) {
    state.inventory.push('lantern');
    f.quest = 'hasLantern';
    f.searched[obj.id] = true;
    Game.say(state, '(찾았다! 영감님 랜턴이다.)', true);
    Game.say(state, '(얼른 가져다드리자.)');
    return;
  }
  if (f.searched[obj.id]) {
    Game.say(state, '(이미 살펴봤다.)', true);
    return;
  }
  f.searched[obj.id] = true;
  Game.say(state, obj.search.text, true);
};

// ---------- 대화 ----------

// 퀘스트 상태에 맞는 대사 묶음 고르기
Game.dialogueFor = function (state, npcId) {
  const data = Game.DIALOGUES[npcId];
  if (!data) return null;
  const set = data.byQuest[state.flags.quest] || data.byQuest.default;
  return { name: data.name, role: data.role, pages: set.pages, onEnd: set.onEnd };
};

Game.openDialogue = function (state, npc) {
  const d = Game.dialogueFor(state, npc.id);
  if (!d) return;
  const p = state.player;

  // 이동 멈춤 + 서로 마주보기
  Game.stopPlayer(state);
  const playerCenter = p.x + p.w / 2;
  const npcCenter = npc.x + npc.w / 2;
  p.facing = npcCenter > playerCenter ? 'right' : 'left';
  npc.facing = npcCenter > playerCenter ? 'left' : 'right';

  state.ui.mode = 'dialogue';
  state.ui.promptTarget = null;
  state.ui.dialogue = { npcId: npc.id, ...d, page: 0 };
};

// E 또는 Space 로 다음 장, 마지막 장이면 닫고 onEnd 실행
Game.updateDialogue = function (state, input) {
  if (!input.wasPressed('KeyE') && !input.wasPressed('Space')) return;
  const d = state.ui.dialogue;
  d.page += 1;
  if (d.page >= d.pages.length) {
    state.ui.mode = 'explore';
    state.ui.dialogue = null;
    if (d.onEnd) Game.runEvent(state, d.onEnd);
  }
};

// ---------- 퀘스트 이벤트: 조건 → 행동 → 상태 변화 → 결과 ----------

Game.runEvent = function (state, name) {
  const f = state.flags;
  if (name === 'startQuest' && f.quest === 'none') {
    f.quest = 'active';
    Game.say(state, '(랜턴이라... 부둣가 상자나 통 사이에 굴러갔을지도.)', true);
  }
  if (name === 'completeQuest' && f.quest === 'hasLantern') {
    state.inventory = state.inventory.filter((id) => id !== 'lantern');
    f.quest = 'done';
    f.lighthouseLitAt = performance.now();
    Game.say(state, '(등대에 불이 켜졌다!)', true);
  }
};

Game.movePlayer = function (state, input, dt) {
  const C = Game.CONFIG;
  const p = state.player;
  const ax = input.axis().x; // A: -1, D: +1

  // 좌우 이동
  p.vx = ax * C.MOVE_SPEED;
  p.moving = ax !== 0;
  if (ax !== 0) p.facing = ax > 0 ? 'right' : 'left';

  // 점프 (Space) — 땅에 있을 때만
  if (C.JUMP_ENABLED && input.wasPressed('Space') && p.onGround) {
    p.vy = -C.JUMP_SPEED;
    p.onGround = false;
  }

  // 중력
  p.vy = Math.min(p.vy + C.GRAVITY * dt, C.MAX_FALL);

  // x, y 를 따로 움직여야 상자 옆면에서는 막히고 윗면에는 올라설 수 있다
  moveAxis(state, p, p.vx * dt, 0);
  const blockedY = moveAxis(state, p, 0, p.vy * dt);
  if (blockedY) {
    if (p.vy > 0) p.onGround = true;
    p.vy = 0;
  } else {
    p.onGround = false;
  }

  // 걷기 애니메이션 시간
  if (p.moving && p.onGround) p.animTime += dt;
  else if (p.onGround) p.animTime = 0;
};

// 1px 이하로 나눠 움직이며 막히는 지점 바로 앞에서 멈춘다. 막혔으면 true
function moveAxis(state, p, dx, dy) {
  const total = Math.abs(dx || dy);
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  let moved = 0;
  let blocked = false;
  while (moved < total) {
    const step = Math.min(1, total - moved);
    const nx = p.x + sx * step;
    const ny = p.y + sy * step;
    if (Game.Collision.hitsSolid(state, Game.Collision.worldHitbox(p, nx, ny))) {
      blocked = true;
      break;
    }
    p.x = nx;
    p.y = ny;
    moved += step;
  }

  // 안전장치: 어떤 경우에도 맵 밖으로 나가지 않게
  const { HEIGHT } = Game.CONFIG;
  p.x = Math.max(0, Math.min(Game.mapWidth(Game.currentMap(state)) - p.w, p.x));
  p.y = Math.max(0, Math.min(HEIGHT - p.h, p.y));
  return blocked;
}
