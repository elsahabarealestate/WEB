// Shared helpers for the listing pages and the dynamic sitemap.
const SUPABASE_URL = 'https://uevycvzopnyxweecoqkl.supabase.co';
// Supabase PUBLISHABLE key: public by design, the website already sends it from every browser.
const PUBLISHABLE_KEY = 'sb_publishable_OyDCxuMjNfAunWNlLSQpFg_-cgrPVPx';
const SITE = 'https://www.elsahaba.homes';
const WA_NUMBER = '201227164595';

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${PUBLISHABLE_KEY}` },
  });
  if (!r.ok) throw new Error('supabase ' + r.status);
  return r.json();
}

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function images(p) {
  const out = [];
  for (let n = 1; n <= 10; n++) {
    const u = p['Image' + n] || p['image' + n] || '';
    if (u && u !== 'NaN' && /^https:\/\//.test(String(u).trim())) out.push(String(u).trim());
  }
  return out;
}

// Ask Cloudinary for a resized, auto-format copy.
function img(url, w) {
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/') && !url.includes('/image/upload/w_')) {
    return url.replace('/image/upload/', `/image/upload/w_${w},c_limit,q_auto,f_auto/`);
  }
  return url;
}

// The main inventory (properties.html) lives in a Google Apps Script endpoint (a Google Sheet).
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzg4uUlhw_LuVpQQPIIukb90nkOpQ8H-DR8CuxaJpkcD0BN6baoYUWWoJVMNvKWv0t4/exec';

async function sheetProps() {
  const r = await fetch(GAS_URL, { redirect: 'follow' });
  if (!r.ok) throw new Error('sheet ' + r.status);
  const d = await r.json();
  const list = Array.isArray(d) ? d : (d && d.properties) || [];
  return list.filter((p) => p && /^PROP_\d+$/.test(String(p.property_id || '')));
}

function fmtPrice(raw) {
  const n = Number(String(raw == null ? '' : raw).replace(/[^\d.]/g, ''));
  if (!n) return String(raw || '').trim();
  return n.toLocaleString('en-US') + ' ج.م';
}

const CITY = { Giza: 'الجيزة', Cairo: 'القاهرة', 'New Cairo': 'القاهرة الجديدة', 'North Coast': 'الساحل الشمالي', 'Ain Sokhna': 'العين السخنة' };

// Turn either data source into one shape the page can render.
function normalizeSupabase(p) {
  return {
    key: String(p.id), title: (p.Title || 'عقار مميز').trim(), price: (p.Price || '').toString().trim(),
    status: (p.Property_Status || '').toString().trim(), description: (p.Description || '').toString().trim(),
    images: images(p), facts: [],
  };
}
function normalizeSheet(p) {
  const facts = [];
  if (p.district_ar) facts.push(['المنطقة', String(p.district_ar) + (p.city_en && CITY[p.city_en] ? '، ' + CITY[p.city_en] : '')]);
  if (p.property_detail_ar) facts.push(['نوع الوحدة', p.property_detail_ar]);
  if (p.finishing_status_ar) facts.push(['التشطيب', p.finishing_status_ar]);
  if (Number(p.rooms)) facts.push(['الغرف', p.rooms]);
  if (Number(p.bathrooms)) facts.push(['الحمامات', p.bathrooms]);
  const imgs = [];
  for (let n = 1; n <= 10; n++) {
    const u = p['image_' + n] || '';
    if (u && u !== 'NaN' && /^https:\/\//.test(String(u).trim())) imgs.push(String(u).trim());
  }
  return {
    key: String(p.property_id), title: (p.title_ar || 'عقار مميز').trim(), price: fmtPrice(p.price),
    status: p.listing_type === 'Rent' ? 'للإيجار' : 'للبيع', description: (p.description_ar || '').toString().trim(),
    images: imgs, facts,
  };
}

module.exports = { sb, esc, images, img, SITE, WA_NUMBER, sheetProps, normalizeSupabase, normalizeSheet };
