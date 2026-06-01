// app.js — UI logic for IE315000 Lab #3: Safety Inventory & Bullwhip Effect

// ── State ─────────────────────────────────────────────────────────────────────
let _orderChart = null;
let _invChart   = null;
let _simInited  = false;
let _pendingSubmit = null;
let _sidTimer   = null;

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  _fillParamsTable();
  showTab('scenario');
  loadLeaderboard();
  loadComments();
});

function _fillParamsTable() {
  const rows = [
    ['Simulation horizon',    `${CFG.T} weeks (1 year)`],
    ['Demand distribution',   `Normal(μ=${CFG.mu}, σ=${CFG.sigma}) units/week`],
    ['Retailer lead time',    `${CFG.leadTime} weeks`],
    ['Initial inventory I₀',  `${CFG.I0} units`],
    ['Holding cost (h)',       `$${CFG.h}/unit/week`],
    ['Ordering cost (K)',      `$${CFG.K}/order`],
    ['Backlog penalty (p)',    `$${CFG.p}/unit/week`],
    ['Bullwhip weight',        `$${CFG.bullwhipWeight.toLocaleString()}/unit ratio`],
    ['ROP range',              `${CFG.ropMin} – ${CFG.ropMax}`],
    ['Q range',                `${CFG.qMin} – ${CFG.qMax}`],
  ];
  document.getElementById('params-table').innerHTML = rows
    .map(([k, v]) => `<tr><td>${k}</td><td style="text-align:right">${v}</td></tr>`)
    .join('');
}

// ── Tab management ────────────────────────────────────────────────────────────
function showTab(id) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${id}`));

  if (id === 'simulate' && !_simInited) _initSimulate();
  if (id === 'answering') _resetAnsweringTab();
  if (id === 'leaderboard') loadLeaderboard();
}

function tryShowTab(id) {
  const lock = CFG.lock;
  if (!lock.tabs.includes(id)) { showTab(id); return; }

  const today = new Date().toISOString().slice(0, 10);
  if (today >= lock.unlockDate || sessionStorage.getItem('tabsUnlocked') === '1') {
    showTab(id);
  } else {
    document.getElementById('lock-pw-err').textContent = '';
    document.getElementById('lock-pw-input').value = '';
    const m = document.getElementById('lock-modal');
    m.style.display = 'flex';
    setTimeout(() => document.getElementById('lock-pw-input').focus(), 100);
    m._targetTab = id;
  }
}

function submitLockPassword() {
  const val = document.getElementById('lock-pw-input').value.trim();
  if (val === CFG.lock.password) {
    sessionStorage.setItem('tabsUnlocked', '1');
    document.getElementById('lock-modal').style.display = 'none';
    const target = document.getElementById('lock-modal')._targetTab || 'answering';
    showTab(target);
  } else {
    document.getElementById('lock-pw-err').textContent = 'Incorrect password. Try again.';
  }
}

// ── Simulate tab ──────────────────────────────────────────────────────────────
function _initSimulate() {
  _simInited = true;

  // Set slider defaults
  document.getElementById('sim-rop').value = CFG.defaultROP;
  document.getElementById('sim-q').value   = CFG.defaultQ;
  document.getElementById('sim-rop-val').textContent = CFG.defaultROP;
  document.getElementById('sim-q-val').textContent   = CFG.defaultQ;

  // Create charts
  _orderChart = new Chart(document.getElementById('order-canvas'), {
    type: 'line',
    data: { labels: [], datasets: [
      { label: 'Customer Demand', data: [], borderColor: '#1e293b', borderWidth: 1.5,
        pointRadius: 0, tension: 0.2 },
      { label: 'Retailer Orders', data: [], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.15)',
        borderWidth: 1.5, pointRadius: 0, fill: true, tension: 0 },
      { label: 'Distributor Orders', data: [], borderColor: '#a855f7', borderWidth: 1.5,
        pointRadius: 0, tension: 0 },
    ]},
    options: _chartOpts('Units', true),
  });

  _invChart = new Chart(document.getElementById('inv-canvas'), {
    type: 'line',
    data: { labels: [], datasets: [
      { label: 'On-hand Inventory', data: [], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.1)',
        borderWidth: 1.5, pointRadius: 0, fill: true, tension: 0.2 },
      { label: 'Backlog', data: [], borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.12)',
        borderWidth: 1.5, pointRadius: 0, fill: true, tension: 0.2 },
    ]},
    options: _chartOpts('Units', false),
  });

  _runAndDisplay(CFG.defaultROP, CFG.defaultQ);
}

function _chartOpts(yLabel, showLegend) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: showLegend, position: 'top',
                labels: { boxWidth: 10, font: { size: 11 } } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { ticks: { maxTicksLimit: 13, font: { size: 10 } },
           title: { display: true, text: 'Week', font: { size: 10 } } },
      y: { ticks: { font: { size: 10 } },
           title: { display: true, text: yLabel, font: { size: 10 } } },
    },
    animation: { duration: 150 },
  };
}

function onSlider() {
  const rop = parseInt(document.getElementById('sim-rop').value);
  const q   = parseInt(document.getElementById('sim-q').value);
  document.getElementById('sim-rop-val').textContent = rop;
  document.getElementById('sim-q-val').textContent   = q;
  _runAndDisplay(rop, q);
}

function _runAndDisplay(rop, q) {
  const r   = runSim(rop, q);
  const fmt = n => '$' + Math.round(n).toLocaleString();
  const labels = Array.from({ length: CFG.T }, (_, i) => `W${i + 1}`);

  // Side panel
  document.getElementById('sim-sl').textContent   = (r.serviceLevel * 100).toFixed(1) + '%';
  document.getElementById('sim-bw').textContent   = r.bullwhip.toFixed(2) + '×';
  document.getElementById('sim-rc').textContent   = fmt(r.retCost);
  document.getElementById('sim-pen').textContent  = fmt(r.bwPenalty);
  document.getElementById('sim-score').textContent = fmt(r.totalScore);
  document.getElementById('sim-h').textContent    = fmt(r.totH);
  document.getElementById('sim-k').textContent    = fmt(r.totK);
  document.getElementById('sim-p').textContent    = fmt(r.totP);

  // Bullwhip section
  const dVar = _var(r.demand);
  const rVar = _var(r.rOrders);
  const dOVar = _var(r.dOrders);
  document.getElementById('bw-dvar').textContent  = Math.round(dVar).toLocaleString();
  document.getElementById('bw-rvar').textContent  = Math.round(rVar).toLocaleString();
  document.getElementById('bw-dOvar').textContent = Math.round(dOVar).toLocaleString();
  document.getElementById('bw-br').textContent    = r.bullwhip.toFixed(2);
  document.getElementById('bw-dbr').textContent   = r.distBW.toFixed(2);

  // Update charts
  if (_orderChart) {
    _orderChart.data.labels = labels;
    _orderChart.data.datasets[0].data = r.demand;
    _orderChart.data.datasets[1].data = r.rOrders;
    _orderChart.data.datasets[2].data = r.dOrders;
    _orderChart.update('none');
  }
  if (_invChart) {
    _invChart.data.labels = labels;
    _invChart.data.datasets[0].data = r.rInv;
    _invChart.data.datasets[1].data = r.rBl.map(b => -b);
    // ROP annotation line
    _invChart.options.plugins.annotation = undefined; // skip annotation plugin
    _invChart.update('none');
  }
}

function _var(a) {
  const mu = a.reduce((s, x) => s + x, 0) / a.length;
  return a.reduce((s, x) => s + (x - mu) ** 2, 0) / a.length;
}

// ── Answering tab ─────────────────────────────────────────────────────────────
function _resetAnsweringTab() {
  document.getElementById('plan-warn').textContent = '';
  document.getElementById('plan-msg').style.display = 'none';
  const sid = document.getElementById('plan-sid').value.trim();
  if (sid) planSidInput(document.getElementById('plan-sid'));
  onAnsInput();
}

function onAnsInput() {
  const rop = parseInt(document.getElementById('ans-rop').value) || 0;
  const q   = parseInt(document.getElementById('ans-q').value)   || 0;
  if (rop < CFG.ropMin || rop > CFG.ropMax || q < CFG.qMin || q > CFG.qMax) {
    document.getElementById('ans-preview').style.display = 'none';
    return;
  }
  const r   = runSim(rop, q);
  const fmt = n => '$' + Math.round(n).toLocaleString();
  document.getElementById('ans-preview').style.display = 'grid';
  document.getElementById('ans-sl').textContent    = (r.serviceLevel * 100).toFixed(1) + '%';
  document.getElementById('ans-bw').textContent    = r.bullwhip.toFixed(2) + '×';
  document.getElementById('ans-rc').textContent    = fmt(r.retCost);
  document.getElementById('ans-pen').textContent   = fmt(r.bwPenalty);
  document.getElementById('ans-score').textContent = fmt(r.totalScore);
}

// ── Student ID input (debounced) ──────────────────────────────────────────────
function planSidInput(input) {
  clearTimeout(_sidTimer);
  _sidTimer = setTimeout(async () => {
    const sid  = input.value.trim();
    const name = CFG.roster[sid] || '';
    if (name) document.getElementById('plan-name').value = name;
    const max  = _maxFor(sid);
    if (!sid) { document.getElementById('plan-attempts').textContent = ''; return; }
    if (!CFG.roster[sid]) {
      document.getElementById('plan-attempts').textContent = '';
      document.getElementById('ans-attempts-info').textContent = '—';
      return;
    }
    const used = await _fetchCount(sid);
    const left = Math.max(0, max - used);
    document.getElementById('plan-attempts').textContent =
      `Attempts used: ${used} / ${max} (${left} remaining)`;
    document.getElementById('ans-attempts-info').textContent =
      `${left} attempt${left !== 1 ? 's' : ''} remaining`;
  }, 600);
}

function _maxFor(sid) {
  return sid === CFG.instructorId ? CFG.instructorMaxSubmits : CFG.maxSubmits;
}

async function _fetchCount(sid) {
  try {
    const url  = `${CFG.gasUrl}?action=check_attempts&student_id=${encodeURIComponent(sid)}`;
    const resp = await fetch(url);
    const data = await resp.json();
    return Number(data.count) || 0;
  } catch { return 0; }
}

// ── Submit flow ───────────────────────────────────────────────────────────────
async function submitStudentPlan() {
  const sid  = document.getElementById('plan-sid').value.trim();
  const name = document.getElementById('plan-name').value.trim();
  const rop  = parseInt(document.getElementById('ans-rop').value);
  const q    = parseInt(document.getElementById('ans-q').value);
  const warn = document.getElementById('plan-warn');

  warn.textContent = '';
  if (!sid)  { warn.textContent = 'Enter your student ID.'; return; }
  if (!name) { warn.textContent = 'Enter your name.'; return; }
  if (!CFG.roster[sid]) { warn.textContent = 'Student ID not found in roster.'; return; }
  if (isNaN(rop) || rop < CFG.ropMin || rop > CFG.ropMax)
    { warn.textContent = `ROP must be ${CFG.ropMin}–${CFG.ropMax}.`; return; }
  if (isNaN(q)   || q   < CFG.qMin   || q   > CFG.qMax)
    { warn.textContent = `Q must be ${CFG.qMin}–${CFG.qMax}.`; return; }

  const used = await _fetchCount(sid);
  const max  = _maxFor(sid);
  if (used >= max) { warn.textContent = `No attempts remaining (${used}/${max} used).`; return; }

  const r = runSim(rop, q);
  _pendingSubmit = { sid, name, rop, q, attempt: used + 1, result: r };

  const left = max - used - 1;
  document.getElementById('submit-modal-msg').innerHTML =
    `ROP = <strong>${rop}</strong>, Q = <strong>${q}</strong><br>` +
    `Score: <strong>$${Math.round(r.totalScore).toLocaleString()}</strong> &nbsp;|&nbsp; ` +
    `Bullwhip: <strong>${r.bullwhip.toFixed(2)}×</strong><br><br>` +
    `Double-check before you submit. ` +
    `After this you will have <strong>${left}</strong> attempt${left !== 1 ? 's' : ''} left.`;
  document.getElementById('submit-modal').style.display = 'flex';
}

async function _confirmSubmit() {
  document.getElementById('submit-modal').style.display = 'none';
  if (!_pendingSubmit) return;
  const { sid, name, rop, q, attempt, result: r } = _pendingSubmit;
  _pendingSubmit = null;

  const overlay = document.getElementById('loading-overlay');
  overlay.style.display = 'flex';

  try {
    const payload = {
      student_id:    sid,
      student_name:  name,
      attempt,
      rop,
      q,
      service_level:  parseFloat(r.serviceLevel.toFixed(4)),
      bullwhip_ratio: parseFloat(r.bullwhip.toFixed(4)),
      total_score:    Math.round(r.totalScore),
    };
    const url  = `${CFG.gasUrl}?action=plan_submit&data=${encodeURIComponent(JSON.stringify(payload))}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status !== 'ok') throw new Error(data.message || 'GAS error');
  } catch (err) {
    overlay.style.display = 'none';
    document.getElementById('plan-warn').textContent = `Submission error: ${err.message}`;
    return;
  }

  overlay.style.display = 'none';

  // Show result summary
  const msg = document.getElementById('plan-msg');
  msg.style.display = 'block';
  msg.innerHTML = `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px 20px">
      <div style="font-weight:700;color:#166534;font-size:.95rem;margin-bottom:8px">✅ Submitted successfully!</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">
        <div class="metric-box green"><div class="metric-label">Service Level</div><div class="metric-value">${(r.serviceLevel*100).toFixed(1)}%</div></div>
        <div class="metric-box amber"><div class="metric-label">Bullwhip Ratio</div><div class="metric-value">${r.bullwhip.toFixed(2)}×</div></div>
        <div class="metric-box blue"><div class="metric-label">Total Score</div><div class="metric-value">$${Math.round(r.totalScore).toLocaleString()}</div></div>
      </div>
      <p style="font-size:.8rem;color:#475569">Navigating to leaderboard…</p>
    </div>`;

  setTimeout(() => showTab('leaderboard'), 2000);
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
async function loadLeaderboard() {
  const tbody = document.getElementById('lb-table-body');
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#64748b">Loading…</td></tr>';
  try {
    const url  = `${CFG.gasUrl}?action=leaderboard`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#64748b">No submissions yet.</td></tr>';
      return;
    }
    tbody.innerHTML = data.map((row, i) => {
      const rank   = i + 1;
      const medal  = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
      const sid    = String(row.student_id || '');
      const masked = sid.length >= 6 ? sid.slice(0, 4) + '**' + sid.slice(-2) : sid;
      const date   = String(row.submitted_at || '').slice(0, 10);
      const sl     = row.service_level ? (Number(row.service_level) * 100).toFixed(1) + '%' : '—';
      const bw     = row.bullwhip_ratio ? Number(row.bullwhip_ratio).toFixed(2) + '×' : '—';
      const score  = '$' + Math.round(Number(row.total_score)).toLocaleString();
      return `<tr>
        <td style="text-align:center">${medal}</td>
        <td>${row.student_name || '—'}</td>
        <td style="font-family:monospace">${masked}</td>
        <td>${row.rop || '—'}</td>
        <td>${row.q   || '—'}</td>
        <td>${sl}</td>
        <td>${bw}</td>
        <td style="font-weight:700;color:#1d4ed8">${score}</td>
        <td style="color:#94a3b8">${date}</td>
      </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#dc2626">Failed to load: ${err.message}</td></tr>`;
  }
}

// ── Comments ──────────────────────────────────────────────────────────────────
async function submitComment() {
  const name = document.getElementById('cmt-name').value.trim() || '익명';
  const text = document.getElementById('cmt-text').value.trim();
  const msg  = document.getElementById('cmt-msg');
  if (!text) return;

  try {
    const payload = { name, text };
    await fetch(`${CFG.gasUrl}?action=comment_submit&data=${encodeURIComponent(JSON.stringify(payload))}`);
    document.getElementById('cmt-text').value = '';
    msg.style.display = 'none';
    await loadComments();
  } catch (err) {
    msg.style.cssText = 'display:block;color:#dc2626;font-size:.84rem;margin-bottom:8px';
    msg.textContent   = `Error: ${err.message}`;
  }
}

async function loadComments() {
  const list = document.getElementById('cmt-list');
  try {
    const resp = await fetch(`${CFG.gasUrl}?action=comment_list`);
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) {
      list.innerHTML = '<p style="color:#64748b;text-align:center">No comments yet.</p>';
      return;
    }
    list.innerHTML = data.map(c => `
      <div style="border:1px solid #f1f5f9;border-radius:8px;padding:12px 14px;background:#fafafa">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <strong style="font-size:.84rem">${c.name || '익명'}</strong>
          <span style="font-size:.75rem;color:#94a3b8">${String(c.submitted_at).slice(0,16)}</span>
        </div>
        <p style="font-size:.85rem;color:#334155;line-height:1.6">${c.text}</p>
      </div>`).join('');
  } catch {
    list.innerHTML = '<p style="color:#94a3b8;text-align:center">Comments unavailable.</p>';
  }
}
