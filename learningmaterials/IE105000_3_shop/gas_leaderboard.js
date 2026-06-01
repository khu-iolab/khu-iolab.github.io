/**
 * gas_leaderboard.js — Google Apps Script backend for IE105000_3 AMR game.
 *
 * DEPLOYMENT STEPS:
 *  1. Go to https://script.google.com → New project → paste this file.
 *  2. Deploy → New deployment → Web App.
 *     - Execute as:    Me
 *     - Who has access: Anyone
 *  3. Copy the Web App URL and paste it into CONFIG.gasUrl in config.js.
 *
 * All communication uses GET to avoid CORS redirect issues with POST.
 * Sheet name: IE105000_3  (auto-created in the shared spreadsheet)
 */

const SPREADSHEET_ID    = '11cNAgoTaAIwTgUiVhLPsW53R3OCe1YlDtE14FgsvaCk';
const SHEET_NAME        = 'IE105000_3';
const HEADERS           = [
  'id', 'student_id', 'student_name',
  'elapsed_sec', 'collisions', 'penalty_sec', 'final_sec',
  'submitted_at',
];

const COMMENTS_SHEET    = 'IE105000_3_comments';
const COMMENT_HEADERS   = ['id', 'student_name', 'posted_at', 'comment'];

// ── Sheet helpers ─────────────────────────────────────────────────────────────
function getSheet() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  } else if (!sheet.getRange('A1').getValue()) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getCommentsSheet() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(COMMENTS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(COMMENTS_SHEET);
    sheet.appendRow(COMMENT_HEADERS);
    sheet.setFrozenRows(1);
  } else if (!sheet.getRange('A1').getValue()) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, COMMENT_HEADERS.length).setValues([COMMENT_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── GET — handles both submit and leaderboard ─────────────────────────────────
// Using GET for everything to avoid GAS CORS redirect issues with POST.
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';

  // ── Submit score ──
  if (action === 'submit') {
    try {
      const payload = JSON.parse(e.parameter.data);
      const sheet   = getSheet();
      const id      = sheet.getLastRow();
      const now     = new Date().toISOString().replace('T', ' ').substring(0, 19);

      sheet.appendRow([
        id,
        String(payload.student_id   || '').trim(),
        String(payload.student_name || '').trim(),
        Number(payload.elapsed_sec  || 0),
        Number(payload.collisions   || 0),
        Number(payload.penalty_sec  || 0),
        Number(payload.final_sec    || 0),
        now,
      ]);
      return _json({ status: 'ok' });
    } catch (err) {
      return _json({ status: 'error', message: err.message });
    }
  }

  // ── Save comment ──
  if (action === 'save_comment') {
    try {
      const payload = JSON.parse(e.parameter.data);
      const sheet   = getCommentsSheet();
      const id      = sheet.getLastRow();
      const now     = new Date().toISOString().replace('T', ' ').substring(0, 19);
      sheet.appendRow([
        id,
        String(payload.student_name || '').trim(),
        now,
        String(payload.comment     || '').trim(),
      ]);
      return _json({ status: 'ok' });
    } catch (err) {
      return _json({ status: 'error', message: err.message });
    }
  }

  // ── Get comments ──
  if (action === 'get_comments') {
    const sheet = getCommentsSheet();
    const rows  = sheet.getDataRange().getValues();
    if (rows.length <= 1) return _json([]);
    const hdrs = rows[0];
    const data = rows.slice(1).map(row => {
      const obj = {};
      hdrs.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
    data.reverse();           // most recent first
    return _json(data.slice(0, 100));
  }

  // ── Leaderboard ──
  if (action === 'leaderboard') {
    const sheet = getSheet();
    const rows  = sheet.getDataRange().getValues();
    if (rows.length <= 1) return _json([]);

    const hdrs = rows[0];
    const data = rows.slice(1).map(row => {
      const obj = {};
      hdrs.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
    data.sort((a, b) => Number(a.final_sec) - Number(b.final_sec));
    return _json(data.slice(0, 100));
  }

  return _json({ status: 'ok', sheet: SHEET_NAME });
}

// ── Utility ───────────────────────────────────────────────────────────────────
function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
