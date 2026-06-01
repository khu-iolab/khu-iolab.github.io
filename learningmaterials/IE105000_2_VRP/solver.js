/**
 * solver.js — Scenario generator, route evaluator, and exact VRP solver.
 * Ported from Python (scenario.py, engine.py, solver.py).
 */

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────────────────
function _mkRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function _sample(pool, n, rng) {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

// ── Scenario generation ───────────────────────────────────────────────────────
function generateScenario(numVehicles, numShipments, seed) {
  const rng     = _mkRng(seed);
  const chosen  = _sample(CONFIG.locationPool, numShipments * 2, rng);
  const pickups = chosen.slice(0, numShipments);
  const drops   = chosen.slice(numShipments);
  const cap     = Math.ceil(numShipments / numVehicles) + 1;

  const locations = {};
  const shipments = {};

  for (let i = 0; i < numShipments; i++) {
    const num = i + 1;
    const pid = `p${num}`, did = `d${num}`, sid = `s${num}`;
    locations[pid] = {
      id: pid, name: pickups[i].name, icon: pickups[i].icon,
      type: 'pickup', x: pickups[i].x, y: pickups[i].y,
      shipment: sid, pairNum: num,
    };
    locations[did] = {
      id: did, name: drops[i].name, icon: drops[i].icon,
      type: 'delivery', x: drops[i].x, y: drops[i].y,
      shipment: sid, pairNum: num,
    };
    shipments[sid] = { id: sid, pickup: pid, delivery: did, demand: 1, pairNum: num };
  }

  const vehicles = {};
  for (let i = 1; i <= numVehicles; i++) {
    const vid = `v${i}`;
    vehicles[vid] = {
      id: vid, name: `Vehicle ${i}`, capacity: cap,
      color: CONFIG.vehicleColors[i - 1],
    };
  }

  return { locations, shipments, vehicles };
}

// ── Distance helpers ──────────────────────────────────────────────────────────
function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function getLoc(id, locations) {
  return id === 'depot' ? CONFIG.depot : locations[id];
}

function routeDistance(stopIds, locations) {
  if (!stopIds.length) return 0;
  const pts = ['depot', ...stopIds, 'depot'].map(id => getLoc(id, locations));
  let d = 0;
  for (let i = 0; i < pts.length - 1; i++) d += dist(pts[i], pts[i + 1]);
  return d;
}

// ── Route feasibility ─────────────────────────────────────────────────────────
function checkRoute(stopIds, vehicleId, locations, shipments, vehicles) {
  const cap      = vehicles[vehicleId].capacity;
  const pickupOf = {};
  for (const sh of Object.values(shipments)) pickupOf[sh.delivery] = sh.pickup;

  const violations = [];
  let load = 0;
  const visited = new Set();

  for (const sid of stopIds) {
    const loc = locations[sid];
    if (loc.type === 'delivery' && !visited.has(pickupOf[sid]))
      violations.push(`${loc.name}: delivery before its pickup`);
    load += loc.type === 'pickup' ? 1 : -1;
    if (load > cap) violations.push(`Over capacity (${load}/${cap}) at ${loc.name}`);
    visited.add(sid);
  }
  return { feasible: violations.length === 0, violations };
}

// ── Full solution evaluation ──────────────────────────────────────────────────
function evaluateSolution(routes, locations, shipments, vehicles) {
  const allViolations = [];
  const routeResults  = {};
  let   totalDist     = 0;

  for (const [vid, stopIds] of Object.entries(routes)) {
    const { feasible, violations } = checkRoute(stopIds, vid, locations, shipments, vehicles);
    const d = routeDistance(stopIds, locations);
    totalDist += d;
    routeResults[vid] = { stops: stopIds, feasible, violations, distance: d };
    allViolations.push(...violations);
  }

  // Coverage
  for (const sh of Object.values(shipments)) {
    for (const locId of [sh.pickup, sh.delivery]) {
      const count = Object.values(routes).filter(r => r.includes(locId)).length;
      if (count === 0) allViolations.push(`${locations[locId].name} not assigned`);
      if (count > 1)  allViolations.push(`${locations[locId].name} in multiple vehicles`);
    }
    const pVeh = Object.entries(routes).find(([, r]) => r.includes(sh.pickup))?.[0];
    const dVeh = Object.entries(routes).find(([, r]) => r.includes(sh.delivery))?.[0];
    if (pVeh && dVeh && pVeh !== dVeh)
      allViolations.push(`Shipment ${sh.id}: pickup & delivery in different vehicles`);
  }

  return {
    feasible: allViolations.length === 0,
    violations: [...new Set(allViolations)],
    totalDistance: totalDist,
    routeResults,
  };
}

// ── Exact backtracking solver per vehicle ─────────────────────────────────────
function _exactRoute(shipmentIds, capacity, locations, shipments) {
  if (!shipmentIds.length) return { route: [], distance: 0 };

  const stops    = shipmentIds.flatMap(sid => [shipments[sid].pickup, shipments[sid].delivery]);
  const pickupOf = {};
  for (const sid of shipmentIds) pickupOf[shipments[sid].delivery] = shipments[sid].pickup;

  let bestDist  = Infinity;
  let bestRoute = [];

  function bt(route, remaining, visited, load, dSoFar) {
    if (dSoFar >= bestDist) return;
    if (!remaining.length) {
      const last  = getLoc(route.length ? route[route.length - 1] : 'depot', locations);
      const total = dSoFar + dist(last, CONFIG.depot);
      if (total < bestDist) { bestDist = total; bestRoute = [...route]; }
      return;
    }
    const cur = getLoc(route.length ? route[route.length - 1] : 'depot', locations);
    for (const s of remaining) {
      const loc     = locations[s];
      if (loc.type === 'delivery' && !visited.has(pickupOf[s])) continue;
      const newLoad = load + (loc.type === 'pickup' ? 1 : -1);
      if (newLoad > capacity) continue;
      const step = dist(cur, loc);
      bt([...route, s], remaining.filter(x => x !== s),
         new Set([...visited, s]), newLoad, dSoFar + step);
    }
  }

  bt([], stops, new Set(), 0, 0);
  return { route: bestRoute, distance: bestDist };
}

// ── Global optimal solver (enumerate all assignments) ────────────────────────
function solve(locations, shipments, vehicles) {
  const shipmentIds = Object.keys(shipments);
  const vehicleIds  = Object.keys(vehicles);
  const n = shipmentIds.length, v = vehicleIds.length;

  let bestDist   = Infinity;
  let bestRoutes = null;

  function enumerate(idx, assignment) {
    if (idx === n) {
      const perVeh = {};
      for (const vid of vehicleIds) perVeh[vid] = [];
      for (let i = 0; i < n; i++) perVeh[vehicleIds[assignment[i]]].push(shipmentIds[i]);

      for (const [vid, sids] of Object.entries(perVeh))
        if (sids.length > vehicles[vid].capacity) return;

      let total = 0;
      const routes = {};
      for (const [vid, sids] of Object.entries(perVeh)) {
        const { route, distance } = _exactRoute(sids, vehicles[vid].capacity, locations, shipments);
        routes[vid] = route;
        total += distance;
      }
      if (total < bestDist) { bestDist = total; bestRoutes = routes; }
      return;
    }
    for (let vi = 0; vi < v; vi++) {
      assignment[idx] = vi;
      enumerate(idx + 1, assignment);
    }
  }

  enumerate(0, new Array(n));
  return { routes: bestRoutes, totalDistance: bestDist };
}
