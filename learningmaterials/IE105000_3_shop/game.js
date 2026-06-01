/**
 * game.js — AMR Factory Routing Game
 * IE105000 — Operations Research / Logistics
 *
 * Controls: Arrow keys (or WASD)
 * Goal:     Pick up all packages and deliver them while avoiding
 *           collisions with workers and other AMRs.
 * Scoring:  Final time = drive time + (collisions × 10 sec)   (lower = better)
 */

'use strict';

// ── Canvas setup ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
const TILE   = CONFIG.grid.tileSize;   // 32
const COLS   = CONFIG.grid.cols;       // 20
const ROWS   = CONFIG.grid.rows;       // 15

// ── Colour palette (Game Boy–inspired) ───────────────────────────────────────
const C = {
  bg:       '#0f380f',
  floor:    '#306230',
  floorLine:'#0f380f',
  shelf:    '#091809',
  shelfEdge:'#1a4a1a',
  player:   '#9bbc0f',
  playerFrz:'#ff4444',
  amr:      '#4a7a4a',
  worker:   '#c4cfa1',
  pickup:   '#00e5ff',
  dropoff:  '#ff9100',
  carried:  '#ffe000',
  white:    '#ffffff',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Game state ────────────────────────────────────────────────────────────────
let state   = null;
let animId  = null;
let lastTs  = null;
const keys  = {};

// ── AI autopilot state ────────────────────────────────────────────────────────
let aiEnabled  = false;
let aiPath     = [];      // remaining tile waypoints [{tx,ty},...]
let aiWaypoint = null;    // current pixel target {px,py}

// ── Obstacle directions ───────────────────────────────────────────────────────
const DIRS = [
  { vx:  1, vy:  0 },
  { vx: -1, vy:  0 },
  { vx:  0, vy:  1 },
  { vx:  0, vy: -1 },
];

// ── Input ─────────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
    e.preventDefault();
  }
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

// ── Tile collision ────────────────────────────────────────────────────────────
function tileAt(px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return 1;
  return GRID[ty][tx];
}

/** Returns true if the 32×32 sprite at (px,py) occupies only floor tiles. */
function canOccupy(px, py) {
  const m = 3; // margin pixels inside the tile
  return (
    tileAt(px + m,        py + m)        === 0 &&
    tileAt(px + TILE - m, py + m)        === 0 &&
    tileAt(px + m,        py + TILE - m) === 0 &&
    tileAt(px + TILE - m, py + TILE - m) === 0
  );
}

// ── Entity–entity overlap ─────────────────────────────────────────────────────
function overlaps(a, b) {
  const t = TILE * 0.62;
  return Math.abs(a.px - b.px) < t && Math.abs(a.py - b.py) < t;
}

// ── Job zone check ────────────────────────────────────────────────────────────
function playerNearZone(tx, ty) {
  const pcx = state.player.px + TILE / 2;
  const pcy = state.player.py + TILE / 2;
  const zcx = tx * TILE + TILE / 2;
  const zcy = ty * TILE + TILE / 2;
  return Math.abs(pcx - zcx) < TILE * 0.85 && Math.abs(pcy - zcy) < TILE * 0.85;
}

// ── Obstacle AI ───────────────────────────────────────────────────────────────
function updateObstacle(obs, dt) {
  obs.dirTimer -= dt;
  if (obs.dirTimer <= 0) {
    const d = DIRS[Math.floor(Math.random() * 4)];
    obs.vx = d.vx * obs.speed;
    obs.vy = d.vy * obs.speed;
    obs.dirTimer = 0.8 + Math.random() * 2.5;
  }

  // Move; if blocked in current direction, force a direction change next frame
  const nx = obs.px + obs.vx * dt;
  const ny = obs.py + obs.vy * dt;
  if (canOccupy(nx, ny)) {
    obs.px = nx;
    obs.py = ny;
  } else {
    obs.dirTimer = 0;
  }
}

// ── Pathfinding (BFS on tile grid) ───────────────────────────────────────────
function bfsTilePath(fromTx, fromTy, toTx, toTy) {
  if (fromTx === toTx && fromTy === toTy) return [];
  const parent = new Map();
  const queue  = [[fromTx, fromTy]];
  const startKey = `${fromTx},${fromTy}`;
  parent.set(startKey, null);
  const dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
  let found = false;
  outer: while (queue.length) {
    const [cx, cy] = queue.shift();
    for (const {dx, dy} of dirs) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      if (GRID[ny][nx] === 1) continue;
      const key = `${nx},${ny}`;
      if (parent.has(key)) continue;
      parent.set(key, `${cx},${cy}`);
      if (nx === toTx && ny === toTy) { found = true; break outer; }
      queue.push([nx, ny]);
    }
  }
  if (!found) return null;
  const path = [];
  let key = `${toTx},${toTy}`;
  while (key !== startKey) {
    const [tx, ty] = key.split(',').map(Number);
    path.unshift({tx, ty});
    key = parent.get(key);
  }
  return path;
}

// ── AI autopilot logic ────────────────────────────────────────────────────────
function aiGetPlayerTile() {
  return {
    tx: Math.floor((state.player.px + TILE / 2) / TILE),
    ty: Math.floor((state.player.py + TILE / 2) / TILE),
  };
}

function aiSelectTarget() {
  const pt = aiGetPlayerTile();
  if (state.carrying.length < CONFIG.capacity) {
    const pending = state.jobs.filter(j => j.status === 'pending');
    if (pending.length) {
      let best = null, bestD = Infinity;
      for (const job of pending) {
        const d = Math.abs(job.pickup.x - pt.tx) + Math.abs(job.pickup.y - pt.ty);
        if (d < bestD) { bestD = d; best = job.pickup; }
      }
      return best;
    }
  }
  if (state.carrying.length > 0) {
    let best = null, bestD = Infinity;
    for (const id of state.carrying) {
      const job = state.jobs.find(j => j.id === id);
      const d = Math.abs(job.dropoff.x - pt.tx) + Math.abs(job.dropoff.y - pt.ty);
      if (d < bestD) { bestD = d; best = job.dropoff; }
    }
    return best;
  }
  return null;
}

function aiMove(dt) {
  if (!aiWaypoint) {
    const target = aiSelectTarget();
    if (!target) return;
    const pt   = aiGetPlayerTile();
    const path = bfsTilePath(pt.tx, pt.ty, target.x, target.y);
    if (!path || path.length === 0) return;
    aiPath = path;
    const next = aiPath.shift();
    aiWaypoint = { px: next.tx * TILE, py: next.ty * TILE };
  }
  const dx   = aiWaypoint.px - state.player.px;
  const dy   = aiWaypoint.py - state.player.py;
  const dist = Math.hypot(dx, dy);
  const spd  = CONFIG.player.speedPx * dt;
  if (dist <= spd + 0.5) {
    state.player.px = aiWaypoint.px;
    state.player.py = aiWaypoint.py;
    if (aiPath.length > 0) {
      const next = aiPath.shift();
      aiWaypoint = { px: next.tx * TILE, py: next.ty * TILE };
    } else {
      aiWaypoint = null;
    }
  } else {
    state.player.px += (dx / dist) * spd;
    state.player.py += (dy / dist) * spd;
  }
}

function toggleAI() {
  aiEnabled  = !aiEnabled;
  aiPath     = [];
  aiWaypoint = null;
  const btn = document.getElementById('btn-ai');
  btn.textContent = aiEnabled ? '🤖 AI: ON' : '🤖 AI';
  btn.classList.toggle('primary', aiEnabled);
}

// ── Game init ─────────────────────────────────────────────────────────────────
function initGame() {
  if (animId) cancelAnimationFrame(animId);
  lastTs = null;

  const jobs = shuffle(ALL_JOBS).slice(0, CONFIG.jobCount).map((j, i) => ({
    id:      i,
    pickup:  j.pickup,
    dropoff: j.dropoff,
    label:   j.label,
    status:  'pending',   // 'pending' | 'carrying' | 'delivered'
  }));

  state = {
    phase:       'playing',   // 'playing' | 'done'
    startMs:     null,        // set on first frame
    elapsedMs:   0,
    collisions:  0,
    frozenUntil: 0,
    jobs,
    carrying:    [],           // array of job.ids (max CONFIG.capacity)

    player: { px: 1 * TILE, py: 13 * TILE },

    amrs: [
      { px: 17 * TILE, py:  1 * TILE, vx: 0, vy: 0, dirTimer: 0, speed: CONFIG.amrSpeed    },
      { px: 17 * TILE, py:  7 * TILE, vx: 0, vy: 0, dirTimer: 0, speed: CONFIG.amrSpeed    },
    ],
    workers: [
      { px:  9 * TILE, py:  4 * TILE, vx: 0, vy: 0, dirTimer: 0, speed: CONFIG.workerSpeed },
      { px:  5 * TILE, py: 10 * TILE, vx: 0, vy: 0, dirTimer: 0, speed: CONFIG.workerSpeed },
      { px: 13 * TILE, py:  7 * TILE, vx: 0, vy: 0, dirTimer: 0, speed: CONFIG.workerSpeed },
    ],
  };

  aiPath = []; aiWaypoint = null;
  document.getElementById('submit-overlay').classList.remove('active');
  // Render a static preview frame immediately, loop starts via startGame()
  render(performance.now());
  animId = requestAnimationFrame(loop);
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(ts) {
  if (!state.startMs) state.startMs = ts;
  if (lastTs === null) lastTs = ts;
  const dt = Math.min((ts - lastTs) / 1000, 0.08);
  lastTs = ts;

  if (state.phase !== 'playing') return;

  state.elapsedMs = ts - state.startMs;
  const nowMs  = ts;
  const frozen = nowMs < state.frozenUntil;

  // ── Player movement ──
  if (!frozen) {
    if (aiEnabled) {
      aiMove(dt);
    } else {
      const spd = CONFIG.player.speedPx * dt;
      const left  = keys['ArrowLeft']  || keys['a'] || keys['A'];
      const right = keys['ArrowRight'] || keys['d'] || keys['D'];
      const up    = keys['ArrowUp']    || keys['w'] || keys['W'];
      const down  = keys['ArrowDown']  || keys['s'] || keys['S'];

      if (left || right) {
        const dx = (right ? spd : -spd);
        const nx = state.player.px + dx;
        if (canOccupy(nx, state.player.py)) state.player.px = nx;
      }
      if (up || down) {
        const dy = (down ? spd : -spd);
        const ny = state.player.py + dy;
        if (canOccupy(state.player.px, ny)) state.player.py = ny;
      }
    }

    // ── Collision check with all obstacles ──
    const allObs = [...state.amrs, ...state.workers];
    for (const obs of allObs) {
      if (overlaps(state.player, obs)) {
        state.collisions++;
        state.frozenUntil = nowMs + CONFIG.collision.freezeMs;
        break;
      }
    }
  }

  // ── Obstacle movement ──
  for (const obs of [...state.amrs, ...state.workers]) {
    updateObstacle(obs, dt);
  }

  // ── Job interactions ──
  if (!frozen) {
    for (const job of state.jobs) {
      if (job.status === 'pending' && state.carrying.length < CONFIG.capacity) {
        if (playerNearZone(job.pickup.x, job.pickup.y)) {
          job.status = 'carrying';
          state.carrying.push(job.id);
        }
      }
      if (job.status === 'carrying' && state.carrying.includes(job.id)) {
        if (playerNearZone(job.dropoff.x, job.dropoff.y)) {
          job.status   = 'delivered';
          state.carrying = state.carrying.filter(id => id !== job.id);
        }
      }
    }
  }

  // ── Win condition ──
  if (state.jobs.every(j => j.status === 'delivered')) {
    state.phase = 'done';
    showSubmitOverlay();
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
function render(ts) {
  // Clear
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── Draw grid ──
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * TILE, y = row * TILE;
      if (GRID[row][col] === 1) {
        // Shelf / wall
        ctx.fillStyle = C.shelf;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = C.shelfEdge;
        ctx.fillRect(x,          y,          TILE, 2);   // top highlight
        ctx.fillRect(x,          y,          2,    TILE); // left highlight
      } else {
        // Floor with subtle grid lines
        ctx.fillStyle = C.floor;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = C.floorLine;
        ctx.fillRect(x, y, TILE, 1);
        ctx.fillRect(x, y, 1, TILE);
      }
    }
  }

  // ── Draw job zones (pulsing) ──
  const pulse = 0.5 + 0.5 * Math.sin(ts / 280);
  for (const job of state.jobs) {
    if (job.status === 'delivered') continue;
    if (job.status === 'pending') {
      drawZone(job.pickup.x, job.pickup.y, C.pickup, pulse, '▲');
    }
    if (job.status === 'carrying' && state.carrying.includes(job.id)) {
      drawZone(job.dropoff.x, job.dropoff.y, C.dropoff, pulse, '★');
    }
  }

  // ── Draw other AMRs ──
  for (const amr of state.amrs) {
    drawAMR(amr.px, amr.py, C.amr, false, false);
    drawArrow(amr.px, amr.py, amr.vx, amr.vy, C.amr);
  }

  // ── Draw workers ──
  for (const w of state.workers) {
    drawWorker(w.px, w.py);
    drawArrow(w.px, w.py, w.vx, w.vy, C.worker);
  }

  // ── Draw player ──
  const frozen  = ts < state.frozenUntil;
  const blink   = frozen && Math.sin(ts / 90) > 0;  // fast blink when frozen
  const pColor  = blink ? C.bg : (frozen ? C.playerFrz : C.player);
  drawAMR(state.player.px, state.player.py, pColor, true, state.carrying.length);

  // ── HUD ──
  updateHUD();
}

// ── Drawing helpers ───────────────────────────────────────────────────────────
function drawZone(tx, ty, color, pulse, icon) {
  const x = tx * TILE + 2, y = ty * TILE + 2;
  const s = TILE - 4;
  ctx.globalAlpha = 0.28 + 0.28 * pulse;
  ctx.fillStyle   = color;
  ctx.fillRect(x, y, s, s);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.strokeRect(x, y, s, s);
  ctx.fillStyle     = color;
  ctx.font          = 'bold 13px Courier New';
  ctx.textAlign     = 'center';
  ctx.textBaseline  = 'middle';
  ctx.fillText(icon, tx * TILE + TILE / 2, ty * TILE + TILE / 2);
}

function drawAMR(px, py, bodyColor, isPlayer, carrying) {
  const x = px + 2, y = py + 2, s = TILE - 4;

  // Wheels (corner squares)
  ctx.fillStyle = C.bg;
  ctx.fillRect(x,         y,         5, 5);
  ctx.fillRect(x + s - 5, y,         5, 5);
  ctx.fillRect(x,         y + s - 5, 5, 5);
  ctx.fillRect(x + s - 5, y + s - 5, 5, 5);

  // Body
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x + 5, y + 5, s - 10, s - 10);

  // Player indicator dot (front-top centre)
  if (isPlayer && bodyColor !== C.bg) {
    ctx.fillStyle = C.white;
    ctx.fillRect(x + s / 2 - 2, y + 5, 4, 4);
  }

  // Carried package dots (centre): one dot per item
  if (carrying) {
    ctx.fillStyle = C.carried;
    if (carrying >= 2) {
      ctx.fillRect(x + s / 2 - 6, y + s / 2 - 3, 5, 5);
      ctx.fillRect(x + s / 2 + 1, y + s / 2 - 3, 5, 5);
    } else {
      ctx.fillRect(x + s / 2 - 3, y + s / 2 - 3, 6, 6);
    }
  }

  // Player border
  if (isPlayer && bodyColor !== C.bg) {
    ctx.strokeStyle = C.white;
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(x + 5, y + 5, s - 10, s - 10);
  }
}

function drawWorker(px, py) {
  const cx = Math.round(px + TILE / 2);
  const cy = Math.round(py + TILE / 2);
  ctx.fillStyle = C.worker;
  // Head
  ctx.beginPath();
  ctx.arc(cx, cy - 6, 5, 0, Math.PI * 2);
  ctx.fill();
  // Body
  ctx.fillRect(cx - 4, cy - 1, 8, 8);
  // Legs
  ctx.fillRect(cx - 4, cy + 7, 3, 5);
  ctx.fillRect(cx + 1, cy + 7, 3, 5);
}

/** Draw a direction arrow just outside the entity tile, pointing where it's heading. */
function drawArrow(px, py, vx, vy, color) {
  if (vx === 0 && vy === 0) return;
  const cx = px + TILE / 2;
  const cy = py + TILE / 2;
  // Arrow tip sits just outside the tile edge in the movement direction
  const reach = TILE / 2 + 7;
  const tx = cx + Math.sign(vx) * reach;
  const ty = cy + Math.sign(vy) * reach;
  // Perpendicular half-width of the arrowhead
  const hw = 4;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  if (vx !== 0) {
    // Horizontal arrow
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - Math.sign(vx) * 8, ty - hw);
    ctx.lineTo(tx - Math.sign(vx) * 8, ty + hw);
  } else {
    // Vertical arrow
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - hw, ty - Math.sign(vy) * 8);
    ctx.lineTo(tx + hw, ty - Math.sign(vy) * 8);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ── HUD update ────────────────────────────────────────────────────────────────
function updateHUD() {
  if (!state) return;
  const elapsed  = state.elapsedMs / 1000;
  const penalty  = state.collisions * CONFIG.collision.penaltySec;
  const delivered = state.jobs.filter(j => j.status === 'delivered').length;

  document.getElementById('hud-time').textContent    = fmtTime(elapsed);
  document.getElementById('hud-hits').textContent    = state.collisions;
  document.getElementById('hud-penalty').textContent = `+${penalty}s`;
  document.getElementById('hud-total').textContent   = fmtTime(elapsed + penalty);
  document.getElementById('hud-jobs').textContent    = `${delivered}/${state.jobs.length}`;
  document.getElementById('hud-carry').textContent   = `${state.carrying.length}/${CONFIG.capacity}`;

  const icons  = { pending: '○', carrying: '►', delivered: '✓' };
  const colors = { pending: '#306230', carrying: '#9bbc0f', delivered: '#4a6a4a' };
  document.getElementById('job-list').innerHTML =
    state.jobs.map(j =>
      `<div class="job-row" style="color:${colors[j.status]}">
         <span>${icons[j.status]}</span>
         <span>${j.label}</span>
       </div>`
    ).join('');
}

// ── Game over ─────────────────────────────────────────────────────────────────
function showSubmitOverlay() {
  const elapsed  = state.elapsedMs / 1000;
  const penalty  = state.collisions * CONFIG.collision.penaltySec;
  const total    = Math.round(elapsed + penalty);

  document.getElementById('result-time').textContent       = fmtTime(elapsed);
  document.getElementById('result-collisions').textContent = state.collisions;
  document.getElementById('result-penalty').textContent    = `+${state.collisions * CONFIG.collision.penaltySec}s`;
  document.getElementById('result-total').textContent      = fmtTime(total);
  document.getElementById('submit-overlay').classList.add('active');
}

async function submitScore() {
  const name = document.getElementById('input-name').value.trim();
  const sid  = document.getElementById('input-sid').value.trim();
  if (!name) { alert('Please enter your name.'); return; }
  if (!sid)  { alert('Please enter your student ID.'); return; }

  const elapsed = state.elapsedMs / 1000;
  const penalty = state.collisions * CONFIG.collision.penaltySec;

  const payload = {
    student_name: name,
    student_id:   sid,
    elapsed_sec:  Math.round(elapsed),
    collisions:   state.collisions,
    penalty_sec:  Math.round(penalty),
    final_sec:    Math.round(elapsed + penalty),
  };

  const btn = document.getElementById('btn-submit');
  btn.textContent = 'Submitting…';
  btn.disabled    = true;

  try {
    // Use GET + URL params to avoid GAS CORS redirect issues with POST
    const params = new URLSearchParams({ action: 'submit', data: JSON.stringify(payload) });
    await fetch(CONFIG.gasUrl + '?' + params);
    btn.textContent = '✓ Submitted!';
    setTimeout(showLeaderboard, 900);
  } catch (err) {
    btn.textContent = 'Submit';
    btn.disabled    = false;
    alert('Submission failed. Check your connection or GAS URL in config.js.');
  }
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function showLeaderboard() {
  document.getElementById('submit-overlay').classList.remove('active');
  document.getElementById('game-screen').style.display        = 'none';
  document.getElementById('leaderboard-screen').style.display = 'block';
  loadLeaderboard();
  loadComments();
}

// ── Comments ──────────────────────────────────────────────────────────────────
async function loadComments() {
  const list = document.getElementById('comment-list');
  list.innerHTML = '<p class="lb-msg">Loading…</p>';
  try {
    const res  = await fetch(CONFIG.gasUrl + '?action=get_comments');
    const data = await res.json();
    if (!data.length) {
      list.innerHTML = '<p class="lb-msg">No comments yet — be first!</p>';
      return;
    }
    list.innerHTML = data.map(c =>
      `<div class="comment-card">
         <div class="comment-meta">${c.student_name} &nbsp;·&nbsp; ${String(c.posted_at).substring(0, 16)}</div>
         <div class="comment-body">${c.comment}</div>
       </div>`
    ).join('');
  } catch {
    list.innerHTML = '<p class="lb-err">Failed to load comments.</p>';
  }
}

async function submitComment() {
  const name = document.getElementById('comment-name').value.trim();
  const text = document.getElementById('comment-text').value.trim();
  if (!name) { alert('Please enter your name.'); return; }
  if (!text) { alert('Please enter a comment.'); return; }

  const payload = { student_name: name, comment: text };
  const params  = new URLSearchParams({ action: 'save_comment', data: JSON.stringify(payload) });
  try {
    await fetch(CONFIG.gasUrl + '?' + params);
    document.getElementById('comment-text').value = '';
    loadComments();
  } catch {
    alert('Failed to post comment. Check your connection.');
  }
}

async function loadLeaderboard() {
  const tbody = document.getElementById('lb-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="lb-msg">Loading…</td></tr>';

  if (CONFIG.gasUrl === 'YOUR_GAS_WEB_APP_URL') {
    tbody.innerHTML = '<tr><td colspan="6" class="lb-err">Set CONFIG.gasUrl in config.js first.</td></tr>';
    return;
  }

  try {
    const res  = await fetch(CONFIG.gasUrl + '?action=leaderboard');
    const data = await res.json();
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="lb-msg">No submissions yet — be first!</td></tr>';
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    tbody.innerHTML = data.map((r, i) =>
      `<tr>
        <td>${medals[i] || i + 1}</td>
        <td>[${r.student_id}] ${r.student_name}</td>
        <td><strong>${fmtTime(Number(r.final_sec))}</strong></td>
        <td>${r.elapsed_sec}s</td>
        <td>${r.collisions}</td>
        <td>${(r.submitted_at || '').substring(0, 16)}</td>
      </tr>`
    ).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="lb-err">Failed to load. Check GAS deployment.</td></tr>';
  }
}

function showGame() {
  document.getElementById('leaderboard-screen').style.display = 'none';
  document.getElementById('game-screen').style.display        = 'block';
}

// ── Main loop ─────────────────────────────────────────────────────────────────
function loop(ts) {
  update(ts);
  render(ts);
  if (state.phase === 'playing') {
    animId = requestAnimationFrame(loop);
  }
}

// ── Start gate ────────────────────────────────────────────────────────────────
function startGame() {
  document.getElementById('start-overlay').classList.remove('active');
  initGame();
}

// ── Boot (prepare state but wait for Start button) ────────────────────────────
// Render a static preview of the map so the canvas isn't blank
initGame();
if (animId) { cancelAnimationFrame(animId); animId = null; }

// ── D-pad pointer controls (touch + mouse) ────────────────────────────────────
document.querySelectorAll('.dpad-btn').forEach(btn => {
  const key = btn.dataset.key;
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    keys[key] = true;
    btn.setPointerCapture(e.pointerId);
    btn.classList.add('pressed');
  });
  btn.addEventListener('pointerup', e => {
    e.preventDefault();
    keys[key] = false;
    btn.classList.remove('pressed');
  });
  btn.addEventListener('pointercancel', () => { keys[key] = false; btn.classList.remove('pressed'); });
  btn.addEventListener('pointerleave',  () => { keys[key] = false; btn.classList.remove('pressed'); });
});
