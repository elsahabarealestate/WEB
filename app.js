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

  /* ── Step 2 — Paint the page shell right away (no waiting on data) ── */
  const renderers = { renderVideoSection, renderProperties, renderTestimonials };
  let painted = false;

  const cached = _loadCache();
  if (cached) {
    // Returning visitor: show last-good data instantly, refresh in background.
    try { _applyData(cached, renderers); painted = true; } catch (e) { console.error(e); }
  } else {
    _showSkeletons();
  }
  setLoaderProgress(100);
  setTimeout(hideLoader, painted ? 150 : 350);

  /* ── Step 3 — Fetch fresh data in the background (8s timeout) ── */
  let data = null;
  try {
    data = await _withTimeout(fetchSiteData(), FETCH_TIMEOUT_MS);
  } catch (err) {
    console.warn('[ElSahaba] API request failed.', err);
  }

  if (_isValidData(data)) {
    _saveCache(data);
    try { _applyData(data, renderers); } catch (err) { console.error('[ElSahaba] Render failed.', err); }
  } else if (!painted) {
    console.warn('[ElSahaba] No data available, showing fallback content.');
    try { _applyFallback(renderTestimonials); } catch (e) { console.error(e); }
  }

  /* ── Step 4 — Re-run scroll reveal for dynamically added cards ── */
  requestAnimationFrame(() => {
    setTimeout(bindScrollReveal, 200);
  });
}

function _showSkeletons() {
  const grid = document.getElementById('props-grid');
  if (!grid) return;
  const card = '<div class="skeleton-card"><div class="skeleton-img"></div><div class="skeleton-body"><div class="skeleton-title"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div><div class="skeleton-footer"></div></div></div>';
  grid.innerHTML = card + card + card;
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
