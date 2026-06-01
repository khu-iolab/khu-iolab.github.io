/**
 * gas_leaderboard.js — Google Apps Script backend for IE105000_1 Global Logistics game.
 *
 * DEPLOYMENT:
 *  1. Go to https://script.google.com → New project → paste this file.
 *  2. Deploy → New deployment → Web App.
 *     - Execute as: Me  |  Who has access: Anyone
 *  3. Paste the URL into CONFIG.gasUrl in config.js.
 */

const SPREADSHEET_ID  = '11cNAgoTaAIwTgUiVhLPsW53R3OCe1YlDtE14FgsvaCk';
const SHEET_NAME      = 'IE105000_1';
const HEADERS         = ['id', 'student_id', 'student_name', 'submitted_at', 'profit', 'units', 'chain'];

const COMMENTS_SHEET  = 'IE105000_3_comments';
const COMMENT_HEADERS = ['id', 'student_name', 'posted_at', 'comment'];

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

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'leaderboard';

  // ── Submit score ──
  if (action === 'submit') {
    try {
      const p   = JSON.parse(e.parameter.data);
      const sheet = getSheet();
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      sheet.appendRow([
        Date.now(),
        String(p.student_id   || '').trim(),
        String(p.student_name || '').trim(),
        now,
        Number(p.profit       || 0),
        Number(p.units        || 0),
        String(p.chain        || ''),
      ]);
      return _json({ status: 'ok' });
    } catch (err) {
      return _json({ status: 'error', message: err.message });
    }
  }

  // ── Leaderboard ──
  if (action === 'leaderboard') {
    const sheet = getSheet();
    const rows  = sheet.getDataRange().getValues();
    if (rows.length <= 1) return _json([]);
    const hdrs = rows[0];
    const data = rows.slice(1).map(row => {
      const o = {}; hdrs.forEach((h, i) => { o[h] = row[i]; });
      // normalise: old sheets used 'name', new ones use 'student_name'
      if (!o.student_name) o.student_name = o.name || '';
      return o;
    });
    data.sort((a, b) => Number(b.profit) - Number(a.profit));
    return _json(data.slice(0, 100));
  }

  // ── Delete ──
  if (action === 'delete') {
    const sheet = getSheet();
    if (e.parameter.id === 'all') {
      const last = sheet.getLastRow();
      if (last > 1) sheet.deleteRows(2, last - 1);
    } else {
      const data = sheet.getDataRange().getValues();
      for (let i = data.length - 1; i >= 1; i--) {
        if (String(data[i][0]) === String(e.parameter.id)) { sheet.deleteRow(i + 1); break; }
      }
    }
    return _json({ success: true });
  }

  // ── Save comment ──
  if (action === 'save_comment') {
    try {
      const payload = JSON.parse(e.parameter.data);
      const sheet   = getCommentsSheet();
      const now     = new Date().toISOString().replace('T', ' ').substring(0, 19);
      sheet.appendRow([sheet.getLastRow(), String(payload.student_name || '').trim(), now, String(payload.comment || '').trim()]);
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
      const o = {}; hdrs.forEach((h, i) => { o[h] = row[i]; }); return o;
    });
    data.reverse();
    return _json(data.slice(0, 100));
  }

  return _json({ error: 'Unknown action' });
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
