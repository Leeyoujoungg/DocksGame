// 충돌 판정만 담당한다.

Game.Collision = (function () {
  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // 엔티티의 충돌 영역을 월드 좌표로 (hitbox 가 없으면 전체 크기)
  function worldHitbox(ent, x = ent.x, y = ent.y) {
    const hb = ent.hitbox || { x: 0, y: 0, w: ent.w, h: ent.h };
    return { x: x + hb.x, y: y + hb.y, w: hb.w, h: hb.h };
  }

  // 지금 충돌에 쓰이는 모든 사각형: 벽·바닥·천장 + solid 엔티티
  function solidRects(state) {
    const rects = state.solids.slice();
    for (const ent of state.entities) if (ent.solid) rects.push(worldHitbox(ent));
    return rects;
  }

  function hitsSolid(state, rect) {
    return solidRects(state).some((s) => overlaps(rect, s));
  }

  // rect 바로 아래에서 가장 가까운 바닥 높이 (그림자 위치 계산용)
  function groundBelow(state, rect) {
    let best = Infinity;
    for (const s of solidRects(state)) {
      if (s.x < rect.x + rect.w && s.x + s.w > rect.x && s.y >= rect.y + rect.h - 0.5) {
        best = Math.min(best, s.y);
      }
    }
    return best;
  }

  return { overlaps, worldHitbox, solidRects, hitsSolid, groundBelow };
})();
