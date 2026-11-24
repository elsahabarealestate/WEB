// One real, shareable page per listing: /property/<id>
// Server-rendered so Google, WhatsApp and Facebook see title, price, photos and description.
const { sb, esc, img, SITE, WA_NUMBER, sheetProps, normalizeSupabase, normalizeSheet } = require('./_lib');

function page({ title, desc, canonical, ogImage, body, jsonld, status }) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" href="/favicon.ico" sizes="48x48" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  ${status === 404 ? '<meta name="robots" content="noindex" />' : ''}
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="الصحابة العقارية" />
  <meta property="og:locale" content="ar_EG" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  ${ogImage ? `<meta property="og:image" content="${esc(ogImage)}" />\n  <meta name="twitter:card" content="summary_large_image" />` : ''}
  <link rel="preconnect" href="https://res.cloudinary.com" crossorigin />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;800&family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    :root{--green-deep:#0d2818;--green-rich:#14391f;--gold:#c9a84c;--gold-light:#e4c97a;--wa:#25D366}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Cairo',sans-serif;background:var(--green-deep);color:rgba(255,255,255,.92);line-height:1.8}
    a{color:inherit;text-decoration:none}
    .top{display:flex;align-items:center;justify-content:space-between;padding:14px 5%;background:rgba(8,19,11,.94);border-bottom:1px solid rgba(201,168,76,.15)}
    .top img{height:38px}.top a.back{color:var(--gold);font-weight:600;font-size:.95rem}
    main{max-width:960px;margin:0 auto;padding:22px 5% 120px}
    .gallery{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;border-radius:12px}
    .gallery img{flex:0 0 100%;width:100%;max-height:520px;object-fit:cover;scroll-snap-align:center;border-radius:12px;background:#14391f}
    @media(min-width:760px){.gallery img{flex-basis:78%}}
    h1{font-family:'Tajawal',sans-serif;font-size:1.6rem;line-height:1.5;margin:22px 0 8px}
    .status{display:inline-block;background:rgba(201,168,76,.15);color:var(--gold-light);border:1px solid rgba(201,168,76,.35);border-radius:20px;padding:2px 14px;font-size:.85rem}
    .price{font-family:'Tajawal',sans-serif;font-size:1.9rem;font-weight:800;color:var(--gold);margin:14px 0}
    .desc{white-space:pre-line;color:rgba(255,255,255,.82);font-size:1.02rem}
    .actions{display:flex;gap:12px;flex-wrap:wrap;margin:26px 0}
    .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 24px;border-radius:8px;font-weight:700;font-size:1rem;border:1px solid var(--gold);cursor:pointer;font-family:inherit}
    .btn.wa{background:var(--wa);border-color:var(--wa);color:#07210f}
    .btn.share{background:transparent;color:var(--gold)}
    .linkbox{margin-bottom:22px}
    .linkbox input{width:100%;background:rgba(255,255,255,.05);color:rgba(255,255,255,.75);border:1px dashed rgba(201,168,76,.4);border-radius:8px;padding:10px 12px;font-size:.9rem}
    .facts{list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:6px 0 18px}
    .facts li{background:rgba(255,255,255,.05);border:1px solid rgba(201,168,76,.15);border-radius:10px;padding:10px 14px}
    .facts span{display:block;color:rgba(255,255,255,.5);font-size:.8rem}
    .sim-h{font-size:1.2rem;margin:28px 0 12px;color:var(--gold-light)}
    .sim{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
    .sim-card{display:block;text-decoration:none;color:inherit;background:rgba(255,255,255,.05);border:1px solid rgba(201,168,76,.15);border-radius:12px;overflow:hidden}
    .sim-card img{width:100%;height:150px;object-fit:cover;display:block;background:#14391f}
    .sim-t{padding:10px 12px 2px;font-size:.9rem;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .sim-p{padding:0 12px 12px;color:var(--gold-light);font-weight:700}
    .note{color:rgba(255,255,255,.5);font-size:.85rem;margin-top:30px}
    .empty{text-align:center;padding:90px 0}
  </style>
  ${jsonld ? `<script type="application/ld+json">${jsonld}</script>` : ''}
</head>
<body>
  <header class="top">
    <a href="/" aria-label="الصحابة العقارية"><img src="https://res.cloudinary.com/daicsoapy/image/upload/w_320,q_auto,f_auto/v1777700851/Picture5_i6btgv.gif" alt="الصحابة العقارية" /></a>
    <a class="back" href="/#properties">كل الوحدات ←</a>
  </header>
  <main>${body}</main>
</body>
</html>`;
}

module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || '').trim();
  const send = (code, html, cache) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', cache);
    res.end(html);
  };

  const isSheet = /^PROP_\d{1,6}$/.test(id);
  if (!isSheet && !/^\d{1,9}$/.test(id)) {
    return send(404, page({
      title: 'الوحدة غير موجودة | الصحابة العقارية', desc: 'الوحدة غير موجودة.', canonical: SITE + '/', status: 404,
      body: '<div class="empty"><h1>الوحدة دي مش موجودة</h1><p><a class="btn share" href="/">شوف كل الوحدات المتاحة</a></p></div>',
    }), 'public, s-maxage=60');
  }

  let p;
  try {
    if (isSheet) {
      const all = await sheetProps();
      const row = all.find((x) => String(x.property_id) === id);
      p = row && normalizeSheet(row);
    } else {
      const rows = await sb(`properties?select=*&id=eq.${id}&limit=1`);
      p = rows && rows[0] && normalizeSupabase(rows[0]);
    }
  } catch (e) {
    return send(503, page({
      title: 'جاري التحميل | الصحابة العقارية', desc: 'حاول مرة تانية بعد لحظات.', canonical: SITE + '/property/' + id, status: 404,
      body: '<div class="empty"><h1>حصلت مشكلة مؤقتة</h1><p>جرب تفتح الصفحة تاني بعد دقيقة.</p></div>',
    }), 'no-store');
  }

  if (!p) {
    return send(404, page({
      title: 'الوحدة غير موجودة | الصحابة العقارية', desc: 'الوحدة غير موجودة.', canonical: SITE + '/', status: 404,
      body: '<div class="empty"><h1>الوحدة دي مش موجودة</h1><p><a class="btn share" href="/">شوف كل الوحدات المتاحة</a></p></div>',
    }), 'public, s-maxage=60');
  }

  const { title, price, status, description, images: imgs, facts } = p;

  // Similar units: same status, district and type rank first. Never blocks the page.
  let similarHtml = '';
  try {
    const [sheetR, sbR] = await Promise.allSettled([sheetProps(), sb('properties?select=*&order=id.asc')]);
    const pool = [];
    if (sheetR.status === 'fulfilled') sheetR.value.forEach((r) => pool.push(normalizeSheet(r)));
    if (sbR.status === 'fulfilled' && Array.isArray(sbR.value)) sbR.value.forEach((r) => pool.push(normalizeSupabase(r)));
    const picks = pool
      .filter((u) => u.key !== id && u.images.length)
      .map((u) => ({ u, score: (u.status && u.status === status ? 2 : 0) + (u.district && u.district === p.district ? 2 : 0) + (u.type && u.type === p.type ? 1 : 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.u);
    if (picks.length) {
      similarHtml = `<h2 class="sim-h">وحدات مشابهة</h2><div class="sim">${picks.map((u) => `<a class="sim-card" href="/property/${esc(u.key)}"><img src="${esc(img(u.images[0], 480))}" alt="${esc(u.title)}" loading="lazy"/><div class="sim-t">${esc(u.title)}</div>${u.price ? `<div class="sim-p">${esc(u.price)}</div>` : ''}</a>`).join('')}</div>`;
    }
  } catch (e) { /* skip the strip */ }

  const url = `${SITE}/property/${id}`;
  const shortDesc = (description.replace(/\s+/g, ' ').slice(0, 155) || title) + (description.length > 155 ? '…' : '');
  const pageTitle = `${title} | الصحابة العقارية`;
  const waText = `السلام عليكم، مهتم بالوحدة دي: ${title}${price ? ' (' + price + ')' : ''}\n${url}`;
  const waLink = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waText)}`;

  const jsonld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: title,
    description: shortDesc,
    url,
    ...(imgs.length ? { image: imgs.slice(0, 5).map((u) => img(u, 1200)) } : {}),
    provider: { '@type': 'RealEstateAgent', name: 'الصحابة العقارية', url: SITE + '/', telephone: '+' + WA_NUMBER },
  }).replace(/</g, '\\u003c');

  const body = `
    ${imgs.length ? `<div class="gallery">${imgs.map((u, i) => `<img src="${esc(img(u, 1000))}" alt="${esc(title)} ${i + 1}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} />`).join('')}</div>` : ''}
    <h1>${esc(title)}</h1>
    ${status ? `<span class="status">${esc(status)}</span>` : ''}
    ${price ? `<div class="price">${esc(price)}</div>` : ''}
    ${facts.length ? `<ul class="facts">${facts.map((f) => `<li><span>${esc(f[0])}</span><b>${esc(f[1])}</b></li>`).join('')}</ul>` : ''}
    <div class="actions">
      <a class="btn wa" href="${esc(waLink)}" target="_blank" rel="noopener">واتساب: استفسر عن الوحدة دي</a>
      <button class="btn share" id="copy" type="button">نسخ لينك الوحدة</button>
      <button class="btn share" id="share" type="button">شارك الوحدة</button>
    </div>
    <div class="linkbox" dir="ltr"><input id="linkval" type="text" readonly value="${esc(url)}" aria-label="لينك الوحدة" /></div>
    ${description ? `<div class="desc">${esc(description)}</div>` : ''}
    ${similarHtml}
    <p class="note">الصحابة العقارية، مستشار أمين مش بياع.</p>
    <script>
      document.getElementById('copy').addEventListener('click', async function () {
        var btn = this, url = ${JSON.stringify(url)}, ok = false;
        try { await navigator.clipboard.writeText(url); ok = true; } catch (e) {}
        if (!ok) { var i = document.getElementById('linkval'); i.focus(); i.select(); try { ok = document.execCommand('copy'); } catch (e) {} }
        btn.textContent = ok ? 'تم النسخ ✓' : 'انسخ اللينك من الخانة تحت';
        setTimeout(function () { btn.textContent = 'نسخ لينك الوحدة'; }, 2500);
      });
      document.getElementById('linkval').addEventListener('focus', function () { this.select(); });
      document.getElementById('share').addEventListener('click', async function () {
        var data = { title: ${JSON.stringify(title).replace(/</g, '\\u003c')}, url: ${JSON.stringify(url)} };
        try {
          if (navigator.share) { await navigator.share(data); }
          else { await navigator.clipboard.writeText(data.url); this.textContent = 'تم نسخ اللينك'; }
        } catch (e) {}
      });
    </script>`;

  send(200, page({
    title: pageTitle, desc: shortDesc, canonical: url,
    ogImage: imgs[0] ? img(imgs[0], 1200) : '', body, jsonld,
  }), 'public, s-maxage=300, stale-while-revalidate=86400');
};
