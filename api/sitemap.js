// Dynamic sitemap: the 3 static pages plus one URL per listing.
const { sb, SITE } = require('./_lib');

module.exports = async (req, res) => {
  const urls = ['/', '/properties.html', '/aerid-aqarak.html'].map((p) => SITE + p);
  try {
    const rows = await sb('properties?select=id&order=id.asc');
    (rows || []).forEach((r) => { if (/^\d+$/.test(String(r.id))) urls.push(`${SITE}/property/${r.id}`); });
  } catch (e) { /* serve the static pages if the database is down */ }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n';
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.end(xml);
};
