/**
 * ═══════════════════════════════════════════════════════════
 *  ui.js — UI Interactions Module
 *  El Sahaba Real Estate Platform
 *  -------------------------------------------------------
 *  Provides:
 *    • Loader controls (progress, status, hide)
 *    • Navigation (sticky, mobile drawer)
 *    • Floating buttons (CTA, WhatsApp)
 *    • Scroll reveal (IntersectionObserver)
 *    • Hero particles
 *    • Modal / Bottom Sheet controls
 *    • Property filters (client-side filtering engine)
 * ═══════════════════════════════════════════════════════════
 */
 
'use strict';

/* ──────────────────────────────────────────────────────────
   LOADER UTILITIES
   ────────────────────────────────────────────────────────── */
function setLoaderProgress(pct) {
  const fill = document.getElementById('loader-fill');
  if (fill) fill.style.width = Math.min(pct, 100) + '%';
}

function setLoaderStatus(msg) {
  const el = document.getElementById('loader-status');
  if (el) el.textContent = msg;
}

function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) loader.classList.add('hidden');
}


/* ──────────────────────────────────────────────────────────
   NAVIGATION
   ────────────────────────────────────────────────────────── */
function bindNav() {
  const nav     = document.getElementById('main-nav');
  const burger  = document.getElementById('hamburger');
  const mobileN = document.getElementById('mobile-nav');
  const overlay = document.getElementById('mobile-overlay');
  const closeBtn= document.getElementById('mobile-close');

  window.addEventListener('scroll', () => {
    nav?.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  burger?.addEventListener('click', () => {
    mobileN?.classList.add('open');
    overlay?.classList.add('show');
  });

  const close = () => {
    mobileN?.classList.remove('open');
    overlay?.classList.remove('show');
  };
  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', close);
  window.closeMobileNav = close;
}


/* ──────────────────────────────────────────────────────────
   FLOATING BUTTONS
   ────────────────────────────────────────────────────────── */
function bindFloatButtons() {
  const cta = document.getElementById('float-cta');
  const wa  = document.getElementById('float-wa');

  window.addEventListener('scroll', () => {
    const visible = window.scrollY > 500;
    cta?.classList.toggle('visible', visible);
    wa?.classList.toggle('visible',  visible);
  }, { passive: true });
}


/* ──────────────────────────────────────────────────────────
   SCROLL REVEAL (IntersectionObserver)
   ────────────────────────────────────────────────────────── */
function bindScrollReveal() {
  const selector = '.reveal:not(.active), .reveal-left:not(.active), .reveal-scale:not(.active)';
  const elements = document.querySelectorAll(selector);
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.10, rootMargin: '0px 0px -36px 0px' });

  elements.forEach(el => observer.observe(el));
}


/* ──────────────────────────────────────────────────────────
   HERO PARTICLES
   ────────────────────────────────────────────────────────── */
function spawnParticles() {
  const wrap = document.getElementById('particles');
  if (!wrap) return;

  for (let i = 0; i < 20; i++) {
    const dot  = document.createElement('div');
    const size = Math.random() * 3 + 1;
    dot.className = 'particle';
    dot.style.cssText = [
      `width:${size}px`, `height:${size}px`,
      `left:${Math.random() * 100}%`,
      `animation-duration:${10 + Math.random() * 18}s`,
      `animation-delay:${Math.random() * 12}s`,
    ].join(';');
    wrap.appendChild(dot);
  }
}


/* ──────────────────────────────────────────────────────────
   MODAL / BOTTOM SHEET CONTROLS
   ────────────────────────────────────────────────────────── */

function openModal() {
  const overlay = document.getElementById('prop-modal-overlay');
  const modal   = document.getElementById('prop-modal');
  if (overlay) overlay.classList.add('active');
  if (modal)   modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('prop-modal-overlay');
  const modal   = document.getElementById('prop-modal');
  if (overlay) overlay.classList.remove('active');
  if (modal)   modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Touch swipe to close bottom sheet (mobile)
let touchStartY = 0;
document.addEventListener('touchstart', (e) => {
  if (e.target.closest('#prop-modal')) {
    touchStartY = e.touches[0].clientY;
  }
}, { passive: true });

document.addEventListener('touchend', (e) => {
  const modal = document.getElementById('prop-modal');
  if (!modal || !modal.classList.contains('active')) return;
  const touchEndY = e.changedTouches[0].clientY;
  const deltaY = touchEndY - touchStartY;
  // Swipe down > 80px closes modal
  if (deltaY > 80) {
    closeModal();
  }
}, { passive: true });


/* ──────────────────────────────────────────────────────────
   FILTER ENGINE (Client-Side)
   ────────────────────────────────────────────────────────── */

const FilterState = {
  category : null,   // main_category value
  listing  : null,   // listing_type value
  sort     : '',     // price_asc | price_desc
  city     : '',     // city_en
  district : '',     // district_ar
  status   : '',     // finishing_status_ar
  detail   : '',     // property_detail_ar
  rooms    : '',     // rooms count
  q        : '',     // free-text search
  minPrice : '',
  maxPrice : '',
};

function _applyFilters() {
  if (!window._allProperties) return;

  let result = [...window._allProperties];

  // Category + Listing combined
  if (FilterState.category && FilterState.category !== 'all') {
    result = result.filter(p =>
      String(p.main_category || '').toLowerCase() === FilterState.category.toLowerCase()
    );
  }
  if (FilterState.listing) {
    result = result.filter(p =>
      String(p.listing_type || '').toLowerCase() === FilterState.listing.toLowerCase()
    );
  }

  // City
  if (FilterState.city) {
    result = result.filter(p =>
      String(p.city_en || '').toLowerCase() === FilterState.city.toLowerCase()
    );
  }

  // District
  if (FilterState.district) {
    result = result.filter(p =>
      String(p.district_ar || '') === FilterState.district
    );
  }

  // Finishing status
  if (FilterState.status) {
    result = result.filter(p =>
      String(p.finishing_status_ar || '') === FilterState.status
    );
  }

  // Property detail
  if (FilterState.detail) {
    result = result.filter(p =>
      String(p.property_detail_ar || '') === FilterState.detail
    );
  }

  // Rooms
  if (FilterState.rooms) {
    const targetRooms = parseInt(FilterState.rooms, 10);
    if (targetRooms === 5) {
      result = result.filter(p => (p.rooms || 0) >= 5);
    } else {
      result = result.filter(p => (p.rooms || 0) === targetRooms);
    }
  }

  // Free-text search (title, district, detail, description)
  if (FilterState.q) {
    const q = FilterState.q.toLowerCase();
    result = result.filter(p => [p.title_ar, p.district_ar, p.property_detail_ar, p.city_en, p.finishing_status_ar, p.description_ar, p.property_id]
      .some(v => String(v || '').toLowerCase().includes(q)));
  }

  // Price range
  const minP = Number(FilterState.minPrice), maxP = Number(FilterState.maxPrice);
  if (minP) result = result.filter(p => (Number(p.price) || 0) >= minP);
  if (maxP) result = result.filter(p => (Number(p.price) || 0) <= maxP);

  // Sort
  if (FilterState.sort === 'price_asc') {
    result.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (FilterState.sort === 'price_desc') {
    result.sort((a, b) => (b.price || 0) - (a.price || 0));
  }

  window._filteredProperties = result;

  // Re-render
  if (window.ElSahabaRender && window.ElSahabaRender.renderPropertiesPage) {
    window.ElSahabaRender.renderPropertiesPage(result);
  }

  // Update count
  const countEl = document.getElementById('result-count');
  if (countEl) countEl.textContent = `${result.length} وحدة متاحة`;
}

function _updateChipVisuals(activeKey) {
  document.querySelectorAll('.filter-chip').forEach(chip => {
    const isActive = chip.dataset.filter === activeKey;
    chip.classList.toggle('active', isActive);
  });
}

const ElSahabaFilters = {
  setCategory(category, listing) {
    if (category === 'all') {
      FilterState.category = null;
      FilterState.listing  = null;
      _updateChipVisuals('all');
    } else {
      FilterState.category = category;
      FilterState.listing  = listing;
      _updateChipVisuals(`${category}-${listing}`);
    }
    _applyFilters();
  },

  setSort(value) {
    FilterState.sort = value;
    _applyFilters();
  },

  setCity(value) {
    FilterState.city = value;
    _applyFilters();
  },

  setDistrict(value) {
    FilterState.district = value;
    _applyFilters();
  },

  setStatus(value) {
    FilterState.status = value;
    _applyFilters();
  },

  setDetail(value) {
    FilterState.detail = value;
    _applyFilters();
  },

  setRooms(value) {
    FilterState.rooms = value;
    _applyFilters();
  },

  setQuery(value) {
    FilterState.q = String(value || '').trim();
    _applyFilters();
  },

  setMinPrice(value) {
    FilterState.minPrice = String(value || '').replace(/[^\d]/g, '');
    _applyFilters();
  },

  setMaxPrice(value) {
    FilterState.maxPrice = String(value || '').replace(/[^\d]/g, '');
    _applyFilters();
  },

  resetAll() {
    FilterState.category = null;
    FilterState.listing  = null;
    FilterState.sort     = '';
    FilterState.city     = '';
    FilterState.district = '';
    FilterState.status   = '';
    FilterState.detail   = '';
    FilterState.rooms    = '';
    FilterState.q = ''; FilterState.minPrice = ''; FilterState.maxPrice = '';
    ['filter-search', 'filter-min-price', 'filter-max-price'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

    // Reset UI controls
    document.getElementById('filter-sort')?.value && (document.getElementById('filter-sort').value = '');
    document.getElementById('filter-city')?.value && (document.getElementById('filter-city').value = '');
    document.getElementById('filter-district')?.value && (document.getElementById('filter-district').value = '');
    document.getElementById('filter-status')?.value && (document.getElementById('filter-status').value = '');
    document.getElementById('filter-detail')?.value && (document.getElementById('filter-detail').value = '');
    document.getElementById('filter-rooms')?.value && (document.getElementById('filter-rooms').value = '');

    _updateChipVisuals('all');
    _applyFilters();
  }
};


/* ──────────────────────────────────────────────────────────
   EXPORT
   ────────────────────────────────────────────────────────── */
window.ElSahabaUI = {
  setLoaderProgress,
  setLoaderStatus,
  hideLoader,
  bindNav,
  bindFloatButtons,
  bindScrollReveal,
  spawnParticles,
  openModal,
  closeModal,
};

window.ElSahabaFilters = ElSahabaFilters;
