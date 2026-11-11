// 매 프레임 상태를 바꾸는 규칙. 그리지 않는다.

Game.update = function (state, input, dt) {
  // 대화 중: 이동하지 않고 대화창만 넘긴다
  if (state.ui.mode === 'dialogue') {
    Game.updateDialogue(state, input);
    return;
  }

  Game.movePlayer(state, input, dt);
  Game.updateCamera(state);
  Game.npcsNoticePlayer(state);

  // 가까운 NPC·문 찾기 → "E 대화하기" 표시 대상
  const target = Game.findInteractTarget(state);
  state.ui.promptTarget = target ? target.id : null;
  if (target && input.wasPressed('KeyE')) Game.interact(state, target);
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
  else if (ent.kind === 'door') Game.loadMap(state, ent.to, ent.spawnX);
};

// ---------- 대화 ----------

Game.openDialogue = function (state, npc) {
  const data = Game.DIALOGUES[npc.id];
  if (!data) return;
  const p = state.player;

  // 이동 멈춤 + 서로 마주보기
  p.vx = 0;
  p.moving = false;
  p.animTime = 0;
  const playerCenter = p.x + p.w / 2;
  const npcCenter = npc.x + npc.w / 2;
  p.facing = npcCenter > playerCenter ? 'right' : 'left';
  npc.facing = npcCenter > playerCenter ? 'left' : 'right';

  state.ui.mode = 'dialogue';
  state.ui.promptTarget = null;
  state.ui.dialogue = { npcId: npc.id, name: data.name, role: data.role, pages: data.pages, page: 0 };
};

// E 또는 Space 로 다음 장, 마지막 장이면 닫기
Game.updateDialogue = function (state, input) {
  if (!input.wasPressed('KeyE') && !input.wasPressed('Space')) return;
  const d = state.ui.dialogue;
  d.page += 1;
  if (d.page >= d.pages.length) {
    state.ui.mode = 'explore';
    state.ui.dialogue = null;
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
