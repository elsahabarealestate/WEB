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

module.exports = { sb, esc, images, img, SITE, WA_NUMBER };
