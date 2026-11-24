/**
 * ═══════════════════════════════════════════════════════════
 *  aerid-aqarak.js — "اعرض عقارك معنا" Page Logic
 *  El Sahaba Real Estate Platform
 *  -------------------------------------------------------
 *  Handles:
 *    1. Nav (reuses window.ElSahabaUI from ui.js)
 *    2. Listing-type toggle (ايجار / بيع)
 *    3. Image selection, validation, compression, preview
 *    4. Cloudinary direct upload with per-file progress
 *    5. Form validation
 *    6. Google Apps Script POST
 *    7. Anti-spam: honeypot + duplicate submit guard
 *    8. Price formatting
 *    9. Character counter for description
 *
 *  ⚙️  CONFIG — fill before deploy
 *  CLOUDINARY_CLOUD_NAME   : your Cloudinary cloud name
 *  CLOUDINARY_UPLOAD_PRESET: unsigned preset name
 *  GAS_URL                 : Google Apps Script web-app URL
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

/* ──────────────────────────────────────────────────────────
   ⚙️  CONFIGURATION  — update before deployment
   ────────────────────────────────────────────────────────── */
const CONFIG = {
  CLOUDINARY_CLOUD_NAME:    'dyuzahqol',         // e.g. 'daicsoapy'
  CLOUDINARY_UPLOAD_PRESET: 'elsahaba_properties',    // e.g. 'elsahaba_properties'
  GAS_URL:                  'https://script.google.com/macros/s/AKfycbwI4imkRe1oGn4LZelna2CJtJobf1m7rwc9RAe_4_wlaYBILNKhs2no13GFFnayNghm/exec',    // deployed /exec URL

  MAX_IMAGES:      10,
  MAX_FILE_MB:     10,
  MAX_FILE_BYTES:  10 * 1024 * 1024,

  // Image compression settings (canvas re-encode)
  COMPRESS_MAX_DIM: 2000,   // max width or height in px
  COMPRESS_QUALITY: 0.82,   // JPEG quality 0–1
};

/* ──────────────────────────────────────────────────────────
   STATE
   ────────────────────────────────────────────────────────── */
let _selectedFiles    = [];  // File objects the user picked
let _uploadedUrls     = [];  // Cloudinary URLs after upload  (same order)
let _submitting       = false;

/* ──────────────────────────────────────────────────────────
   BOOT
   ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Reuse shared nav bindings from ui.js (already loaded)
  if (window.ElSahabaUI) {
    window.ElSahabaUI.bindNav();
    window.ElSahabaUI.bindFloatButtons();
  }

  _bindListingToggle();
  _bindImageUpload();
  _bindPriceFormat();
  _bindCharCounter();
  _bindFormSubmit();
  _bindScrollReveal();
});

/* ──────────────────────────────────────────────────────────
   NAV SCROLL REVEAL (lightweight, no heavy observer)
   ────────────────────────────────────────────────────────── */
function _bindScrollReveal() {
  if (window.ElSahabaUI && window.ElSahabaUI.bindScrollReveal) {
    window.ElSahabaUI.bindScrollReveal();
  }
}

/* expose closeMobileNav for inline onclick handlers in HTML */
window.closeMobileNav = function () {
  document.getElementById('mobile-nav')?.classList.remove('open');
  document.getElementById('mobile-overlay')?.classList.remove('show');
};

/* ══════════════════════════════════════════════════════════
   1. LISTING TYPE TOGGLE  (ايجار / بيع)
   ══════════════════════════════════════════════════════════ */
function _bindListingToggle() {
  const btns  = document.querySelectorAll('.listing-btn');
  const input = document.getElementById('f-listing');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      input.value = btn.dataset.val;
      _clearErr('err-listing');
    });
  });
}

/* ══════════════════════════════════════════════════════════
   2. IMAGE UPLOAD SYSTEM
   ══════════════════════════════════════════════════════════ */
function _bindImageUpload() {
  const zone    = document.getElementById('upload-zone');
  const input   = document.getElementById('f-images');
  const preview = document.getElementById('img-previews');

  /* ── drag and drop ── */
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', ()  => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    _addFiles(Array.from(e.dataTransfer.files));
  });

  /* ── keyboard accessibility ── */
  zone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });

  input.addEventListener('change', () => {
    _addFiles(Array.from(input.files));
    input.value = '';  // reset so same file can be re-added after removal
  });

  /* ── remove preview item ── */
  preview.addEventListener('click', e => {
    const btn = e.target.closest('.img-preview-remove');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx, 10);
    _selectedFiles.splice(idx, 1);
    _renderPreviews();
    _clearErr('err-images');
  });
}

function _addFiles(incoming) {
  const err = document.getElementById('err-images');
  _clearErr('err-images');

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const valid   = [];

  for (const f of incoming) {
    if (!allowed.includes(f.type)) {
      _showErr('err-images', `الملف "${f.name}" غير مدعوم. يُقبل فقط JPG، PNG، WEBP.`);
      continue;
    }
    if (f.size > CONFIG.MAX_FILE_BYTES) {
      _showErr('err-images', `الملف "${f.name}" أكبر من ${CONFIG.MAX_FILE_MB} ميجابايت.`);
      continue;
    }
    valid.push(f);
  }

  // Merge, deduplicate by name+size, cap at MAX
  const merged = [..._selectedFiles, ...valid];
  const seen   = new Set();
  _selectedFiles = merged.filter(f => {
    const key = f.name + f.size;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (_selectedFiles.length > CONFIG.MAX_IMAGES) {
    _showErr('err-images', `لا يمكن رفع أكثر من ${CONFIG.MAX_IMAGES} صور.`);
    _selectedFiles = _selectedFiles.slice(0, CONFIG.MAX_IMAGES);
  }

  _renderPreviews();
}

function _renderPreviews() {
  const preview = document.getElementById('img-previews');
  preview.innerHTML = '';

  _selectedFiles.forEach((f, i) => {
    const url  = URL.createObjectURL(f);
    const item = document.createElement('div');
    item.className  = 'img-preview-item';
    item.setAttribute('role', 'listitem');
    item.innerHTML = `
      <img src="${url}" alt="صورة ${i + 1}" loading="lazy" />
      <button type="button" class="img-preview-remove" data-idx="${i}" aria-label="حذف الصورة ${i + 1}">✕</button>
      <div class="img-preview-num">صورة ${i + 1}</div>
    `;
    preview.appendChild(item);
  });
}

/* ──────────────────────────────────────────────────────────
   IMAGE COMPRESSION  (canvas re-encode)
   ────────────────────────────────────────────────────────── */
async function _compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Scale down if needed
      if (width > CONFIG.COMPRESS_MAX_DIM || height > CONFIG.COMPRESS_MAX_DIM) {
        const ratio = Math.min(CONFIG.COMPRESS_MAX_DIM / width, CONFIG.COMPRESS_MAX_DIM / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => resolve(blob || file),
        'image/jpeg',
        CONFIG.COMPRESS_QUALITY
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/* ──────────────────────────────────────────────────────────
   CLOUDINARY UPLOAD
   ────────────────────────────────────────────────────────── */
async function _uploadAllImages(onProgress) {
  const urls = [];
  const total = _selectedFiles.length;

  for (let i = 0; i < total; i++) {
    const file = _selectedFiles[i];
    const pct  = Math.round(((i) / total) * 100);
    onProgress(pct, `جارٍ رفع الصورة ${i + 1} من ${total}…`);

    const compressed = await _compressImage(file);
    const url        = await _uploadSingleToCloudinary(compressed, i);
    urls.push(url);

    const pctDone = Math.round(((i + 1) / total) * 100);
    onProgress(pctDone, `تم رفع ${i + 1} من ${total}…`);
  }

  return urls;
}

function _uploadSingleToCloudinary(blob, idx) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file',         blob);
    fd.append('upload_preset', CONFIG.CLOUDINARY_UPLOAD_PRESET);
    fd.append('folder',        'elsahaba/properties');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD_NAME}/image/upload`);

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.secure_url);
        } catch {
          reject(new Error('استجابة Cloudinary غير صالحة'));
        }
      } else {
        reject(new Error(`فشل رفع الصورة ${idx + 1} — كود ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error(`خطأ شبكة عند رفع الصورة ${idx + 1}`));
    xhr.send(fd);
  });
}

/* ══════════════════════════════════════════════════════════
   3. PRICE FORMATTER
   ══════════════════════════════════════════════════════════ */
function _bindPriceFormat() {
  const inp = document.getElementById('f-price');
  inp.addEventListener('input', () => {
    const raw = inp.value.replace(/[^\d]/g, '');
    inp.value = raw ? Number(raw).toLocaleString('en-EG') : '';
  });
}

/* ══════════════════════════════════════════════════════════
   4. CHAR COUNTER
   ══════════════════════════════════════════════════════════ */
function _bindCharCounter() {
  const ta    = document.getElementById('f-desc');
  const count = document.getElementById('desc-count');
  ta.addEventListener('input', () => {
    count.textContent = `${ta.value.length.toLocaleString('ar-EG')} / ٢٠٠٠`;
  });
}

/* ══════════════════════════════════════════════════════════
   5. FORM VALIDATION
   ══════════════════════════════════════════════════════════ */
function _validateForm() {
  let ok = true;

  // Helper
  const mustFill = (fieldId, errId, msg) => {
    const el = document.getElementById(fieldId);
    const v  = el ? el.value.trim() : '';
    if (!v) { _showErr(errId, msg); _markError(fieldId); ok = false; }
    else    { _clearErr(errId);     _clearError(fieldId); }
  };

  const mustPhone = (fieldId, errId) => {
    const el = document.getElementById(fieldId);
    const v  = el ? el.value.trim() : '';
    if (!v) { _showErr(errId, 'رقم الهاتف مطلوب'); _markError(fieldId); ok = false; }
    else if (!/^[0-9+\s\-]{7,15}$/.test(v)) {
      _showErr(errId, 'رقم هاتف غير صالح');
      _markError(fieldId);
      ok = false;
    } else { _clearErr(errId); _clearError(fieldId); }
  };

  mustFill('f-name',     'err-name',     'الاسم مطلوب');
  mustPhone('f-phone',   'err-phone');
  mustFill('f-type',     'err-type',     'اختر نوع الوحدة');
  mustFill('f-city',     'err-city',     'اختر المدينة');
  mustFill('f-area',     'err-area',     'اختر المنطقة');
  mustFill('f-finish',   'err-finish',   'اختر حالة التشطيب');
  mustFill('f-rooms',    'err-rooms',    'اختر عدد الغرف');
  mustFill('f-baths',    'err-baths',    'اختر عدد الحمامات');
  mustFill('f-desc',     'err-desc',     'وصف الوحدة مطلوب');

  // Listing type (hidden input)
  const listing = document.getElementById('f-listing').value;
  if (!listing) {
    _showErr('err-listing', 'اختر ايجار أو بيع');
    ok = false;
  } else {
    _clearErr('err-listing');
  }

  // Price
  const priceRaw = document.getElementById('f-price').value.replace(/[^\d]/g, '');
  if (!priceRaw) {
    _showErr('err-price', 'السعر مطلوب');
    _markError('f-price');
    ok = false;
  } else {
    _clearErr('err-price');
    _clearError('f-price');
  }

  // Location URL (optional format check)
  const loc = document.getElementById('f-location').value.trim();
  if (loc && !/^https?:\/\/.+/.test(loc)) {
    _showErr('err-location', 'يرجى إدخال رابط صحيح يبدأ بـ https://');
    _markError('f-location');
    ok = false;
  }

  return ok;
}

/* ══════════════════════════════════════════════════════════
   6. FORM SUBMIT
   ══════════════════════════════════════════════════════════ */
function _bindFormSubmit() {
  const form = document.getElementById('list-property-form');
  form.addEventListener('submit', _handleSubmit);
}

async function _handleSubmit(e) {
  e.preventDefault();

  // ── Anti-spam: honeypot check ──
  const hp = document.getElementById('hp-website');
  if (hp && hp.value.trim()) {
    // Bot filled the hidden field — silently reject
    console.warn('[ElSahaba] Honeypot triggered.');
    return;
  }

  // ── Duplicate submit guard ──
  if (_submitting) return;

  // ── Validate ──
  if (!_validateForm()) {
    // Scroll to first error
    const firstErr = document.querySelector('.form-control.error, .field-err:not(:empty)');
    firstErr?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  _submitting = true;
  _setSubmitLoading(true);

  try {
    /* ── Step 1: Upload images ── */
    let imageUrls = [];

    if (_selectedFiles.length > 0) {
      _showUploadProgress(0, 'جارٍ رفع الصور…');

      imageUrls = await _uploadAllImages((pct, label) => {
        _showUploadProgress(pct, label);
      });

      _showUploadProgress(100, 'تم رفع الصور!');
    }

    /* ── Step 2: Build payload ── */
    const price = document.getElementById('f-price').value.replace(/[^\d]/g, '');

    const payload = {
      name        : _sanitize(document.getElementById('f-name').value),
      phone       : _sanitize(document.getElementById('f-phone').value),
      whatsapp    : _sanitize(document.getElementById('f-whatsapp').value) ||
                    _sanitize(document.getElementById('f-phone').value),
      unit_type   : document.getElementById('f-type').value,
      listing_type: document.getElementById('f-listing').value,
      price       : price,
      city        : document.getElementById('f-city').value,
      area        : document.getElementById('f-area').value,
      finishing   : document.getElementById('f-finish').value,
      rooms       : document.getElementById('f-rooms').value,
      bathrooms   : document.getElementById('f-baths').value,
      description : _sanitize(document.getElementById('f-desc').value),
      location_url: _sanitize(document.getElementById('f-location').value),
      // img1 … img10
      img1 : imageUrls[0]  || '',
      img2 : imageUrls[1]  || '',
      img3 : imageUrls[2]  || '',
      img4 : imageUrls[3]  || '',
      img5 : imageUrls[4]  || '',
      img6 : imageUrls[5]  || '',
      img7 : imageUrls[6]  || '',
      img8 : imageUrls[7]  || '',
      img9 : imageUrls[8]  || '',
      img10: imageUrls[9]  || '',
    };

    /* ── Step 3: POST to Google Apps Script ── */
    const response = await fetch(CONFIG.GAS_URL, {
      method : 'POST',
      mode   : 'no-cors',  // GAS CORS is opaque; no-cors is standard
      headers: { 'Content-Type': 'text/plain' },
      body   : JSON.stringify(payload),
    });

    /* no-cors mode always returns opaque response — treat as success */
    _onSuccess();

  } catch (err) {
    console.error('[ElSahaba] Submit error:', err);
    _onError(err.message || 'حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى.');
    _submitting = false;
    _setSubmitLoading(false);
  }
}

/* ──────────────────────────────────────────────────────────
   SUCCESS / ERROR FEEDBACK
   ────────────────────────────────────────────────────────── */
function _onSuccess() {
  const card    = document.getElementById('form-card');
  const success = document.getElementById('success-panel');

  card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  card.style.opacity    = '0';
  card.style.transform  = 'translateY(20px)';

  setTimeout(() => {
    card.style.display    = 'none';
    success.hidden        = false;
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 500);
}

function _onError(msg) {
  // Show generic error at top of form
  const form  = document.getElementById('list-property-form');
  let errBan  = document.getElementById('global-error-banner');
  if (!errBan) {
    errBan = document.createElement('div');
    errBan.id        = 'global-error-banner';
    errBan.className = 'global-error-banner';
    form.prepend(errBan);
  }
  errBan.textContent = `⚠️  ${msg}`;
  errBan.style.cssText = `
    background: rgba(200, 50, 50, 0.15);
    border: 1px solid rgba(200, 50, 50, 0.4);
    border-radius: 8px;
    padding: 14px 18px;
    font-size: 0.88rem;
    color: #ff9a9a;
    margin-bottom: 24px;
  `;
  errBan.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ──────────────────────────────────────────────────────────
   UI HELPERS
   ────────────────────────────────────────────────────────── */
function _setSubmitLoading(loading) {
  const btn  = document.getElementById('btn-submit');
  const text = btn.querySelector('.btn-submit-text');
  const spin = btn.querySelector('.btn-submit-loading');

  btn.disabled  = loading;
  text.hidden   = loading;
  spin.hidden   = !loading;
}

function _showUploadProgress(pct, label) {
  const wrap  = document.getElementById('upload-progress-wrap');
  const fill  = document.getElementById('upload-progress-fill');
  const lbl   = document.getElementById('upload-progress-label');

  wrap.hidden       = false;
  fill.style.width  = `${pct}%`;
  lbl.textContent   = label;
}

function _showErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function _clearErr(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = '';
}

function _markError(fieldId) {
  const el = document.getElementById(fieldId);
  el?.classList.add('error');
}

function _clearError(fieldId) {
  const el = document.getElementById(fieldId);
  el?.classList.remove('error');
}

/* Basic input sanitiser — strips HTML tags & trims */
function _sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .trim();
}
