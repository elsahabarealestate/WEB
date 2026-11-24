/**
 * El Sahaba analytics backend (Google Apps Script, bound to the "Analytics" Google Sheet).
 * Deploy as Web app: Execute as "Me", access "Anyone". See apps-script/README.md.
 *
 * Public endpoint (POST text/plain JSON):
 *   { events: [ {t,p,u,r,d,l,x,s}, ... ] }     -> appends rows (validated, capped)
 *   { action: 'stats', p: '<passphrase>', days: 30 } -> aggregated numbers (owner only)
 *
 * No IP or cookie is ever stored. The passphrase is stored only as a salted, iterated hash.
 */
var PASS_SALT = '__PASS_SALT__';
var PASS_HASH = '__PASS_HASH__';
var HASH_ROUNDS = 3000;
var SHEET_NAME = 'events';
var HEADER = ['ts', 'sid', 'type', 'path', 'unit', 'ref', 'dev', 'lang', 'extra'];
var TYPES = { pv: 1, unit_view: 1, wa_click: 1, call_click: 1, copy_link: 1, share: 1, card_click: 1, filter: 1, search: 1 };
var MAX_BATCH = 20;
var MAX_BODY = 8000;
var DAILY_CAP = 30000;
var MAX_ROWS_READ = 60000;

function clean_(v, n) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/^[=+\-@]/, "'$&").slice(0, n);
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { sh = ss.insertSheet(SHEET_NAME); sh.appendRow(HEADER); sh.setFrozenRows(1); }
  return sh;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function hashPass_(pass) {
  var h = PASS_SALT + '|' + pass;
  for (var i = 0; i < HASH_ROUNDS; i++) {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + '|' + i);
    h = Utilities.base64Encode(bytes);
  }
  return h;
}

function doPost(e) {
  var raw = (e && e.postData && e.postData.contents) || '';
  if (raw.length > MAX_BODY) return json_({ ok: false, error: 'too_large' });
  var data;
  try { data = JSON.parse(raw); } catch (err) { return json_({ ok: false, error: 'bad_json' }); }
  if (data && data.action === 'stats') return stats_(data);
  return collect_(data);
}

function collect_(data) {
  var evs = data && data.events;
  if (!Array.isArray(evs) || !evs.length) return json_({ ok: false, error: 'no_events' });
  var cache = CacheService.getScriptCache();
  var dayKey = 'cnt_' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd');
  var used = Number(cache.get(dayKey) || 0);
  if (used >= DAILY_CAP) return json_({ ok: false, error: 'cap' });
  var now = new Date();
  var rows = [];
  evs.slice(0, MAX_BATCH).forEach(function (ev) {
    if (!ev || !TYPES[ev.t]) return;
    rows.push([now, clean_(ev.s, 20), ev.t, clean_(ev.p, 120), clean_(ev.u, 30), clean_(ev.r, 60),
      /^[mtd]$/.test(ev.d) ? ev.d : '', clean_(ev.l, 4), clean_(ev.x, 60)]);
  });
  if (!rows.length) return json_({ ok: false, error: 'invalid' });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet_();
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEADER.length).setValues(rows);
  } finally { lock.releaseLock(); }
  cache.put(dayKey, String(used + rows.length), 86400);
  return json_({ ok: true, n: rows.length });
}

function stats_(data) {
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('authfail') || 0);
  if (fails >= 5) return json_({ ok: false, error: 'locked' });
  if (hashPass_(String(data.p || '')) !== PASS_HASH) {
    cache.put('authfail', String(fails + 1), 900);
    return json_({ ok: false, error: 'auth' });
  }
  cache.remove('authfail');
  var days = Math.max(1, Math.min(180, Number(data.days) || 30));
  var sh = sheet_();
  var last = sh.getLastRow();
  var rows = [];
  if (last > 1) {
    var start = Math.max(2, last - MAX_ROWS_READ + 1);
    rows = sh.getRange(start, 1, last - start + 1, HEADER.length).getValues();
  }
  return json_({ ok: true, stats: aggregate_(rows, days, Date.now(), data.tz || 'Africa/Cairo') });
}

/** Pure aggregation (also unit-tested in node). rows: [ts,sid,type,path,unit,ref,dev,lang,extra] */
function aggregate_(rows, days, nowMs, tz) {
  var from = nowMs - days * 86400000;
  var byDay = {}, units = {}, paths = {}, refs = {}, devs = { m: 0, t: 0, d: 0 }, searches = {}, filters = {};
  var sessions = {}, tot = { pv: 0, wa_click: 0, call_click: 0, copy_link: 0, share: 0, unit_view: 0 };
  function fmt(d) {
    if (typeof Utilities !== 'undefined' && Utilities.formatDate) return Utilities.formatDate(d, tz, 'yyyy-MM-dd');
    return d.toISOString().slice(0, 10);
  }
  function u(id) { return units[id] || (units[id] = { id: id, views: 0, wa: 0, copy: 0, share: 0, sessions: {} }); }
  rows.forEach(function (r) {
    var ts = new Date(r[0]); var t = ts.getTime();
    if (!(t >= from && t <= nowMs + 60000)) return;
    var type = r[2], sid = r[1], day = fmt(ts);
    var d = byDay[day] || (byDay[day] = { pv: 0, wa: 0, sess: {} });
    if (type === 'pv') {
      tot.pv++; d.pv++; d.sess[sid] = 1; sessions[sid] = 1;
      paths[r[3]] = (paths[r[3]] || 0) + 1;
      if (r[4] === '' || r[4] == null) { /* non-unit page */ }
      var ref = r[5] || '(direct)'; refs[ref] = (refs[ref] || 0) + 1;
      if (devs[r[6]] !== undefined) devs[r[6]]++;
    } else if (type === 'unit_view') { tot.unit_view++; var a = u(r[4]); a.views++; a.sessions[sid] = 1; }
    else if (type === 'wa_click') { tot.wa_click++; d.wa++; if (r[4]) u(r[4]).wa++; }
    else if (type === 'call_click') tot.call_click++;
    else if (type === 'copy_link') { tot.copy_link++; if (r[4]) u(r[4]).copy++; }
    else if (type === 'share') { tot.share++; if (r[4]) u(r[4]).share++; }
    else if (type === 'search') { var q = String(r[8]).toLowerCase(); searches[q] = (searches[q] || 0) + 1; }
    else if (type === 'filter') { filters[r[8]] = (filters[r[8]] || 0) + 1; }
  });
  function top(o, n) { return Object.keys(o).map(function (k) { return { k: k, n: o[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, n); }
  var dayList = Object.keys(byDay).sort().map(function (k) { return { day: k, pv: byDay[k].pv, sessions: Object.keys(byDay[k].sess).length, wa: byDay[k].wa }; });
  var unitList = Object.keys(units).map(function (k) {
    var x = units[k]; return { id: x.id, views: x.views, sessions: Object.keys(x.sessions).length, wa: x.wa, copy: x.copy, share: x.share };
  }).sort(function (a, b) { return b.views - a.views; });
  return {
    days: days, totals: tot, sessions: Object.keys(sessions).length, byDay: dayList, units: unitList.slice(0, 50),
    pages: top(paths, 15), referrers: top(refs, 10), devices: devs, searches: top(searches, 15), filters: top(filters, 15),
    rowsRead: rows.length
  };
}
