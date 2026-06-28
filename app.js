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

  let data;
  try {
    data = await fetchSiteData();
    setLoaderProgress(60);
    setLoaderStatus('جارٍ بناء الصفحة…');
  } catch (err) {
    console.warn('[ElSahaba] API unavailable — showing fallback content.', err);
    setLoaderProgress(100);
    setLoaderStatus('جاهز');
    _applyFallback(renderTestimonials);
    setTimeout(hideLoader, 700);
    return;
  }

  /* ── Step 3 — Render data into the page ── */
  _applyData(data, { renderVideoSection, renderProperties, renderTestimonials });

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
  const { settings = {}, properties = [], testimonials = [] } = data;

  renderVideoSection(settings);
  renderProperties(properties);
  renderTestimonials(testimonials.length ? testimonials : null);

  window.ElSahabaUI.setLoaderProgress(90);
}

/**
 * _applyFallback(renderTestimonials)
 * -----------------------------------
 * Called when the API fails.
 * Renders fallback testimonials so the page is never empty.
 * The properties grid will show the empty-state message.
 */
function _applyFallback(renderTestimonials) {
  // Pass null → render.js will use the built-in fallback list
  renderTestimonials(null);
  // Properties grid empty state is handled inside renderProperties([])
  window.ElSahabaRender.renderProperties([]);
}
