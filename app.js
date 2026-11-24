/** 
 * ═══════════════════════════════════════════════════════════
 *  app.js — Main Application Entry Point
 *  El Sahaba Real Estate Landing Page
 *  -------------------------------------------------------
 *  Orchestrates:
 *    1. Boot sequence (particles, nav, scroll, float buttons)
 *    2. API fetch with progress feedback
 *    3. Data rendering (video, properties, testimonials)
 *    4. Graceful fallback when API is unavailable
 *    5. Hides loader only after full render is complete
 *
 *  Depends on (loaded before this file, in order):
 *    api.js    → window.ElSahabaAPI
 *    render.js → window.ElSahabaRender
 *    ui.js     → window.ElSahabaUI
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

document.addEventListener('DOMContentLoaded', _boot);

/* ──────────────────────────────────────────────────────────
   BOOT
   ────────────────────────────────────────────────────────── */
async function _boot() {
  const { setLoaderProgress, setLoaderStatus, hideLoader,
          bindNav, bindFloatButtons, bindScrollReveal, spawnParticles }
    = window.ElSahabaUI;

  const { fetchSiteData }
    = window.ElSahabaAPI;

  const { renderVideoSection, renderProperties, renderTestimonials }
    = window.ElSahabaRender;

  /* ── Step 1 — Static UI setup (no network needed) ── */
  spawnParticles();
  bindNav();
  bindScrollReveal();
  bindFloatButtons();

  /* ── Step 2 — Start data fetch with progress feedback ── */
  setLoaderProgress(10);
  setLoaderStatus('جارٍ تحميل البيانات…');

  let data = null;
  try {
    data = await _withTimeout(fetchSiteData(), FETCH_TIMEOUT_MS);
  } catch (err) {
    console.warn('[ElSahaba] API request failed.', err);
  }

  if (_isValidData(data)) {
    _saveCache(data);
  } else {
    // Failed, timed out, or returned nothing: use last good data if we have it.
    const cached = _loadCache();
    if (cached) {
      console.warn('[ElSahaba] Using cached data.');
      data = cached;
    } else {
      console.warn('[ElSahaba] No data available, showing fallback content.');
      setLoaderProgress(100);
      setLoaderStatus('جاهز');
      try { _applyFallback(renderTestimonials); } catch (e) { console.error(e); }
      setTimeout(hideLoader, 700);
      return;
    }
  }
  setLoaderProgress(60);
  setLoaderStatus('جارٍ بناء الصفحة…');

  /* ── Step 3 — Render data into the page ── */
  try {
    _applyData(data, { renderVideoSection, renderProperties, renderTestimonials });
  } catch (err) {
    console.error('[ElSahaba] Render failed.', err);
  }

  setLoaderProgress(100);
  setLoaderStatus('جاهز!');

  /* ── Step 4 — Reveal page (short delay for final paint) ── */
  setTimeout(hideLoader, 700);

  /* ── Step 5 — Re-run scroll reveal for dynamically added cards ── */
  requestAnimationFrame(() => {
    setTimeout(bindScrollReveal, 200);
  });
}


/* ──────────────────────────────────────────────────────────
   DATA APPLICATION
   ────────────────────────────────────────────────────────── */

/**
 * _applyData(data, renderers)
 * ---------------------------
 * Distributes normalised API data to the appropriate
 * renderer functions.
 */
function _applyData(data, { renderVideoSection, renderProperties, renderTestimonials }) {
  const settings = data.settings || {};
  const properties = Array.isArray(data.properties) ? data.properties : [];
  const testimonials = Array.isArray(data.testimonials) ? data.testimonials : [];

  renderVideoSection(settings);
  renderProperties(properties);
  renderTestimonials(testimonials);

  window.ElSahabaUI.setLoaderProgress(90);
}

/**
 * _applyFallback(renderTestimonials)
 * -----------------------------------
 * Called when the API fails.
 * Testimonials hide when there are none (nothing is invented).
 * The properties grid will show the empty-state message.
 */
function _applyFallback(renderTestimonials) {
  renderTestimonials([]);
  // Properties grid empty state is handled inside renderProperties([])
  window.ElSahabaRender.renderProperties([]);
}


/* ──────────────────────────────────────────────────────────
   RESILIENCE HELPERS (timeout, validation, last-good cache)
   ────────────────────────────────────────────────────────── */
const FETCH_TIMEOUT_MS = 8000;
const CACHE_KEY = 'elsahaba:lastGoodData:v1';

function _withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    Promise.resolve(promise).then(
      v => { clearTimeout(t); resolve(v); },
      e => { clearTimeout(t); reject(e); }
    );
  });
}

function _isValidData(d) {
  return !!d && typeof d === 'object' && !Array.isArray(d);
}

function _saveCache(d) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) { /* ignore */ }
}

function _loadCache() {
  try {
    const d = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    return _isValidData(d) ? d : null;
  } catch (e) { return null; }
}
