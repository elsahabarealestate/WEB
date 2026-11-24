// Daily keep-alive: one tiny read so the free Supabase project never counts as inactive.
// Called by the Vercel cron in vercel.json. The key below is Supabase's PUBLISHABLE key,
// the same public key the website already sends from every visitor's browser.
const SUPABASE_URL = 'https://uevycvzopnyxweecoqkl.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_OyDCxuMjNfAunWNlLSQpFg_-cgrPVPx';

module.exports = async (req, res) => {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=*&limit=1`, {
      headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${PUBLISHABLE_KEY}` },
    });
    res.setHeader('Cache-Control', 'no-store');
    res.status(r.ok ? 200 : 502).json({ ok: r.ok, supabaseStatus: r.status, at: new Date().toISOString() });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e && e.message || e) });
  }
};
