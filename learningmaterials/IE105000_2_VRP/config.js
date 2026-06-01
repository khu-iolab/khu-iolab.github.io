/**
 * config.js — All static data for the VRP City Delivery game.
 */

const CONFIG = {
  // ── Leaderboard backend (Google Apps Script) ─────────────────────────────
  gasUrl: 'https://script.google.com/macros/s/AKfycbybiy3yQGnajleNOQ3GvW6FnnbAWBgxNtJcNzkg6NwH8vmzPakG6l8hDkyZjROw4ocB/exec',

  // ── Depot ─────────────────────────────────────────────────────────────────
  depot: { id: 'depot', name: 'Warehouse', x: 5.0, y: 5.0 },

  // ── Location pool (16 city stops) ─────────────────────────────────────────
  locationPool: [
    { id: 'A', name: 'Bakery', icon: '🥖', x: 1.0, y: 8.0 },
    { id: 'B', name: 'Electronics', icon: '📱', x: 8.0, y: 2.0 },
    { id: 'C', name: 'Flower Market', icon: '💐', x: 1.0, y: 3.0 },
    { id: 'D', name: 'Print Shop', icon: '🖨', x: 9.0, y: 7.0 },
    { id: 'E', name: 'Café Supply', icon: '☕', x: 4.0, y: 9.0 },
    { id: 'F', name: 'Office Tower', icon: '🏢', x: 9.0, y: 9.0 },
    { id: 'G', name: 'Univ. Lab', icon: '🔬', x: 2.0, y: 1.0 },
    { id: 'H', name: 'Hospital', icon: '🏥', x: 8.0, y: 6.0 },
    { id: 'I', name: 'School', icon: '🏫', x: 3.0, y: 2.0 },
    { id: 'J', name: 'Restaurant', icon: '🍽', x: 7.0, y: 4.0 },
    { id: 'K', name: 'Supermarket', icon: '🛒', x: 2.0, y: 6.0 },
    { id: 'L', name: 'Pharmacy', icon: '💊', x: 6.0, y: 8.0 },
    { id: 'M', name: 'Library', icon: '📚', x: 4.0, y: 2.0 },
    { id: 'N', name: 'Museum', icon: '🏛', x: 7.0, y: 9.0 },
    { id: 'O', name: 'Post Office', icon: '📮', x: 3.0, y: 7.0 },
    { id: 'P', name: 'Sports Center', icon: '🏟', x: 8.0, y: 4.0 },
  ],

  // ── Colors ────────────────────────────────────────────────────────────────
  pairColors: ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#06b6d4'],
  vehicleColors: ['#facc15', '#f472b6', '#34d399'],

  // ── Defaults ──────────────────────────────────────────────────────────────
  defaults: { numVehicles: 2, numShipments: 4 },
};
