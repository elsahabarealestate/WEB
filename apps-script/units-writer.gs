/**
 * El Sahaba units writer (Google Apps Script bound to the UNITS Google Sheet).
 * A SEPARATE deployment from the existing read-only units script, so the live site is never touched.
 * Deploy as Web app: Execute as "Me", access "Anyone". Every call needs the owner passphrase.
 *
 * POST text/plain JSON:
 *   { action:'list',   p }                       -> all rows (including hidden)
 *   { action:'save',   p, unit:{...} }           -> add (no property_id) or update (existing property_id)
 *   { action:'active', p, id, active:true|false } -> show / hide a unit
 * Nothing is ever deleted. Every change stores the previous row in the "changes" tab for undo.
 */
var PASS_SALT = '__PASS_SALT__';
var PASS_HASH = '__PASS_HASH__';
var HASH_ROUNDS = 3000;
var CHANGES_TAB = 'changes';
var COLS = ['property_id', 'title_ar', 'main_category', 'listing_type', 'price', 'city_en', 'district_ar',
  'finishing_status_ar', 'property_detail_ar', 'rooms', 'bathrooms',
  'image_1', 'image_2', 'image_3', 'image_4', 'image_5', 'image_6', 'image_7', 'image_8', 'image_9', 'image_10',
  'description_ar', 'active'];
var NUMERIC = { price: 1, rooms: 1, bathrooms: 1 };
var LIMITS = { title_ar: 200, description_ar: 4000 };

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function hashPass_(pass) {
  var h = PASS_SALT + '|' + pass;
  for (var i = 0; i < HASH_ROUNDS; i++) h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + '|' + i));
  return h;
}

function authOk_(p) {
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('authfail') || 0);
  if (fails >= 5) return 'locked';
  if (hashPass_(String(p || '')) !== PASS_HASH) { cache.put('authfail', String(fails + 1), 900); return 'auth'; }
  cache.remove('authfail');
  return '';
}

function unitsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var head = sheets[i].getRange(1, 1, 1, Math.max(1, sheets[i].getLastColumn())).getValues()[0];
    if (head.indexOf('property_id') > -1) return sheets[i];
  }
  throw new Error('units tab not found');
}

function headers_(sh) { return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String); }

function ensureActiveCol_(sh) {
  var h = headers_(sh);
  if (h.indexOf('active') === -1) { sh.getRange(1, h.length + 1).setValue('active'); h.push('active'); }
  return h;
}

function rowToObj_(h, row) { var o = {}; h.forEach(function (k, i) { o[k] = row[i]; }); return o; }

function clean_(k, v) {
  if (v == null) return '';
  if (NUMERIC[k]) { var n = Number(String(v).replace(/[^\d.]/g, '')); return isFinite(n) && String(v).trim() !== '' ? n : ''; }
  var s = String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').trim();
  if (/^image_\d+$/.test(k)) return /^https:\/\/[^\s]+$/.test(s) ? s.slice(0, 600) : '';
  if (k === 'listing_type') return s === 'Rent' ? 'Rent' : 'Sale';
  if (k === 'active') return v === false || /^(false|no|0|hidden|مخفي)$/i.test(s) ? false : true;
  s = s.slice(0, LIMITS[k] || 100);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function log_(action, id, before) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var t = ss.getSheetByName(CHANGES_TAB) || ss.insertSheet(CHANGES_TAB);
  if (t.getLastRow() === 0) t.appendRow(['ts', 'action', 'property_id', 'before_json']);
  t.appendRow([new Date(), action, id, before ? JSON.stringify(before) : '']);
}

function nextId_(h, rows) {
  var idx = h.indexOf('property_id'), max = 0;
  rows.forEach(function (r) { var m = String(r[idx]).match(/^PROP_(\d+)$/); if (m) max = Math.max(max, Number(m[1])); });
  var n = String(max + 1); while (n.length < 3) n = '0' + n;
  return 'PROP_' + n;
}

function doPost(e) {
  var data;
  try { data = JSON.parse((e && e.postData && e.postData.contents) || ''); } catch (err) { return json_({ ok: false, error: 'bad_json' }); }
  var a = authOk_(data && data.p);
  if (a) return json_({ ok: false, error: a });
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = unitsSheet_();
    var h = ensureActiveCol_(sh);
    var last = sh.getLastRow();
    var rows = last > 1 ? sh.getRange(2, 1, last - 1, h.length).getValues() : [];
    var idIdx = h.indexOf('property_id');
    if (data.action === 'list') {
      return json_({ ok: true, units: rows.map(function (r) { return rowToObj_(h, r); }), columns: COLS });
    }
    if (data.action === 'active') {
      var i = rows.findIndex(function (r) { return String(r[idIdx]) === String(data.id); });
      if (i < 0) return json_({ ok: false, error: 'not_found' });
      log_('active', data.id, rowToObj_(h, rows[i]));
      sh.getRange(i + 2, h.indexOf('active') + 1).setValue(data.active === false ? false : true);
      return json_({ ok: true, id: data.id });
    }
    if (data.action === 'save' && data.unit) {
      var u = data.unit, id = String(u.property_id || '').trim();
      var pos = id ? rows.findIndex(function (r) { return String(r[idIdx]) === id; }) : -1;
      if (id && pos < 0) return json_({ ok: false, error: 'not_found' });
      if (!String(u.title_ar || '').trim()) return json_({ ok: false, error: 'title_required' });
      if (!clean_('price', u.price)) return json_({ ok: false, error: 'price_required' });
      var out = h.map(function (k) {
        if (k === 'property_id') return pos < 0 ? nextId_(h, rows) : id;
        if (COLS.indexOf(k) === -1) return pos < 0 ? '' : rows[pos][h.indexOf(k)]; // never touch unknown columns
        if (!(k in u)) return pos < 0 ? (k === 'active' ? true : '') : rows[pos][h.indexOf(k)];
        return clean_(k, u[k]);
      });
      if (pos < 0) { sh.getRange(sh.getLastRow() + 1, 1, 1, h.length).setValues([out]); log_('add', out[idIdx], null); }
      else { log_('update', id, rowToObj_(h, rows[pos])); sh.getRange(pos + 2, 1, 1, h.length).setValues([out]); }
      return json_({ ok: true, id: out[idIdx] });
    }
    return json_({ ok: false, error: 'bad_action' });
  } finally { lock.releaseLock(); }
}
