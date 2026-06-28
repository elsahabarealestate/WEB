/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  taxonomy.js — Dynamic Taxonomy System                                  ║
 * ║  El Sahaba Real Estate Platform                                         ║
 * ║  ──────────────────────────────────────────────────────────────────    ║
 * ║  PURPOSE                                                                ║
 * ║    Fetches the taxonomy (dropdown options, filter chips) from the       ║
 * ║    Google Apps Script API and populates:                                ║
 * ║      1. The <select> dropdowns in aerid-aqarak.html (submission form)   ║
 * ║      2. The filter chips and <select> dropdowns in properties.html      ║
 * ║                                                                         ║
 * ║  WHAT THIS FILE DOES NOT TOUCH                                          ║
 * ║    - api.js (existing property data API — untouched)                   ║
 * ║    - render.js (property card rendering — untouched)                   ║
 * ║    - ui.js / ElSahabaFilters (filter engine — untouched)               ║
 * ║    - app.js (homepage boot — untouched)                                ║
 * ║    - Any property data, rendering, or existing backend logic            ║
 * ║                                                                         ║
 * ║  HOW TO USE                                                             ║
 * ║    1. Set TAXONOMY_API_URL to your GAS /exec URL (see below).          ║
 * ║    2. Add this script to aerid-aqarak.html and properties.html:         ║
 * ║         <script src="taxonomy.js" defer></script>                       ║
 * ║       Place it BEFORE ui.js in properties.html so filter chips are      ║
 * ║       injected before ElSahabaFilters is wired.                         ║
 * ║    3. Replace hardcoded <option> lists and filter chip HTML with the    ║
 * ║       placeholder containers described in the INTEGRATION GUIDE below.  ║
 * ║                                                                         ║
 * ║  INTEGRATION GUIDE — aerid-aqarak.html                                 ║
 * ║  ──────────────────────────────────────────────────────────────────    ║
 * ║  Replace the static <option> children in the following <select>         ║
 * ║  elements with a single loading option and add data-taxonomy attributes: ║
 * ║                                                                         ║
 * ║    Unit type select:                                                    ║
 * ║      <select id="f-type" name="unit_type" data-taxonomy="unit_types"   ║
 * ║              data-value-field="label_ar" data-label-field="label_ar"   ║
 * ║              data-placeholder="اختر نوع الوحدة" class="form-control"   ║
 * ║              required>                                                  ║
 * ║        <option value="" disabled selected>جارٍ التحميل…</option>       ║
 * ║      </select>                                                          ║
 * ║                                                                         ║
 * ║    City select:                                                         ║
 * ║      <select id="f-city" name="city" data-taxonomy="cities"            ║
 * ║              data-value-field="label_ar" data-label-field="label_ar"   ║
 * ║              data-placeholder="اختر المدينة" class="form-control"      ║
 * ║              required>                                                  ║
 * ║        <option value="" disabled selected>جارٍ التحميل…</option>       ║
 * ║      </select>                                                          ║
 * ║                                                                         ║
 * ║    Area/District select:                                                ║
 * ║      <select id="f-area" name="area" data-taxonomy="districts"         ║
 * ║              data-value-field="label_ar" data-label-field="label_ar"   ║
 * ║              data-placeholder="اختر المنطقة" class="form-control"      ║
 * ║              data-filter-by="city_key" data-filter-source="f-city"     ║
 * ║              data-filter-source-field="key_en" required>               ║
 * ║        <option value="" disabled selected>اختر المدينة أولاً</option>  ║
 * ║      </select>                                                          ║
 * ║                                                                         ║
 * ║    Finishing select:                                                    ║
 * ║      <select id="f-finish" name="finishing" data-taxonomy="finishing"  ║
 * ║              data-value-field="label_ar" data-label-field="label_ar"   ║
 * ║              data-placeholder="اختر حالة التشطيب" class="form-control" ║
 * ║              required>                                                  ║
 * ║        <option value="" disabled selected>جارٍ التحميل…</option>       ║
 * ║      </select>                                                          ║
 * ║                                                                         ║
 * ║    Rooms select:                                                        ║
 * ║      <select id="f-rooms" name="rooms" data-taxonomy="rooms"           ║
 * ║              data-value-field="key_en" data-label-field="label_ar"     ║
 * ║              data-placeholder="عدد الغرف" class="form-control"         ║
 * ║              required>                                                  ║
 * ║        <option value="" disabled selected>جارٍ التحميل…</option>       ║
 * ║      </select>                                                          ║
 * ║                                                                         ║
 * ║    Bathrooms select:                                                    ║
 * ║      <select id="f-baths" name="bathrooms" data-taxonomy="bathrooms"   ║
 * ║              data-value-field="key_en" data-label-field="label_ar"     ║
 * ║              data-placeholder="عدد الحمامات" class="form-control"      ║
 * ║              required>                                                  ║
 * ║        <option value="" disabled selected>جارٍ التحميل…</option>       ║
 * ║      </select>                                                          ║
 * ║                                                                         ║
 * ║  INTEGRATION GUIDE — properties.html                                    ║
 * ║  ──────────────────────────────────────────────────────────────────    ║
 * ║  Replace the hardcoded chip buttons with an empty container:            ║
 * ║    <div class="filter-chips" id="filter-chips"></div>                   ║
 * ║                                                                         ║
 * ║  Replace hardcoded <option> children in filter selects:                 ║
 * ║    City:      <select id="filter-city"     data-taxonomy-filter="cities">     ║
 * ║    District:  <select id="filter-district" data-taxonomy-filter="districts">  ║
 * ║    Status:    <select id="filter-status"   data-taxonomy-filter="finishing">  ║
 * ║    Detail:    <select id="filter-detail"   data-taxonomy-filter="unit_types"> ║
 * ║    Rooms:     <select id="filter-rooms"    data-taxonomy-filter="rooms">      ║
 * ║  (Keep the onchange handlers exactly as they are — only the <option>    ║
 * ║   children are replaced. The filter engine is untouched.)               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────────────────
   ⚙️  CONFIGURATION  — SET YOUR URL HERE
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Paste your Google Apps Script /exec URL here after deploying ElSahaba_Taxonomy_GAS.js.
 * Example: 'https://script.google.com/macros/s/AKfycb.../exec'
 */
const TAXONOMY_API_URL = 'https://script.google.com/macros/s/AKfycbxXyYmjob-IsTeZSq-rMWHn8gVlCVx9kzJKAuhVfnRh95ZZnEFMY5-k_jkgBWFf9Jl3-A/exec';

/**
 * How long (in milliseconds) to cache the taxonomy in the browser's
 * sessionStorage so it is not re-fetched on every page navigation
 * within the same browser session.
 * Default: 10 minutes (600_000 ms).
 * Set to 0 to always fetch fresh data (useful in development).
 */
const BROWSER_CACHE_TTL_MS = 600_000;

const BROWSER_CACHE_KEY     = 'elsahaba_taxonomy_cache';
const BROWSER_CACHE_TS_KEY  = 'elsahaba_taxonomy_cache_ts';


/* ─────────────────────────────────────────────────────────────────────────────
   INTERNAL STATE
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * _taxonomy
 * ─────────
 * After a successful fetch, this object holds the complete taxonomy.
 * Other scripts can read it via: window.ElSahabaTaxonomy.get()
 *
 * Shape:
 *   {
 *     categories:     [{ key_en, label_ar, label_en_display, sort_order }],
 *     listing_types:  [{ key_en, label_ar, ... }],
 *     unit_types:     [{ key_en, label_ar, category_key, sort_order }],
 *     cities:         [{ key_en, label_ar, sort_order }],
 *     districts:      [{ key_en, label_ar, city_key, sort_order }],
 *     finishing:      [{ key_en, label_ar, sort_order }],
 *     rooms:          [{ key_en, label_ar, value_numeric, sort_order }],
 *     bathrooms:      [{ key_en, label_ar, value_numeric, sort_order }],
 *     category_chips: [{ chip_key, label_ar, category_key, listing_key, sort_order }],
 *   }
 */
let _taxonomy = null;


/* ─────────────────────────────────────────────────────────────────────────────
   BOOT
   ───────────────────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', _taxonomyBoot);

async function _taxonomyBoot() {
  // Guard: if API URL is still the placeholder, warn and bail gracefully.
  if (!TAXONOMY_API_URL || TAXONOMY_API_URL.includes('PASTE_YOUR_GAS_EXEC_URL_HERE')) {
    console.warn('[ElSahaba Taxonomy] TAXONOMY_API_URL is not set. Dropdowns will remain static.');
    return;
  }

  try {
    _taxonomy = await _fetchTaxonomy();
  } catch (err) {
    console.error('[ElSahaba Taxonomy] Failed to load taxonomy:', err);
    // Dropdowns already have static fallback options in HTML — safe to continue.
    return;
  }

  // Detect which page we're on and run the appropriate population logic.
  const page = _detectPage();

  if (page === 'form') {
    _populateFormDropdowns();
  } else if (page === 'properties') {
    _populateFilterChips();
    _populateFilterDropdowns();
  }
  // If neither page is detected, taxonomy is still stored and accessible
  // via window.ElSahabaTaxonomy.get() for any other use.
}


/* ─────────────────────────────────────────────────────────────────────────────
   PAGE DETECTION
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * _detectPage()
 * ─────────────
 * Returns 'form' if we're on the submission page,
 * 'properties' if on the properties listing page,
 * or null if neither.
 *
 * Detection is based on the presence of key DOM elements,
 * not the URL — so it works regardless of filename changes.
 */
function _detectPage() {
  if (document.getElementById('list-property-form')) return 'form';
  if (document.getElementById('filter-chips'))        return 'properties';
  return null;
}


/* ─────────────────────────────────────────────────────────────────────────────
   FETCH WITH BROWSER CACHE
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * _fetchTaxonomy()
 * ────────────────
 * Fetches taxonomy from the GAS API.
 * Caches the result in sessionStorage for BROWSER_CACHE_TTL_MS.
 * Returns the parsed taxonomy object.
 */
async function _fetchTaxonomy() {
  // ── Try sessionStorage cache first ──
  if (BROWSER_CACHE_TTL_MS > 0) {
    try {
      const cachedTs   = sessionStorage.getItem(BROWSER_CACHE_TS_KEY);
      const cachedData = sessionStorage.getItem(BROWSER_CACHE_KEY);
      const now        = Date.now();

      if (cachedTs && cachedData && (now - parseInt(cachedTs, 10)) < BROWSER_CACHE_TTL_MS) {
        console.log('[ElSahaba Taxonomy] Loaded from session cache.');
        return JSON.parse(cachedData);
      }
    } catch (_) {
      // sessionStorage unavailable (e.g. private browsing with restrictions) — skip cache
    }
  }

  // ── Fetch from GAS ──
  const response = await fetch(TAXONOMY_API_URL, {
    method : 'GET',
    mode   : 'cors',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from taxonomy API`);
  }

  const json = await response.json();

  if (!json.ok) {
    throw new Error(json.error || 'Taxonomy API returned ok:false');
  }

  const taxonomy = json.taxonomy;

  // ── Store in sessionStorage ──
  if (BROWSER_CACHE_TTL_MS > 0) {
    try {
      sessionStorage.setItem(BROWSER_CACHE_KEY,    JSON.stringify(taxonomy));
      sessionStorage.setItem(BROWSER_CACHE_TS_KEY, String(Date.now()));
    } catch (_) {
      // Quota exceeded or unavailable — safe to ignore
    }
  }

  console.log('[ElSahaba Taxonomy] Fetched from API successfully.');
  return taxonomy;
}


/* ─────────────────────────────────────────────────────────────────────────────
   FORM POPULATION  (aerid-aqarak.html)
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * _populateFormDropdowns()
 * ────────────────────────
 * Finds all <select> elements with data-taxonomy="<sheet_name>" and
 * fills them with options from the taxonomy.
 *
 * Supported data attributes on the <select>:
 *   data-taxonomy="unit_types"    → which taxonomy list to use
 *   data-value-field="label_ar"   → which field becomes <option value="">
 *   data-label-field="label_ar"   → which field becomes <option> text content
 *   data-placeholder="..."        → text of the first disabled/selected option
 *   data-filter-by="city_key"     → (optional) field on taxonomy items to filter by
 *   data-filter-source="f-city"   → (optional) id of the <select> whose value drives filtering
 *   data-filter-source-field="key_en" → (optional) field on the source taxonomy item
 *                                       whose value to match against data-filter-by
 */
function _populateFormDropdowns() {
  const selects = document.querySelectorAll('select[data-taxonomy]');
  selects.forEach(select => {
    const sheetName  = select.dataset.taxonomy;
    const items      = _taxonomy[sheetName];

    if (!items || !items.length) {
      console.warn(`[ElSahaba Taxonomy] No data for sheet: ${sheetName}`);
      return;
    }

    const valueField  = select.dataset.valueField  || 'key_en';
    const labelField  = select.dataset.labelField  || 'label_ar';
    const placeholder = select.dataset.placeholder || 'اختر…';
    const filterBy    = select.dataset.filterBy    || null;  // e.g. 'city_key'
    const filterSrc   = select.dataset.filterSource || null; // e.g. 'f-city'

    // Initial population (without filtering)
    _fillSelect(select, items, valueField, labelField, placeholder, filterBy, null);

    // If this select depends on another (cascading), wire the change event
    if (filterBy && filterSrc) {
      const sourceSelect = document.getElementById(filterSrc);
      if (sourceSelect) {
        sourceSelect.addEventListener('change', () => {
          // Find the chosen taxonomy item from the source select
          const sourceSheetName = sourceSelect.dataset.taxonomy;
          const sourceItems     = _taxonomy[sourceSheetName] || [];
          const sourceValField  = sourceSelect.dataset.valueField || 'key_en';
          const chosenItem      = sourceItems.find(
            item => String(item[sourceValField]) === sourceSelect.value
          );

          // Get the filter value from the source item
          // e.g. if data-filter-source-field="key_en", use chosenItem.key_en
          const srcField   = select.dataset.filterSourceField || sourceValField;
          const filterVal  = chosenItem ? String(chosenItem[srcField] || '') : null;

          _fillSelect(select, items, valueField, labelField, placeholder, filterBy, filterVal);
        });
      }
    }
  });
}


/**
 * _fillSelect(select, items, valueField, labelField, placeholder, filterBy, filterValue)
 * ───────────────────────────────────────────────────────────────────────────────────────
 * Clears and repopulates a <select> element.
 * If filterBy and filterValue are set, only items where item[filterBy] === filterValue
 * are included.
 */
function _fillSelect(select, items, valueField, labelField, placeholder, filterBy, filterValue) {
  // Clear existing options
  select.innerHTML = '';

  // Placeholder option
  const placeholderOpt   = document.createElement('option');
  placeholderOpt.value   = '';
  placeholderOpt.disabled = true;
  placeholderOpt.selected = true;

  if (filterBy && !filterValue) {
    // Cascading field — waiting for parent selection
    placeholderOpt.textContent = _getWaitingPlaceholder(select);
  } else {
    placeholderOpt.textContent = placeholder;
  }
  select.appendChild(placeholderOpt);

  // Filter items
  let filteredItems = items;
  if (filterBy && filterValue) {
    filteredItems = items.filter(item =>
      String(item[filterBy] || '') === String(filterValue)
    );
  }

  // Build options
  filteredItems.forEach(item => {
    const opt       = document.createElement('option');
    opt.value       = String(item[valueField] !== undefined ? item[valueField] : '');
    opt.textContent = String(item[labelField] !== undefined ? item[labelField] : opt.value);
    select.appendChild(opt);
  });
}


/**
 * _getWaitingPlaceholder(select)
 * ──────────────────────────────
 * Returns a sensible "waiting for parent" message based on the select's role.
 */
function _getWaitingPlaceholder(select) {
  const id = select.id || '';
  if (id.includes('area') || id.includes('district'))  return 'اختر المدينة أولاً';
  if (id.includes('unit') || id.includes('type'))      return 'اختر الفئة أولاً';
  return 'اختر من القائمة أعلاه أولاً';
}


/* ─────────────────────────────────────────────────────────────────────────────
   FILTER CHIPS POPULATION  (properties.html)
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * _populateFilterChips()
 * ──────────────────────
 * Clears the #filter-chips container and rebuilds it from category_chips
 * taxonomy data. Each chip calls the existing window.ElSahabaFilters.setCategory()
 * exactly as the hardcoded version did — the filter engine is untouched.
 */
function _populateFilterChips() {
  const container = document.getElementById('filter-chips');
  if (!container) return;

  const chips = _taxonomy.category_chips;
  if (!chips || !chips.length) {
    console.warn('[ElSahaba Taxonomy] No category_chips data found.');
    return;
  }

  container.innerHTML = '';

  chips.forEach((chip, idx) => {
    const btn = document.createElement('button');
    btn.className        = 'filter-chip' + (chip.chip_key === 'all' ? ' active' : '');
    btn.dataset.filter   = chip.chip_key;
    btn.textContent      = chip.label_ar;
    btn.type             = 'button';

    // Wire the click to the existing filter engine (ElSahabaFilters — untouched)
    btn.addEventListener('click', () => {
      if (!window.ElSahabaFilters) return;

      if (chip.chip_key === 'all') {
        window.ElSahabaFilters.setCategory('all');
      } else {
        window.ElSahabaFilters.setCategory(chip.category_key, chip.listing_key);
      }
    });

    container.appendChild(btn);
  });

  console.log(`[ElSahaba Taxonomy] Injected ${chips.length} filter chips.`);
}


/* ─────────────────────────────────────────────────────────────────────────────
   FILTER DROPDOWNS POPULATION  (properties.html)
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * _populateFilterDropdowns()
 * ──────────────────────────
 * Finds all filter <select> elements with data-taxonomy-filter="<sheet_name>"
 * and fills them with options from the taxonomy.
 * The existing onchange handlers (e.g. ElSahabaFilters.setCity(this.value))
 * are preserved — only the <option> children are replaced.
 *
 * Expected HTML attribute pattern on the filter selects:
 *   <select id="filter-city" data-taxonomy-filter="cities"
 *           data-filter-value-field="key_en"
 *           data-filter-label-field="label_ar"
 *           onchange="window.ElSahabaFilters.setCity(this.value)">
 *     <option value="">كل المدن</option>
 *   </select>
 *
 * data-filter-value-field defaults to "key_en"
 * data-filter-label-field defaults to "label_ar"
 */
function _populateFilterDropdowns() {
  /**
   * Config for each filter dropdown.
   * selectId        → DOM id of the <select>
   * sheet           → taxonomy sheet name
   * valueField      → field to use as option value (the value the filter engine compares)
   * labelField      → field to show as option text
   * allLabel        → label for the "all/reset" first option
   */
  const filterConfig = [
    {
      selectId  : 'filter-city',
      sheet     : 'cities',
      valueField: 'key_en',      // filter engine uses city_en internally
      labelField: 'label_ar',
      allLabel  : 'كل المدن',
    },
    {
      selectId  : 'filter-district',
      sheet     : 'districts',
      valueField: 'label_ar',    // district filter matches on label_ar (arabic string)
      labelField: 'label_ar',
      allLabel  : 'كل المناطق',
    },
    {
      selectId  : 'filter-status',
      sheet     : 'finishing',
      valueField: 'label_ar',    // finishing filter matches on label_ar
      labelField: 'label_ar',
      allLabel  : 'الكل',
    },
    {
      selectId  : 'filter-detail',
      sheet     : 'unit_types',
      valueField: 'label_ar',    // property_detail_ar filter matches on label_ar
      labelField: 'label_ar',
      allLabel  : 'الكل',
    },
    {
      selectId  : 'filter-rooms',
      sheet     : 'rooms',
      valueField: 'key_en',      // rooms filter uses key_en (numeric string)
      labelField: 'label_ar',
      allLabel  : 'الكل',
    },
  ];

  filterConfig.forEach(({ selectId, sheet, valueField, labelField, allLabel }) => {
    const select = document.getElementById(selectId);
    if (!select) return;

    const items = _taxonomy[sheet];
    if (!items || !items.length) {
      console.warn(`[ElSahaba Taxonomy] No data for filter sheet: ${sheet}`);
      return;
    }

    // Preserve the existing onchange attribute before touching innerHTML
    // (it already exists on the element — we don't need to re-apply it)
    const existingOnChange = select.getAttribute('onchange');

    // Rebuild option list
    select.innerHTML = '';

    // "All" option (empty value = no filter applied, matching ElSahabaFilters logic)
    const allOpt       = document.createElement('option');
    allOpt.value       = '';
    allOpt.textContent = allLabel;
    select.appendChild(allOpt);

    // Data options
    items.forEach(item => {
      const opt       = document.createElement('option');
      opt.value       = String(item[valueField] !== undefined ? item[valueField] : '');
      opt.textContent = String(item[labelField] !== undefined ? item[labelField] : opt.value);
      select.appendChild(opt);
    });

    // Re-apply onchange if it was wiped by innerHTML (it won't be since we use
    // appendChild, but this is a safety measure)
    if (existingOnChange && !select.getAttribute('onchange')) {
      select.setAttribute('onchange', existingOnChange);
    }
  });

  // ── Cascade: district dropdown filtered by selected city ──
  _wireCityDistrictCascade();

  console.log('[ElSahaba Taxonomy] Filter dropdowns populated.');
}


/**
 * _wireCityDistrictCascade()
 * ──────────────────────────
 * When the city filter changes, re-populate the district dropdown
 * to only show districts belonging to the selected city.
 * Selecting a city also resets the district filter.
 */
function _wireCityDistrictCascade() {
  const citySelect     = document.getElementById('filter-city');
  const districtSelect = document.getElementById('filter-district');
  if (!citySelect || !districtSelect) return;

  const allDistricts = _taxonomy.districts || [];

  citySelect.addEventListener('change', () => {
    const selectedCityKey = citySelect.value; // key_en of selected city

    // Reset district filter via the filter engine
    if (window.ElSahabaFilters) {
      window.ElSahabaFilters.setDistrict('');
    }

    // Rebuild district options
    districtSelect.innerHTML = '';

    const allOpt       = document.createElement('option');
    allOpt.value       = '';
    allOpt.textContent = 'كل المناطق';
    districtSelect.appendChild(allOpt);

    const filtered = selectedCityKey
      ? allDistricts.filter(d => d.city_key === selectedCityKey)
      : allDistricts;

    filtered.forEach(district => {
      const opt       = document.createElement('option');
      opt.value       = district.label_ar;  // label_ar used for filter matching
      opt.textContent = district.label_ar;
      districtSelect.appendChild(opt);
    });
  });
}


/* ─────────────────────────────────────────────────────────────────────────────
   PUBLIC API
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * window.ElSahabaTaxonomy
 * ────────────────────────
 * Public interface. Other scripts can use this to access taxonomy data
 * after it has been loaded, without coupling to this file's internals.
 *
 * Usage:
 *   const cities = window.ElSahabaTaxonomy.get('cities');
 *   const all    = window.ElSahabaTaxonomy.get();
 *   const ready  = window.ElSahabaTaxonomy.isReady();
 */
window.ElSahabaTaxonomy = {

  /**
   * get(sheetName?)
   * ───────────────
   * Returns a taxonomy sheet array by name, or the full taxonomy object.
   * Returns null if taxonomy hasn't loaded yet.
   */
  get(sheetName) {
    if (!_taxonomy) return null;
    return sheetName ? (_taxonomy[sheetName] || null) : _taxonomy;
  },

  /**
   * isReady()
   * ─────────
   * Returns true if the taxonomy has been loaded successfully.
   */
  isReady() {
    return _taxonomy !== null;
  },

  /**
   * getLabel(sheetName, keyEnValue, keyField?, labelField?)
   * ────────────────────────────────────────────────────────
   * Looks up the Arabic label for a given English key value in a sheet.
   * Useful for translating stored English values to display labels.
   *
   * Example:
   *   ElSahabaTaxonomy.getLabel('cities', 'Giza')  → 'الجيزة'
   *   ElSahabaTaxonomy.getLabel('finishing', 'fully_finished')  → 'متشطبة'
   */
  getLabel(sheetName, keyEnValue, keyField = 'key_en', labelField = 'label_ar') {
    const items = this.get(sheetName);
    if (!items) return keyEnValue;
    const match = items.find(item => String(item[keyField]) === String(keyEnValue));
    return match ? String(match[labelField]) : keyEnValue;
  },

  /**
   * invalidateCache()
   * ─────────────────
   * Clears the browser sessionStorage cache and forces a fresh fetch
   * on the next page load. Useful for development / after a Sheet update.
   */
  invalidateCache() {
    try {
      sessionStorage.removeItem(BROWSER_CACHE_KEY);
      sessionStorage.removeItem(BROWSER_CACHE_TS_KEY);
      console.log('[ElSahaba Taxonomy] Browser cache cleared.');
    } catch (_) { /* sessionStorage unavailable */ }
  },
};
