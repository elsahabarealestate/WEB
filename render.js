/**
 * ═══════════════════════════════════════════════════════════
 *  render.js — DOM Rendering Module
 *  El Sahaba Real Estate Platform
 *  -------------------------------------------------------
 *  Provides:
 *    • renderProperties(props)      → Homepage featured cards
 *    • renderPropertiesPage(props)  → Properties page grid + modal
 *    • renderTestimonials(testis)   → Testimonial carousel
 *    • renderVideoSection(settings) → YouTube iframe injection
 *    • openPropertyModal(prop)      → Modal / Bottom Sheet detail view
 * ═══════════════════════════════════════════════════════════
 */ 

'use strict';

/* ──────────────────────────────────────────────────────────
   STATIC BRAND ASSETS
   ────────────────────────────────────────────────────────── */
const LOGO_URL        = 'https://res.cloudinary.com/daicsoapy/image/upload/w_320,q_auto,f_auto/v1777700851/Picture5_i6btgv.gif';
const FALLBACK_IMG    = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80';
const CONTACT_SECTION = '#contact';
const PROPERTIES_URL  = 'properties.html';


/* ──────────────────────────────────────────────────────────
   PUBLIC — renderVideoSection (homepage)
   ────────────────────────────────────────────────────────── */
function renderVideoSection(settings) {
  const vidCode  = _getFieldSafe(settings, 'Featured_Video_ID');
  const vidTitle = _getFieldSafe(settings, 'Video_Title') || 'شاهد العقار عن قرب';

  if (!vidCode) return;

  const section    = document.getElementById('video-section');
  const container  = document.getElementById('video-embed-container');
  const titleEl    = document.getElementById('video-title');

  if (!section || !container) return;

  let iframe = vidCode
    .replace(/width="[^"]*"/,  'width="100%"')
    .replace(/height="[^"]*"/, 'height="100%"');

  container.innerHTML = iframe;
  section.style.display = 'block';
  if (titleEl) titleEl.textContent = vidTitle;
}


/* ──────────────────────────────────────────────────────────
   PUBLIC — renderProperties (homepage — featured cards)
   ────────────────────────────────────────────────────────── */
function renderProperties(props) {
  const grid = document.getElementById('props-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!Array.isArray(props) || props.length === 0) {
    _renderPropertiesEmpty(grid);
    return;
  }

  props.forEach((prop, index) => {
    const images    = _extractImages(prop);
    const price     = _formatPrice(prop.Price || prop.price || '');
    const status    = (prop.Property_Status || prop.property_status || '').trim();
    const badge     = _resolveBadge(status);
    const title     = _esc(prop.Title || prop.title || prop.title_ar || 'عقار مميز');
    const desc      = _esc(prop.Description || prop.description || prop.description_ar || '');
    const swiperCls = `prop-swiper-${index}`;
    const delay     = String((index % 3) + 1);

    const slidesHtml = images
      .map(url => `<div class="swiper-slide"><img src="${url}" alt="${title}" loading="lazy" /></div>`)
      .join('');

    const card = document.createElement('div');
    card.className        = 'prop-card reveal';
    card.dataset.delay    = delay;
    card.innerHTML = `
      <div class="card-swiper swiper ${swiperCls}">
        <div class="swiper-wrapper">${slidesHtml}</div>
        <div class="swiper-pagination"></div>
      </div>
      <div class="card-img-overlay"></div>
      ${badge ? `<div class="card-badge">${badge}</div>` : ''}
      <div class="card-body">
        <div class="card-title">${title}</div>
        <div class="card-desc">${desc}</div>
        <div class="card-footer">
          <div>
            <div class="card-price-label">السعر</div>
            <div class="card-price">${price}</div>
          </div>
          <button class="card-action"
            onclick="document.querySelector('${CONTACT_SECTION}').scrollIntoView({behavior:'smooth'})">
            استفسر الآن
          </button>
        </div>
      </div>`;

    grid.appendChild(card);
    requestAnimationFrame(() => _initCardSwiper(swiperCls, images.length));
  });

  if (window.ElSahabaUI && window.ElSahabaUI.bindScrollReveal) {
    window.ElSahabaUI.bindScrollReveal();
  }
}

function _renderPropertiesEmpty(grid) {
  grid.innerHTML = `
    <div class="props-empty">
      <p>لا توجد وحدات متاحة حالياً مميزة. تواصل معنا لمعرفة آخر العروض.</p>
    </div>`;
}

function _initCardSwiper(cls, imageCount) {
  if (typeof Swiper === 'undefined') return;
  new Swiper(`.${cls}`, {
    loop       : imageCount > 1,
    speed      : 700,
    effect     : 'fade',
    fadeEffect : { crossFade: true },
    autoplay   : imageCount > 1 ? { delay: 3600, disableOnInteraction: false } : false,
    pagination : { el: `.${cls} .swiper-pagination`, clickable: true },
  });
}


/* ──────────────────────────────────────────────────────────
   PUBLIC — renderPropertiesPage (properties.html grid)
   ────────────────────────────────────────────────────────── */

/**
 * renderPropertiesPage(props)
 * ---------------------------
 * Renders the FULL properties grid for the properties page.
 * Each card is clickable and opens the modal/bottom sheet.
 * Uses the new Google Sheets data structure (Arabic fields).
 */
function renderPropertiesPage(props) {
  const grid = document.getElementById('props-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const emptyEl = document.getElementById('props-empty');

  if (!Array.isArray(props) || props.length === 0) {
    grid.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }

  grid.style.display = '';
  if (emptyEl) emptyEl.style.display = 'none';

  props.forEach((prop, index) => {
    const images     = _extractImagesFromSheet(prop);
    const price      = _formatPrice(prop.price);
    const listingBadge = prop.listing_type === 'Rent' ? 'للإيجار' : 'للبيع';
    const title      = _esc(prop.title_ar || 'عقار مميز');
    const district   = _esc(prop.district_ar || '');
    const detail     = _esc(prop.property_detail_ar || '');
    const finishing  = _esc(prop.finishing_status_ar || '');
    const rooms      = prop.rooms || 0;
    const bathrooms  = prop.bathrooms || 0;
    const swiperCls  = `prop-page-swiper-${index}`;
    const delay      = String((index % 3) + 1);

    const slidesHtml = images
      .map(url => `<div class="swiper-slide"><img src="${url}" alt="${title}" loading="lazy" /></div>`)
      .join('');

    const card = document.createElement('div');
    card.className     = 'prop-card reveal';
    card.dataset.delay = delay;
    card.innerHTML = `
      <div class="card-swiper swiper ${swiperCls}">
        <div class="swiper-wrapper">${slidesHtml}</div>
        <div class="swiper-pagination"></div>
      </div>
      <div class="card-img-overlay"></div>
      <div class="card-badges">
        <span class="card-badge listing">${listingBadge}</span>
        ${detail ? `<span class="card-badge detail">${detail}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="card-title">${title}</div>
        <div class="card-meta">
          ${district ? `<span><i class="fas fa-location-dot"></i> ${district}</span>` : ''}
          ${finishing ? `<span><i class="fas fa-hammer"></i> ${finishing}</span>` : ''}
        </div>
        <div class="card-specs">
          ${rooms ? `<span><i class="fas fa-bed"></i> ${rooms} غرف</span>` : ''}
          ${bathrooms ? `<span><i class="fas fa-bath"></i> ${bathrooms} حمام</span>` : ''}
        </div>
        <div class="card-footer" style="margin-top:14px;">
          <div>
            <div class="card-price-label">السعر</div>
            <div class="card-price">${price}</div>
          </div>
          <button class="card-action" onclick="window.ElSahabaRender.openPropertyModal(${index})">
            التفاصيل <i class="fas fa-arrow-left" style="margin-right:6px;font-size:0.65rem;"></i>
          </button>
        </div>
      </div>`;

    // Make entire card clickable (opens modal)
    card.addEventListener('click', (e) => {
      // Don't trigger if clicking inside the swiper or action button
      if (e.target.closest('.swiper') || e.target.closest('.card-action')) return;
      openPropertyModal(index);
    });

    grid.appendChild(card);
    requestAnimationFrame(() => _initCardSwiper(swiperCls, images.length));
  });

  if (window.ElSahabaUI && window.ElSahabaUI.bindScrollReveal) {
    window.ElSahabaUI.bindScrollReveal();
  }
}


/* ──────────────────────────────────────────────────────────
   PUBLIC — openPropertyModal (modal / bottom sheet)
   ────────────────────────────────────────────────────────── */

/**
 * openPropertyModal(index)
 * ------------------------
 * Opens the premium modal (desktop) or bottom sheet (mobile)
 * with full property details: image gallery, specs, description.
 */
function openPropertyModal(index) {
  const prop = window._filteredProperties?.[index];
  if (!prop) return;

  const images       = _extractImagesFromSheet(prop);
  const title        = _esc(prop.title_ar || 'عقار مميز');
  const price        = _formatPrice(prop.price);
  const listingBadge = prop.listing_type === 'Rent' ? 'للإيجار' : 'للبيع';
  const district     = _esc(prop.district_ar || '');
  const city         = _esc(prop.city_en || '');
  const finishing    = _esc(prop.finishing_status_ar || '');
  const detail       = _esc(prop.property_detail_ar || '');
  const rooms        = prop.rooms || 0;
  const bathrooms    = prop.bathrooms || 0;
  const description  = _esc(prop.description_ar || '');
  const propertyId   = _esc(prop.property_id || '');

  const slidesHtml = images
    .map((url, i) => `<div class="swiper-slide"><img src="${url}" alt="${title} ${i+1}" /></div>`)
    .join('');

  const bodyHtml = `
    <!-- Image Swiper -->
    <div class="modal-swiper swiper modal-swiper-main">
      <div class="swiper-wrapper">${slidesHtml}</div>
      <div class="swiper-pagination"></div>
      <div class="swiper-button-next"></div>
      <div class="swiper-button-prev"></div>
    </div>

    <!-- Header -->
    <div class="modal-header">
      <div class="modal-badges">
        <span class="modal-badge listing">${listingBadge}</span>
        ${detail ? `<span class="modal-badge detail">${detail}</span>` : ''}
        ${finishing ? `<span class="modal-badge finishing">${finishing}</span>` : ''}
      </div>
      <h2 class="modal-title">${title}</h2>
      <div class="modal-location">
        <i class="fas fa-location-dot"></i>
        <span>${district}${city ? '، ' + _cityTranslate(city) : ''}</span>
      </div>
    </div>

    <!-- Price -->
    <div class="modal-price-block">
      <div class="modal-price-label">السعر الإجمالي</div>
      <div class="modal-price">${price}</div>
    </div>

    <!-- Specs Grid -->
    <div class="modal-specs-grid">
      <div class="modal-spec">
        <i class="fas fa-bed"></i>
        <div class="modal-spec-val">${rooms}</div>
        <div class="modal-spec-label">غرف النوم</div>
      </div>
      <div class="modal-spec">
        <i class="fas fa-bath"></i>
        <div class="modal-spec-val">${bathrooms}</div>
        <div class="modal-spec-label">الحمامات</div>
      </div>
      <div class="modal-spec">
        <i class="fas fa-building"></i>
        <div class="modal-spec-val">${detail || '-'}</div>
        <div class="modal-spec-label">نوع الوحدة</div>
      </div>
      <div class="modal-spec">
        <i class="fas fa-hammer"></i>
        <div class="modal-spec-val">${finishing || '-'}</div>
        <div class="modal-spec-label">التشطيب</div>
      </div>
    </div>

    <!-- Description -->
    ${description ? `
    <div class="modal-desc">
      <h4>وصف الوحدة</h4>
      <p>${description}</p>
    </div>
    ` : ''}

    <!-- CTA Buttons -->
    <div class="modal-actions">
      <a class="modal-cta-primary" href="https://wa.me/+201227164595?text=مرحباً، أنا مهتم بالوحدة: ${encodeURIComponent(title + ' (')}${encodeURIComponent(propertyId)}${encodeURIComponent(')')}" target="_blank" rel="noopener">
        <i class="fab fa-whatsapp"></i> استفسر عبر واتساب
      </a>
      <a class="modal-cta-secondary" href="tel:+201227164595">
        <i class="fas fa-phone"></i> اتصل بنا
      </a>
    </div>

    <!-- Property ID footer -->
    ${propertyId ? `<div class="modal-footer-id">معرف الوحدة: <span>${propertyId}</span></div>` : ''}
  `;

  const modalBody = document.getElementById('prop-modal-body');
  if (modalBody) modalBody.innerHTML = bodyHtml;

  // Show modal
  const overlay = document.getElementById('prop-modal-overlay');
  const modal   = document.getElementById('prop-modal');
  if (overlay) overlay.classList.add('active');
  if (modal)   modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Init modal Swiper
  requestAnimationFrame(() => {
    if (typeof Swiper !== 'undefined') {
      new Swiper('.modal-swiper-main', {
        loop      : images.length > 1,
        speed     : 600,
        spaceBetween: 0,
        pagination: { el: '.modal-swiper-main .swiper-pagination', clickable: true },
        navigation: {
          nextEl: '.modal-swiper-main .swiper-button-next',
          prevEl: '.modal-swiper-main .swiper-button-prev',
        },
      });
    }
  });
}

function _cityTranslate(city) {
  const map = { 'Giza': 'الجيزة', 'Cairo': 'القاهرة', 'New Cairo': 'القاهرة الجديدة' , 'North Cost': 'الساحل الشمالي', 'Ain Sokhna': 'العين السخنة', 'Alexandria': 'الإسكندرية', 'Marsa Matrouh': 'مرسى مطروح' };
  return map[city] || city;
}


/* ──────────────────────────────────────────────────────────
   PUBLIC — renderTestimonials (homepage)
   ────────────────────────────────────────────────────────── */
function renderTestimonials(testis) {
  const wrapper = document.getElementById('testi-wrapper');
  if (!wrapper) return;
  wrapper.innerHTML = '';

  const list = Array.isArray(testis) && testis.length ? testis : _fallbackTestimonials();

  // No testimonials yet: hide the whole section and its nav links.
  const section = document.getElementById('testimonials');
  const hasAny = list.length > 0;
  if (section) section.style.display = hasAny ? '' : 'none';
  document.querySelectorAll('a[href="#testimonials"]').forEach(a => {
    const li = a.closest('li');
    (li || a).style.display = hasAny ? '' : 'none';
  });
  if (!hasAny) return;

  list.forEach(t => {
    const name    = _esc(t.Client_Name  || t.client_name  || 'عميل كريم');
    const comment = _esc(t.Comment      || t.comment      || '');
    const imgSrc  = t.Review_Image      || t.review_image || '';

    const avatarHtml = imgSrc
      ? `<img class="testi-avatar" src="${imgSrc}" alt="${name}" loading="lazy" onerror="this.style.display='none'" />`
      : `<div class="testi-avatar" style="display:flex;align-items:center;justify-content:center;font-size:1.2rem;">👤</div>`;

    const slide = document.createElement('div');
    slide.className = 'swiper-slide testi-slide';
    slide.innerHTML = `
      <div class="testi-quote-icon">"</div>
      <p class="testi-text">${comment}</p>
      <div class="testi-profile">
        ${avatarHtml}
        <div>
          <div class="testi-name">${name}</div>
          <div class="testi-stars">★★★★★</div>
        </div>
      </div>`;

    wrapper.appendChild(slide);
  });

  _initTestiSwiper();
}

function _fallbackTestimonials() {
  return [];
}


function _initTestiSwiper() {
  if (typeof Swiper === 'undefined') return;

  const swiper = new Swiper('#testi-swiper', {
    slidesPerView : 1,
    spaceBetween  : 24,
    speed         : 900,
    loop          : true,
    autoplay      : { delay: 4500, disableOnInteraction: false },
    pagination    : { el: '.testi-pagination', clickable: true },
    breakpoints   : { 680: { slidesPerView: 2 }, 1100: { slidesPerView: 3 } },
  });

  document.getElementById('testi-prev')?.addEventListener('click', () => swiper.slidePrev());
  document.getElementById('testi-next')?.addEventListener('click', () => swiper.slideNext());
}


/* ──────────────────────────────────────────────────────────
   PRIVATE HELPERS
   ────────────────────────────────────────────────────────── */


/** Ask Cloudinary for a smaller, auto-format version of an image (cards). */
function _optimizeImg(url, width) {
  try {
    if (typeof url === 'string' && url.indexOf('res.cloudinary.com') !== -1 &&
        url.indexOf('/image/upload/') !== -1 && url.indexOf('/image/upload/w_') === -1) {
      return url.replace('/image/upload/', '/image/upload/w_' + (width || 640) + ',c_limit,q_auto,f_auto/');
    }
  } catch (e) { /* fall through */ }
  return url;
}

/** Extract Image1…Image10 from Supabase-style property object */
function _extractImages(prop) {
  const images = [];
  for (let n = 1; n <= 10; n++) {
    const url = prop[`Image${n}`] || prop[`image${n}`] || '';
    if (url && url !== 'NaN' && String(url).trim()) {
      images.push(_optimizeImg(String(url).trim()));
    }
  }
  return images.length ? images : [FALLBACK_IMG];
}

/** Extract image_1 … image_10 from Google Sheets-style property object */
function _extractImagesFromSheet(prop) {
  const images = [];
  for (let n = 1; n <= 10; n++) {
    const url = prop[`image_${n}`] || '';
    if (url && url !== 'NaN' && String(url).trim()) {
      images.push(_optimizeImg(String(url).trim()));
    }
  }
  return images.length ? images : [FALLBACK_IMG];
}

/** Format a numeric price into Arabic locale string with EGP suffix */
function _formatPrice(raw) {
  if (!raw && raw !== 0) return 'غير محدد';
  const num = Number(String(raw).replace(/,/g, ''));
  return isNaN(num) ? String(raw) : num.toLocaleString('ar-EG') + ' جنيه';
}

/** Map Property_Status to Arabic badge label */
function _resolveBadge(status) {
  switch (String(status).toLowerCase()) {
    case 'featured': return 'مميز';
    case 'active':   return 'متاح';
    default:         return '';
  }
}

/** Safe field lookup */
function _getFieldSafe(obj, key) {
  if (window.ElSahabaAPI && window.ElSahabaAPI._getField) {
    return window.ElSahabaAPI._getField(obj, key);
  }
  return (obj && obj[key]) ? String(obj[key]).trim() : '';
}

/** HTML entity escaping */
function _esc(str) {
  return String(str || '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}


/* ──────────────────────────────────────────────────────────
   EXPORT
   ────────────────────────────────────────────────────────── */
window.ElSahabaRender = {
  renderVideoSection,
  renderProperties,
  renderPropertiesPage,
  renderTestimonials,
  openPropertyModal,
};
