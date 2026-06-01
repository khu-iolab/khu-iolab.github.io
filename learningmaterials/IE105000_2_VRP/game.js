/**
 * game.js — VRP City Delivery main game logic.
 */

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  phase: 'setup',         // 'setup' | 'planning' | 'animating' | 'result'
  numVehicles:  CONFIG.defaults.numVehicles,
  numShipments: CONFIG.defaults.numShipments,
  seed: null,
  scenario: null,         // { locations, shipments, vehicles }
  routes: {},             // { v1: ['p1','d1',...], v2: [...] }
  activeVehicle: null,
  hoveredStop: null,
  evaluation: null,
  optimal: null,
  submitted: false,
  animStart: null,
  animDuration: 3500,
  animT: 0,
  animResolve: null,
};

// ── Canvas ────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('map-canvas');
const ctx    = canvas.getContext('2d');

const _deliveryImg = new Image();
_deliveryImg.src = 'delivery.png';
const PAD    = 48;
const STOP_R = 15;
const DEPOT_R = 18;

function toCanvasX(gx) { return PAD + (gx / 10) * (canvas.width  - 2 * PAD); }
function toCanvasY(gy) { return PAD + ((10 - gy) / 10) * (canvas.height - 2 * PAD); }

function resizeCanvas() {
  const c = document.getElementById('map-container');
  canvas.width  = c.clientWidth;
  canvas.height = c.clientHeight;
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  canvas.addEventListener('click',     onCanvasClick);
  canvas.addEventListener('mousemove', onCanvasHover);
  canvas.addEventListener('mouseleave', () => { state.hoveredStop = null; });
  window.addEventListener('resize', resizeCanvas);
  document.getElementById('btn-new-game').addEventListener('click', showSetup);
  document.getElementById('btn-leaderboard').addEventListener('click', openLeaderboard);
  updateSetupUI();
  requestAnimationFrame(gameLoop);
});

// ── Setup ─────────────────────────────────────────────────────────────────────
function changeVehicles(delta) {
  state.numVehicles = Math.max(1, Math.min(3, state.numVehicles + delta));
  updateSetupUI();
}
function changeShipments(delta) {
  state.numShipments = Math.max(2, Math.min(6, state.numShipments + delta));
  updateSetupUI();
}
function updateSetupUI() {
  document.getElementById('setup-vehicles').textContent  = state.numVehicles;
  document.getElementById('setup-shipments').textContent = state.numShipments;
}

function showSetup() {
  state.phase   = 'setup';
  state.scenario = null;
  document.getElementById('setup-panel').classList.remove('hidden');
  document.getElementById('game-area').classList.add('hidden');
  document.getElementById('result-overlay').classList.add('hidden');
}

function startGame() {
  state.seed      = Math.floor(Math.random() * 999999);
  state.scenario  = generateScenario(state.numVehicles, state.numShipments, state.seed);
  state.routes    = {};
  for (const vid of Object.keys(state.scenario.vehicles)) state.routes[vid] = [];
  state.activeVehicle = Object.keys(state.scenario.vehicles)[0];
  state.submitted = false;
  state.evaluation = null;
  state.optimal    = null;
  state.phase     = 'planning';

  document.getElementById('setup-panel').classList.add('hidden');
  document.getElementById('game-area').classList.remove('hidden');
  document.getElementById('result-overlay').classList.add('hidden');
  document.getElementById('info-vehicles').textContent  = state.numVehicles;
  document.getElementById('info-shipments').textContent = state.numShipments;

  resizeCanvas();
  buildVehiclePanels();
  updateVehiclePanels();
  updateSubmitBtn();
}

// ── Vehicle panels ────────────────────────────────────────────────────────────
function buildVehiclePanels() {
  const { vehicles } = state.scenario;
  document.getElementById('vehicle-panels').innerHTML =
    Object.values(vehicles).map(v => `
      <div class="veh-panel" id="panel-${v.id}" onclick="selectVehicle('${v.id}')"
           style="--veh-color:${v.color}">
        <div class="veh-header">
          <span class="veh-dot" style="background:${v.color}"></span>
          <span class="veh-name">${v.name}</span>
          <span class="veh-cap" id="cap-${v.id}"></span>
        </div>
        <div class="veh-stops" id="stops-${v.id}"></div>
        <div class="veh-dist"  id="dist-${v.id}">0.00 km</div>
      </div>`).join('');
}

function selectVehicle(vid) {
  state.activeVehicle = vid;
  updateVehiclePanels();
}

function updateVehiclePanels() {
  if (!state.scenario) return;
  const { locations, shipments, vehicles } = state.scenario;

  for (const [vid, v] of Object.entries(vehicles)) {
    const panel   = document.getElementById(`panel-${vid}`);
    const stopIds = state.routes[vid] || [];
    if (!panel) continue;

    panel.classList.toggle('active', vid === state.activeVehicle);

    const load = stopIds.filter(id => locations[id]?.type === 'pickup').length;
    document.getElementById(`cap-${vid}`).textContent = `${load}/${v.capacity}`;

    const stopsEl = document.getElementById(`stops-${vid}`);
    if (!stopIds.length) {
      stopsEl.innerHTML = '<span class="veh-empty">No stops assigned</span>';
    } else {
      stopsEl.innerHTML = stopIds.map((sid, i) => {
        const loc = locations[sid];
        const col = CONFIG.pairColors[(loc.pairNum - 1) % CONFIG.pairColors.length];
        const arrow = loc.type === 'pickup' ? '↑' : '↓';
        return `<span class="veh-stop-chip" style="border-color:${col}"
                     title="${loc.name}" onclick="removeStop(event,'${vid}',${i})">
                  ${arrow}${loc.pairNum} ${loc.name}
                </span>`;
      }).join('');
    }

    const d = routeDistance(stopIds, locations);
    document.getElementById(`dist-${vid}`).textContent = `${d.toFixed(2)} km`;

    const { feasible } = checkRoute(stopIds, vid, locations, shipments, vehicles);
    panel.classList.toggle('violation', !feasible && stopIds.length > 0);
  }

  updateHint();
}

function updateHint() {
  const total  = Object.values(state.routes).reduce((s, r) => s + r.length, 0);
  const needed = state.numShipments * 2;
  const vid    = state.activeVehicle;
  const vName  = state.scenario?.vehicles[vid]?.name ?? '';
  const el     = document.getElementById('assignment-hint');
  if (total === needed) {
    el.textContent = '✅ All stops assigned — ready to submit!';
  } else {
    el.textContent = `${vName} selected — click stops on map to assign (${needed - total} remaining)`;
  }
}

function removeStop(event, vid, idx) {
  event.stopPropagation();
  state.routes[vid].splice(idx, 1);
  updateVehiclePanels();
  updateSubmitBtn();
}

function resetRoutes() {
  for (const vid of Object.keys(state.routes)) state.routes[vid] = [];
  updateVehiclePanels();
  updateSubmitBtn();
}

// ── Canvas interaction ────────────────────────────────────────────────────────
function hitTest(cx, cy) {
  if (!state.scenario) return null;
  for (const loc of Object.values(state.scenario.locations)) {
    if (Math.hypot(cx - toCanvasX(loc.x), cy - toCanvasY(loc.y)) < STOP_R + 6) return loc.id;
  }
  return null;
}

function onCanvasClick(e) {
  if (state.phase !== 'planning') return;
  const r   = canvas.getBoundingClientRect();
  const hit = hitTest(e.clientX - r.left, e.clientY - r.top);
  if (!hit || !state.activeVehicle) return;

  const vid = state.activeVehicle;
  const idx = state.routes[vid].indexOf(hit);

  if (idx !== -1) {
    state.routes[vid].splice(idx, 1);
  } else {
    // Remove from any other vehicle first
    for (const stops of Object.values(state.routes)) {
      const i = stops.indexOf(hit);
      if (i !== -1) stops.splice(i, 1);
    }
    state.routes[vid].push(hit);
  }

  updateVehiclePanels();
  updateSubmitBtn();
}

function onCanvasHover(e) {
  const r = canvas.getBoundingClientRect();
  state.hoveredStop = hitTest(e.clientX - r.left, e.clientY - r.top);
  canvas.style.cursor = state.hoveredStop ? 'pointer' : 'default';
}

function updateSubmitBtn() {
  const total  = Object.values(state.routes).reduce((s, r) => s + r.length, 0);
  const needed = state.numShipments * 2;
  document.getElementById('btn-submit').disabled = total < needed;
}

// ── Submit & solve ────────────────────────────────────────────────────────────
async function submitSolution() {
  if (state.phase !== 'planning') return;
  const { locations, shipments, vehicles } = state.scenario;

  document.getElementById('btn-submit').disabled = true;
  document.getElementById('btn-submit').textContent = 'Solving…';

  // Run solver in a microtask so the UI updates first
  await new Promise(r => setTimeout(r, 50));

  state.evaluation = evaluateSolution(state.routes, locations, shipments, vehicles);
  state.optimal    = solve(locations, shipments, vehicles);
  state.phase      = 'animating';

  // Truck animation
  await animateTrucks();

  state.phase = 'result';
  showResult();
}

// ── Truck animation ───────────────────────────────────────────────────────────
function animateTrucks() {
  return new Promise(resolve => {
    state.animStart   = null;   // set on first frame
    state.animT       = 0;
    state.animResolve = resolve;
  });
}

// ── Result overlay ────────────────────────────────────────────────────────────
function showResult() {
  const ev  = state.evaluation;
  const opt = state.optimal;

  const gapNum = ev.feasible
    ? ((ev.totalDistance - opt.totalDistance) / opt.totalDistance * 100)
    : null;
  const gap   = gapNum !== null ? gapNum.toFixed(1) : '—';
  const score = ev.feasible ? Math.round(1000 * opt.totalDistance / ev.totalDistance) : 0;

  document.getElementById('result-title').innerHTML = ev.feasible
    ? `🎯 Score: <span style="color:#81c784">${score}</span> / 1000`
    : '❌ Infeasible Solution';

  document.getElementById('result-stats').innerHTML = `
    <div class="res-row"><span>Your distance</span><strong>${ev.totalDistance.toFixed(2)} km</strong></div>
    <div class="res-row"><span>Optimal distance</span><strong>${opt.totalDistance.toFixed(2)} km</strong></div>
    <div class="res-row"><span>Gap from optimal</span>
      <strong class="${gapNum !== null && gapNum <= 5 ? 'green' : 'red'}">${gap}%</strong></div>
    ${!ev.feasible ? `<div class="violations-list">${ev.violations.slice(0, 6).map(v => `<div class="viol-item">⚠ ${v}</div>`).join('')}</div>` : ''}
  `;

  const submitBtn = document.getElementById('btn-submit-score');
  submitBtn.onclick = () => submitToLeaderboard(score, gapNum ?? 999);

  document.getElementById('result-overlay').classList.remove('hidden');
}

async function submitToLeaderboard(score, gapNum) {
  if (state.submitted) return;
  const studentId = document.getElementById('student-id').value.trim();
  const name      = document.getElementById('player-name').value.trim();
  if (!studentId) { toast('학번을 입력하세요!'); return; }
  if (!name)      { toast('이름을 입력하세요!'); return; }

  const url = CONFIG.gasUrl;
  if (!url || url === 'YOUR_GAS_WEB_APP_URL') { toast('Leaderboard not configured.'); return; }

  state.submitted = true;
  const btn = document.getElementById('btn-submit-score');
  btn.textContent = '등록 중…';
  btn.disabled = true;

  const payload = {
    student_id:          studentId,
    student_name:        name,
    total_distance:      state.evaluation.totalDistance,
    reference_distance:  state.optimal.totalDistance,
    gap_pct:             gapNum,
    score,
    feasible:            state.evaluation.feasible,
    routes_json:         JSON.stringify(state.routes),
    n_violations:        state.evaluation.violations.length,
    seed:                state.seed,
    num_vehicles:        state.numVehicles,
    num_shipments:       state.numShipments,
  };

  try {
    const params = new URLSearchParams({ action: 'submit', data: JSON.stringify(payload) });
    await fetch(url + '?' + params);

    document.getElementById('submit-section').style.display = 'none';
    document.getElementById('rank-result').style.display    = 'block';

    const res  = await fetch(url + '?action=leaderboard');
    const data = await res.json();
    const rank = data.filter(r => Number(r.score) > score).length + 1;
    document.getElementById('rank-result').innerHTML =
      `✅ <strong>${name}</strong> 님 등록 완료!<br>🏆 현재 순위: <strong>${rank}등 / ${data.length}명</strong>`;
  } catch {
    state.submitted = false;
    btn.textContent = '🏆 Submit to Leaderboard';
    btn.disabled    = false;
    toast('❌ 제출 실패. 다시 시도하세요.');
  }
}

function playAgain() {
  state.submitted = false;
  const btn = document.getElementById('btn-submit-score');
  btn.textContent = '🏆 Submit to Leaderboard';
  btn.disabled    = false;
  document.getElementById('submit-section').style.display = '';
  document.getElementById('rank-result').style.display    = 'none';
  showSetup();
}

// ── Leaderboard screen ────────────────────────────────────────────────────────
function openLeaderboard() {
  const url = CONFIG.gasUrl;
  if (!url || url === 'YOUR_GAS_WEB_APP_URL') { toast('Leaderboard not configured.'); return; }
  document.getElementById('setup-panel').classList.add('hidden');
  document.getElementById('game-area').classList.add('hidden');
  document.getElementById('result-overlay').classList.add('hidden');
  document.getElementById('leaderboard-screen').style.display = 'flex';
  Promise.all([loadLeaderboard(), loadComments()]);
}

function closeLeaderboard() {
  document.getElementById('leaderboard-screen').style.display = 'none';
  if (!state.scenario || state.phase === 'setup') {
    document.getElementById('setup-panel').classList.remove('hidden');
  } else {
    document.getElementById('game-area').classList.remove('hidden');
    if (state.phase === 'result') document.getElementById('result-overlay').classList.remove('hidden');
  }
}

async function loadLeaderboard() {
  const tbody = document.getElementById('lb-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="lb-msg">Loading…</td></tr>';
  try {
    const res  = await fetch(CONFIG.gasUrl + '?action=leaderboard');
    const data = await res.json();
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="6" class="lb-msg">No submissions yet!</td></tr>'; return; }
    const medals = ['🥇', '🥈', '🥉'];
    tbody.innerHTML = data.slice(0, 10).map((r, i) => `
      <tr>
        <td>${medals[i] ?? (i + 1)}</td>
        <td>${r.student_name}</td>
        <td class="green">${Number(r.score).toFixed(0)}</td>
        <td>${Number(r.gap_pct).toFixed(1)}%</td>
        <td>${r.num_shipments}</td>
        <td>${r.num_vehicles}</td>
      </tr>`).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="6" class="lb-msg">Failed to load leaderboard.</td></tr>';
  }
}

async function loadComments() {
  const list = document.getElementById('comment-list');
  if (!list) return;
  list.innerHTML = '<p class="lb-msg">Loading…</p>';
  try {
    const res  = await fetch(CONFIG.gasUrl + '?action=get_comments');
    const data = await res.json();
    if (!data.length) { list.innerHTML = '<p class="lb-msg">No comments yet — be first!</p>'; return; }
    list.innerHTML = data.map(c => `
      <div class="comment-card">
        <div class="comment-meta">${c.student_name} · ${String(c.posted_at).substring(0, 16)}</div>
        <div class="comment-body">${c.comment}</div>
      </div>`).join('');
  } catch {
    list.innerHTML = '<p class="lb-msg">Failed to load comments.</p>';
  }
}

async function submitComment() {
  const name = document.getElementById('comment-name').value.trim();
  const text = document.getElementById('comment-text').value.trim();
  if (!name) { toast('이름을 입력하세요!'); return; }
  if (!text) { toast('댓글을 입력하세요!'); return; }
  const params = new URLSearchParams({
    action: 'save_comment',
    data: JSON.stringify({ student_name: name, comment: text }),
  });
  try {
    await fetch(CONFIG.gasUrl + '?' + params);
    document.getElementById('comment-text').value = '';
    loadComments();
  } catch {
    toast('❌ 댓글 등록 실패.');
  }
}

// ── Render loop ───────────────────────────────────────────────────────────────
function gameLoop(ts) {
  if (state.phase !== 'setup') render(ts);
  requestAnimationFrame(gameLoop);
}

function render(ts) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.scenario) return;

  // Advance animation
  if (state.phase === 'animating') {
    if (!state.animStart) state.animStart = ts;
    state.animT = Math.min((ts - state.animStart) / state.animDuration, 1);
    if (state.animT >= 1 && state.animResolve) {
      const resolve = state.animResolve;
      state.animResolve = null;
      resolve();
    }
  }

  drawGrid();
  drawOptimalRoutes();
  drawRoutes();
  drawDepot();
  drawStops();
  if (state.phase === 'animating') drawTrucks();
}

// ── Drawing helpers ───────────────────────────────────────────────────────────
function drawGrid() {
  ctx.strokeStyle = 'rgba(42,63,85,0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    ctx.beginPath(); ctx.moveTo(toCanvasX(i), PAD); ctx.lineTo(toCanvasX(i), canvas.height - PAD); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD, toCanvasY(i)); ctx.lineTo(canvas.width - PAD, toCanvasY(i)); ctx.stroke();
  }
}

function drawOptimalRoutes() {
  if (state.phase !== 'result' || !state.optimal?.routes) return;
  const { locations, vehicles } = state.scenario;

  for (const [vid, stopIds] of Object.entries(state.optimal.routes)) {
    if (!stopIds?.length) continue;
    const color = vehicles[vid].color;
    const pts   = ['depot', ...stopIds, 'depot'].map(id =>
      ({ x: toCanvasX(getLoc(id, locations).x), y: toCanvasY(getLoc(id, locations).y) })
    );
    ctx.beginPath();
    ctx.strokeStyle = color + '55';
    ctx.lineWidth   = 4;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawRoutes() {
  if (!state.scenario) return;
  const { locations, vehicles } = state.scenario;
  const isResult = state.phase === 'result';

  for (const [vid, stopIds] of Object.entries(state.routes)) {
    if (!stopIds.length) continue;
    const color = vehicles[vid].color;
    const pts   = ['depot', ...stopIds, 'depot'].map(id =>
      ({ x: toCanvasX(getLoc(id, locations).x), y: toCanvasY(getLoc(id, locations).y) })
    );

    ctx.beginPath();
    ctx.strokeStyle = color + (isResult ? 'cc' : 'bb');
    ctx.lineWidth   = 2.5;
    ctx.setLineDash([8, 4]);
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow heads
    for (let i = 0; i < pts.length - 1; i++) {
      drawArrow(pts[i], pts[i + 1], color);
    }
  }
}

function drawArrow(from, to, color) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 20) return;
  const mx = from.x + dx * 0.55, my = from.y + dy * 0.55;
  const ux = dx / len, uy = dy / len;
  const s = 7;
  ctx.beginPath();
  ctx.moveTo(mx + ux * s, my + uy * s);
  ctx.lineTo(mx - ux * s - uy * s, my - uy * s + ux * s);
  ctx.lineTo(mx - ux * s + uy * s, my - uy * s - ux * s);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawDepot() {
  const cx = toCanvasX(CONFIG.depot.x), cy = toCanvasY(CONFIG.depot.y);
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, DEPOT_R * 2);
  grd.addColorStop(0, 'rgba(79,195,247,0.25)');
  grd.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(cx, cy, DEPOT_R * 2, 0, Math.PI * 2);
  ctx.fillStyle = grd; ctx.fill();

  ctx.beginPath(); ctx.arc(cx, cy, DEPOT_R, 0, Math.PI * 2);
  ctx.fillStyle = '#1a2635'; ctx.fill();
  ctx.strokeStyle = '#4fc3f7'; ctx.lineWidth = 2.5; ctx.stroke();

  ctx.font = '15px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🏭', cx, cy);

  ctx.font = 'bold 9px sans-serif';
  ctx.fillStyle = '#4fc3f7';
  ctx.fillText('DEPOT', cx, cy + DEPOT_R + 11);
}

function drawStops() {
  if (!state.scenario) return;
  const { locations, vehicles } = state.scenario;

  for (const loc of Object.values(locations)) {
    const cx  = toCanvasX(loc.x), cy = toCanvasY(loc.y);
    const col = CONFIG.pairColors[(loc.pairNum - 1) % CONFIG.pairColors.length];
    const isHovered = state.hoveredStop === loc.id;

    let assignedVeh = null;
    for (const [vid, stops] of Object.entries(state.routes)) {
      if (stops.includes(loc.id)) { assignedVeh = vid; break; }
    }
    const vehColor = assignedVeh ? vehicles[assignedVeh].color : null;
    const isActive = assignedVeh === state.activeVehicle;

    // Hover / active glow
    if (isHovered || isActive) {
      ctx.beginPath(); ctx.arc(cx, cy, STOP_R + 9, 0, Math.PI * 2);
      ctx.fillStyle = (vehColor ?? col) + '33'; ctx.fill();
    }

    // Vehicle assignment ring
    if (assignedVeh) {
      ctx.beginPath(); ctx.arc(cx, cy, STOP_R + 4, 0, Math.PI * 2);
      ctx.strokeStyle = vehColor; ctx.lineWidth = 3; ctx.stroke();
    }

    const alpha = assignedVeh ? 'ff' : 'aa';

    if (loc.type === 'pickup') {
      // Circle
      ctx.beginPath(); ctx.arc(cx, cy, STOP_R, 0, Math.PI * 2);
      ctx.fillStyle = col + alpha; ctx.fill();
      ctx.strokeStyle = '#fff2'; ctx.lineWidth = 1.5; ctx.stroke();
    } else {
      // Diamond
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
      const s = STOP_R * 0.88;
      ctx.beginPath(); ctx.rect(-s, -s, s * 2, s * 2);
      ctx.fillStyle = col + alpha; ctx.fill();
      ctx.strokeStyle = '#fff2'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }

    // Number
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.fillText(String(loc.pairNum), cx, cy);

    // Tooltip on hover
    if (isHovered) {
      const typeLabel = loc.type === 'pickup' ? '↑ Pickup' : '↓ Delivery';
      const label = `${typeLabel} #${loc.pairNum}: ${loc.name}`;
      ctx.font = '11px sans-serif';
      const tw = ctx.measureText(label).width;
      const bx = cx - tw / 2 - 6, by = cy + STOP_R + 4;
      ctx.fillStyle = 'rgba(15,25,35,0.9)';
      ctx.beginPath();
      ctx.roundRect(bx, by, tw + 12, 18, 4);
      ctx.fill();
      ctx.fillStyle = '#e8edf2';
      ctx.fillText(label, cx, by + 9);
    }
  }
}

function drawTrucks() {
  const { locations, vehicles } = state.scenario;
  const t = state.animT;

  for (const [vid, stopIds] of Object.entries(state.routes)) {
    if (!stopIds.length) continue;
    const color = vehicles[vid].color;
    const pts   = ['depot', ...stopIds, 'depot'].map(id => {
      const loc = getLoc(id, locations);
      return { x: toCanvasX(loc.x), y: toCanvasY(loc.y) };
    });

    // Total route distance in canvas pixels
    let totalLen = 0;
    for (let i = 0; i < pts.length - 1; i++)
      totalLen += Math.hypot(pts[i+1].x - pts[i].x, pts[i+1].y - pts[i].y);

    // Find position at t * totalLen
    let target = t * totalLen, cumLen = 0;
    let tx = pts[0].x, ty = pts[0].y;
    for (let i = 0; i < pts.length - 1; i++) {
      const segLen = Math.hypot(pts[i+1].x - pts[i].x, pts[i+1].y - pts[i].y);
      if (cumLen + segLen >= target) {
        const frac = (target - cumLen) / segLen;
        tx = pts[i].x + (pts[i+1].x - pts[i].x) * frac;
        ty = pts[i].y + (pts[i+1].y - pts[i].y) * frac;
        break;
      }
      cumLen += segLen;
    }

    // Draw delivery motorcycle
    const s = 34;
    if (_deliveryImg.complete && _deliveryImg.naturalWidth) {
      ctx.drawImage(_deliveryImg, tx - s * 1.4, ty - s, s * 2.8, s * 2);
    } else {
      ctx.beginPath(); ctx.arc(tx, ty, 9, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    }
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let _toastTimer;
function toast(msg, duration = 2500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}
