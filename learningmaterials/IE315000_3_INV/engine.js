// engine.js — Inventory simulation engine (IE315000 Lab #3)

// ── Seeded PRNG (xorshift32) ──────────────────────────────────────────────────
function _prng(seed) {
  let s = seed >>> 0 || 1;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

// Box-Muller normal sample (always positive, rounded to integer)
function _normalInt(rng, mu, sigma) {
  const u1 = Math.max(1e-10, rng());
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, Math.round(mu + sigma * z));
}

function _mean(a)     { return a.reduce((s, x) => s + x, 0) / a.length; }
function _variance(a) {
  const mu = _mean(a);
  return a.reduce((s, x) => s + (x - mu) ** 2, 0) / a.length;
}

// ── Main simulation ───────────────────────────────────────────────────────────
// (s, Q) policy: order Q whenever inventory position ≤ rop
function runSim(rop, Q) {
  const T   = CFG.T;
  const rng = _prng(CFG.seed);

  // Fixed customer demand sequence (same for every student)
  const demand = Array.from({ length: T }, () => _normalInt(rng, CFG.mu, CFG.sigma));

  // ── Retailer ──────────────────────────────────────────────────────────────
  const L = CFG.leadTime;
  let inv = CFG.I0, bl = 0;
  const pipe = Array(L + 1).fill(0);   // pipe[0] arrives this period after lead time
  let totH = 0, totK = 0, totP = 0;
  const rOrders = [], rInv = [], rBl = [];

  for (let t = 0; t < T; t++) {
    // Receive shipment ordered L periods ago
    inv += pipe.shift();
    pipe.push(0);

    // Fulfill demand (carry backlog forward)
    const need = demand[t] + bl;
    if (inv >= need) { inv -= need; bl = 0; }
    else             { bl = need - inv; inv = 0; }

    // Inventory position = on-hand − backlog + on-order
    const onOrder = pipe.reduce((a, b) => a + b, 0);
    const ip      = inv - bl + onOrder;

    // Ordering decision
    let ord = 0;
    if (ip <= rop) {
      ord = Q;
      pipe[pipe.length - 1] += Q;   // arrives L periods later
    }

    rOrders.push(ord);
    rInv.push(inv);
    rBl.push(bl);

    totH += inv * CFG.h;
    totK += ord > 0 ? CFG.K : 0;
    totP += bl  * CFG.p;
  }

  // ── Distributor (fixed policy) ────────────────────────────────────────────
  const Ld = CFG.distLeadTime;
  let dinv = CFG.distI0, dbl = 0;
  const dpipe = Array(Ld + 1).fill(0);
  const dOrders = [];

  for (let t = 0; t < T; t++) {
    dinv += dpipe.shift();
    dpipe.push(0);

    const dneed = rOrders[t] + dbl;
    if (dinv >= dneed) { dinv -= dneed; dbl = 0; }
    else               { dbl = dneed - dinv; dinv = 0; }

    const donOrder = dpipe.reduce((a, b) => a + b, 0);
    const dip      = dinv - dbl + donOrder;
    let dord = 0;
    if (dip <= CFG.distROP) {
      dord = CFG.distQ;
      dpipe[dpipe.length - 1] += dord;
    }
    dOrders.push(dord);
  }

  // ── Metrics ───────────────────────────────────────────────────────────────
  const demandVar  = _variance(demand);
  const rOrderVar  = _variance(rOrders);
  const dOrderVar  = _variance(dOrders);

  const bullwhip  = demandVar > 0 ? rOrderVar  / demandVar : 1;
  const distBW    = demandVar > 0 ? dOrderVar  / demandVar : 1;

  const retCost    = totH + totK + totP;
  const bwPenalty  = Math.max(0, bullwhip - 1) * CFG.bullwhipWeight;
  const totalScore = retCost + bwPenalty;

  const stockoutWeeks = rBl.filter(b => b > 0).length;
  const serviceLevel  = (T - stockoutWeeks) / T;

  return {
    demand, rOrders, dOrders, rInv, rBl,
    totH, totK, totP,
    retCost, bullwhip, distBW,
    bwPenalty, totalScore,
    serviceLevel,
  };
}
