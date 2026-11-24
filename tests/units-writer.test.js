// Run: node tests/units-writer.test.js  (runs units-writer.gs with a mocked Sheet)
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../apps-script/units-writer.gs', 'utf8');
const store = {}, tabs = {};
const grid = [
  ['property_id', 'title_ar', 'price', 'listing_type', 'rooms', 'image_1', 'notes_private'],
  ['PROP_001', 'شقة قديمة', 1000000, 'Sale', 3, 'https://x/a.jpg', 'secret note'],
  ['PROP_002', 'مكتب', 2000000, 'Sale', '', '', ''],
];
const sheetObj = {
  getLastRow: () => grid.length, getLastColumn: () => grid[0].length,
  getRange: (r, c, nr = 1, nc = 1) => ({
    getValues: () => { const o = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) row.push((grid[r - 1 + i] || [])[c - 1 + j] ?? ''); o.push(row); } return o; },
    setValue: (v) => { grid[r - 1] = grid[r - 1] || []; grid[r - 1][c - 1] = v; },
    setValues: (vv) => vv.forEach((row, i) => row.forEach((v, j) => { grid[r - 1 + i] = grid[r - 1 + i] || []; grid[r - 1 + i][c - 1 + j] = v; })),
  }),
};
const changes = [];
const ctx = {
  Utilities: { DigestAlgorithm: { SHA_256: 1 }, computeDigest: (a, s) => Array.from(crypto.createHash('sha256').update(s).digest()), base64Encode: (b) => Buffer.from(b).toString('base64') },
  ContentService: { MimeType: { JSON: 1 }, createTextOutput: (s) => ({ s, setMimeType() { return this; } }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  CacheService: { getScriptCache: () => ({ get: (k) => store[k] || null, put: (k, v) => { store[k] = v; }, remove: (k) => { delete store[k]; } }) },
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheets: () => [sheetObj], getSheetByName: (n) => n === 'changes' ? (tabs.changes || null) : null,
    insertSheet: (n) => (tabs.changes = { getLastRow: () => changes.length, appendRow: (r) => changes.push(r) }) }) },
  console, Date, JSON, Math, Number, String, Object, Array, isFinite,
};
vm.createContext(ctx); vm.runInContext(src, ctx);
vm.runInContext("PASS_SALT='s'", ctx);
vm.runInContext(`PASS_HASH=${JSON.stringify(vm.runInContext("hashPass_('long passphrase 1')", ctx))}`, ctx);
const call = (o) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(o) } }).s);
const P = 'long passphrase 1';

assert.strictEqual(call({ action: 'list', p: 'wrong' }).error, 'auth');
let r = call({ action: 'list', p: P });
assert.strictEqual(r.ok, true); assert.strictEqual(r.units.length, 2);
assert.ok(grid[0].includes('active'), 'active column added');
// add
r = call({ action: 'save', p: P, unit: { title_ar: 'شقة جديدة', price: '1,750,000', listing_type: 'Rent', rooms: '2', image_1: 'http://bad', description_ar: '=cmd()' } });
assert.deepStrictEqual([r.ok, r.id], [true, 'PROP_003']);
const row3 = grid[3]; const h = grid[0];
assert.strictEqual(row3[h.indexOf('price')], 1750000);
assert.strictEqual(row3[h.indexOf('listing_type')], 'Rent');
assert.strictEqual(row3[h.indexOf('image_1')], '', 'non-https image dropped');
assert.strictEqual(row3[h.indexOf('active')], true);
assert.strictEqual(changes.at(-1)[1], 'add');
// update keeps untouched fields and unknown columns
r = call({ action: 'save', p: P, unit: { property_id: 'PROP_001', title_ar: 'شقة محدثة', price: 1100000 } });
assert.strictEqual(r.ok, true);
assert.strictEqual(grid[1][h.indexOf('title_ar')], 'شقة محدثة');
assert.strictEqual(grid[1][h.indexOf('rooms')], 3, 'untouched field kept');
assert.strictEqual(grid[1][h.indexOf('notes_private')], 'secret note', 'unknown column untouched');
assert.strictEqual(JSON.parse(changes.at(-1)[3]).title_ar, 'شقة قديمة', 'previous row logged for undo');
// validation
assert.strictEqual(call({ action: 'save', p: P, unit: { price: 5 } }).error, 'title_required');
assert.strictEqual(call({ action: 'save', p: P, unit: { title_ar: 'x' } }).error, 'price_required');
assert.strictEqual(call({ action: 'save', p: P, unit: { property_id: 'PROP_999', title_ar: 'x', price: 1 } }).error, 'not_found');
// hide / show
assert.strictEqual(call({ action: 'active', p: P, id: 'PROP_002', active: false }).ok, true);
assert.strictEqual(grid[2][h.indexOf('active')], false);
assert.strictEqual(call({ action: 'active', p: P, id: 'PROP_002', active: true }).ok, true);
assert.strictEqual(grid[2][h.indexOf('active')], true);
assert.strictEqual(call({ action: 'active', p: P, id: 'NOPE', active: false }).error, 'not_found');
assert.strictEqual(grid.length, 4, 'no row ever deleted');
// lockout
for (let i = 0; i < 5; i++) call({ action: 'list', p: 'bad' + i });
assert.strictEqual(call({ action: 'list', p: P }).error, 'locked');
console.log('units-writer.gs: all tests passed');
