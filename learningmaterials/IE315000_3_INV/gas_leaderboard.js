/**
 * gas_leaderboard.js — Google Apps Script backend for IE315000 Lab #3.
 *
 * DEPLOYMENT:
 *  1. script.google.com → New project → paste this file.
 *  2. Deploy → New deployment → Web App
 *     Execute as: Me  |  Who has access: Anyone
 *  3. Copy URL → paste into CFG.gasUrl in config.js.
 *  4. Run doGet once in the editor to authorize SpreadsheetApp.
 */

const SPREADSHEET_ID  = '11cNAgoTaAIwTgUiVhLPsW53R3OCe1YlDtE14FgsvaCk';  // shared spreadsheet
const SHEET_NAME      = 'IE315000_3';
const COMMENT_SHEET   = 'IE315000_3_comments';
const HEADERS         = ['student_id', 'student_name', 'attempt',
                         'rop', 'q', 'service_level', 'bullwhip_ratio', 'total_score', 'submitted_at'];
const COMMENT_HEADERS = ['id', 'name', 'submitted_at', 'text'];

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';

  // ── Check attempt count ──
  if (action === 'check_attempts') {
    const sid  = String((e.parameter.student_id) || '').trim();
    const sht  = _getSheet(SHEET_NAME, HEADERS);
    const rows = sht.getDataRange().getValues();
    if (rows.length <= 1) return _json({ count: 0 });
    const hdrs   = rows[0];
    const sidIdx = hdrs.indexOf('student_id');
    if (sidIdx < 0) return _json({ count: 0 });
    const count  = rows.slice(1).filter(r => String(r[sidIdx]).trim() === sid).length;
    return _json({ count });
  }

  // ── Submit plan ──
  if (action === 'plan_submit') {
    try {
      const p   = JSON.parse(e.parameter.data);
      const sht = _getSheet(SHEET_NAME, HEADERS);
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      sht.appendRow([
        String(p.student_id      || '').trim(),
        String(p.student_name    || '').trim(),
        Number(p.attempt         || 1),
        Number(p.rop             || 0),
        Number(p.q               || 0),
        Number(p.service_level   || 0),
        Number(p.bullwhip_ratio  || 0),
        Number(p.total_score     || 0),
        now,
      ]);
      return _json({ status: 'ok' });
    } catch (err) {
      return _json({ status: 'error', message: err.message });
    }
  }

  // ── Leaderboard (best per student = lowest total_score) ──
  if (action === 'leaderboard') {
    const sht  = _getSheet(SHEET_NAME, HEADERS);
    const rows = sht.getDataRange().getValues();
    if (rows.length <= 1) return _json([]);

    const hdrs = rows[0];
    const data = rows.slice(1).map(row => {
      const obj = {};
      hdrs.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });

    const best = {};
    data.forEach(r => {
      const key  = String(r.student_id || '').trim();
      if (!key) return;
      const score = Number(r.total_score);
      if (!(key in best) || score < Number(best[key].total_score)) best[key] = r;
    });

    const ranked = Object.values(best)
      .sort((a, b) => Number(a.total_score) - Number(b.total_score))
      .slice(0, 100);

    return _json(ranked);
  }

  // ── Submit comment ──
  if (action === 'comment_submit') {
    try {
      const p   = JSON.parse(e.parameter.data);
      const sht = _getCommentSheet();
      const id  = sht.getLastRow();
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      sht.appendRow([id, String(p.name || '익명').trim(), now, String(p.text || '').trim()]);
      return _json({ status: 'ok' });
    } catch (err) {
      return _json({ status: 'error', message: err.message });
    }
  }

  // ── List comments ──
  if (action === 'comment_list') {
    const sht  = _getCommentSheet();
    const rows = sht.getDataRange().getValues();
    if (rows.length <= 1) return _json([]);
    const data = rows.slice(1)
      .map(r => ({ id: r[0], name: r[1], submitted_at: r[2], text: r[3] }))
      .reverse().slice(0, 100);
    return _json(data);
  }

  return _json({ status: 'ok', sheet: SHEET_NAME });
}

function _getSheet(name, headers) {
  const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  let   sht = ss.getSheetByName(name);
  if (!sht) {
    sht = ss.insertSheet(name);
    sht.appendRow(headers);
    sht.setFrozenRows(1);
  } else if (!sht.getRange('A1').getValue()) {
    sht.insertRowBefore(1);
    sht.getRange(1, 1, 1, headers.length).setValues([headers]);
    sht.setFrozenRows(1);
  }
  return sht;
}
function _getCommentSheet() { return _getSheet(COMMENT_SHEET, COMMENT_HEADERS); }

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
