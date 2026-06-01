/**
 * config.js — AMR Factory Routing Game
 * IE105000 — Operations Research / Logistics
 */

// ── Factory floor map (20 × 15 tiles) ─────────────────────────────────────
// '#' = wall / shelf (impassable)   '.' = walkable floor
const GRID_MAP = [
  '####################',
  '#..................#',
  '#.##..##..##..##..#',
  '#.##..##..##..##..#',
  '#..................#',
  '#.##..##..##..##..#',
  '#.##..##..##..##..#',
  '#..................#',
  '#.##..##..##..##..#',
  '#.##..##..##..##..#',
  '#..................#',
  '#.##..##..##..##..#',
  '#.##..##..##..##..#',
  '#..................#',
  '####################',
];
const GRID = GRID_MAP.map(row => row.split('').map(c => c === '#' ? 1 : 0));

// ── Job definitions (pickup → dropoff) ────────────────────────────────────
// All positions are verified floor tiles in the grid above.
const ALL_JOBS = [
  { pickup: { x: 4, y: 2 }, dropoff: { x: 16, y: 12 }, label: 'Part A → Bay A' },
  { pickup: { x: 8, y: 5 }, dropoff: { x: 4, y: 11 }, label: 'Part B → Bay B' },
  { pickup: { x: 12, y: 8 }, dropoff: { x: 8, y: 2 }, label: 'Part C → Bay C' },
  { pickup: { x: 16, y: 5 }, dropoff: { x: 12, y: 11 }, label: 'Part D → Bay D' },
  { pickup: { x: 4, y: 8 }, dropoff: { x: 16, y: 2 }, label: 'Part E → Bay E' },
  { pickup: { x: 8, y: 11 }, dropoff: { x: 4, y: 5 }, label: 'Part F → Bay F' },
];

// ── Game tuning ────────────────────────────────────────────────────────────
const CONFIG = {
  grid: { cols: 20, rows: 15, tileSize: 32 },

  player: { speedPx: 160 },   // px / sec  →  5 tiles / sec
  amrSpeed: 64,                 // px / sec  →  2 tiles / sec
  workerSpeed: 48,              // px / sec  →  1.5 tiles / sec

  amrCount: 2,
  workerCount: 3,
  jobCount: 4,               // how many of ALL_JOBS to use per round
  capacity: 2,               // max items the player AMR can carry at once

  collision: {
    freezeMs: 1500,           // how long player is frozen after collision
    penaltySec: 10,             // seconds added to final time per collision
  },

  // ── Google Apps Script Web App URL ────────────────────────────────────────
  // Deploy gas_leaderboard.js as a GAS Web App (Execute as: Me, Access: Anyone)
  // then paste the deployment URL here.
  gasUrl: 'https://script.google.com/macros/s/AKfycbzBC-8dzBSXtXw4cVZW2QWmp4FE-gIIdSoI1yIj1P95dfVVNd5KlZlEBmt9yk1BL79K6A/exec',
};
