// Run: node tests/analytics.test.js  (loads apps-script/analytics.gs with mocked Google services)
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../apps-script/analytics.gs', 'utf8');
function mk(passHash) {
  const rows = [['ts', 'sid', 'type', 'path', 'unit', 'ref', 'dev', 'lang', 'extra']];
  const store = {};
  const ctx = {
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (a, s) => Array.from(crypto.createHash('sha256').update(s).digest()),
      base64Encode: (b) => Buffer.from(b).toString('base64'),
      formatDate: (d) => d.toISOString().slice(0, 10),
    },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ s, setMimeType() { return this; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: (k) => store[k] || null, put: (k, v) => { store[k] = v; }, remove: (k) => { delete store[k]; } }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSheetByName: () => ({
        appendRow() {}, setFrozenRows() {}, getLastRow: () => rows.length,
        getRange: (r, c, n) => ({ setValues: (v) => v.forEach((x) => rows.push(x)), getValues: () => rows.slice(r - 1, r - 1 + n) }),
      }), insertSheet() {} }) },
    console, Date, JSON, Math, Number, String, Object, Array, parseInt,
  };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  ctx.PASS_SALT = 'salt1'; vm.runInContext("PASS_SALT='salt1'", ctx);
  const h = vm.runInContext("hashPass_('correct horse battery')", ctx);
  vm.runInContext(`PASS_HASH=${JSON.stringify(h)}`, ctx);
  return { ctx, rows, store };
}
const post = (c, o) => JSON.parse(c.doPost({ postData: { contents: typeof o === 'string' ? o : JSON.stringify(o) } }).s);
const { ctx, rows, store } = mk();
const ev = (t, o) => Object.assign({ t, p: '/', u: '', r: '', d: 'm', l: 'ar', x: '', s: 'a1' }, o);

assert.deepStrictEqual(post(ctx, { events: [ev('pv'), ev('unit_view', { u: 'PROP_001', p: '/property/PROP_001' }), ev('wa_click', { u: 'PROP_001' })] }), { ok: true, n: 3 });
assert.strictEqual(post(ctx, { events: [ev('hack')] }).error, 'invalid');
assert.strictEqual(post(ctx, 'not json').error, 'bad_json');
assert.strictEqual(post(ctx, { events: [ev('pv', { r: '=HYPERLINK("x")' })] }).ok, true);
assert.ok(String(rows[rows.length - 1][5]).startsWith("'="), 'formula injection neutralised');
assert.strictEqual(post(ctx, { events: Array(30).fill(ev('pv')) }).n, 20, 'batch capped at 20');
assert.strictEqual(post(ctx, 'x'.repeat(9000)).error, 'too_large');
// more data for stats: second session, search, filter
post(ctx, { events: [ev('pv', { s: 'b2', d: 'd', r: 'google.com' }), ev('unit_view', { s: 'b2', u: 'PROP_002' }), ev('search', { x: 'الهرم' }), ev('filter', { x: 'city=giza' }), ev('wa_click', { u: 'PROP_002', s: 'b2' })] });
// stats: wrong pass, then right pass
assert.strictEqual(post(ctx, { action: 'stats', p: 'nope' }).error, 'auth');
const ok = post(ctx, { action: 'stats', p: 'correct horse battery', days: 7 });
assert.strictEqual(ok.ok, true);
const s = ok.stats;
assert.strictEqual(s.sessions, 2);
assert.strictEqual(s.totals.wa_click, 2);
assert.strictEqual(s.units.find((x) => x.id === 'PROP_001').wa, 1);
assert.strictEqual(s.devices.d, 1);
assert.ok(s.devices.m > 0);
assert.strictEqual(s.referrers.find((x) => x.k === 'google.com').n, 1);
assert.strictEqual(s.searches[0].k, 'الهرم');
// lockout after 5 failures
for (let i = 0; i < 5; i++) post(ctx, { action: 'stats', p: 'bad' + i });
assert.strictEqual(post(ctx, { action: 'stats', p: 'correct horse battery' }).error, 'locked');
// old rows excluded
const m2 = mk(); const old = new Date(Date.now() - 40 * 86400000);
m2.rows.push([old, 'z', 'pv', '/', '', '', 'm', 'ar', '']);
assert.strictEqual(post(m2.ctx, { action: 'stats', p: 'correct horse battery', days: 30 }).stats.totals.pv, 0);
console.log('analytics.gs: all tests passed');
