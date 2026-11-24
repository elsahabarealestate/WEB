/* El Sahaba: privacy-friendly analytics collector.
 * - No cookies, no IP, no fingerprinting. A random per-tab session id lives in sessionStorage only.
 * - Respects Do Not Track and ignores automated browsers.
 * - Sends small batches to the owner's own Google Apps Script (apps-script/analytics.gs).
 * - Does nothing until ENDPOINT is set, so it is safe to ship before the script exists.
 */
(function () {
  'use strict';
  var ENDPOINT = ''; // paste the deployed Apps Script /exec URL here (see apps-script/README.md)
  if (!ENDPOINT || navigator.doNotTrack === '1' || navigator.webdriver) return;
  var path = location.pathname.replace(/\/+$/, '') || '/';
  if (/^\/(d|dashboard)(\/|$)/.test(path)) return; // never track the owner dashboard

  var sid;
  try {
    sid = sessionStorage.getItem('elsid');
    if (!sid) { sid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); sessionStorage.setItem('elsid', sid); }
  } catch (e) { sid = 'x' + Math.random().toString(36).slice(2, 8); }

  var dev = window.innerWidth < 768 ? 'm' : (window.innerWidth < 1100 ? 't' : 'd');
  var lang = String(navigator.language || '').slice(0, 2).toLowerCase();
  var ref = '';
  try {
    var q = new URLSearchParams(location.search).get('utm_source');
    var h = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : '';
    ref = q ? 'utm:' + q.slice(0, 30) : (h && h.indexOf('elsahaba.homes') === -1 ? h : '');
  } catch (e) {}

  var queue = [], timer = null;
  function unitFromPath(p) { var m = p.match(/^\/property\/([A-Za-z0-9_]+)$/); return m ? m[1] : ''; }
  function unitFromText(s) {
    var m = String(s || '').match(/\/property\/([A-Za-z0-9_]+)/) || String(s || '').match(/\b(PROP_\d+)\b/);
    return m ? m[1] : '';
  }
  function track(type, unit, extra) {
    queue.push({ t: type, p: path, u: unit || '', r: ref, d: dev, l: lang, x: String(extra || '').slice(0, 60), s: sid });
    if (queue.length >= 10) flush(); else if (!timer) timer = setTimeout(flush, 2000);
  }
  function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!queue.length) return;
    var body = JSON.stringify({ events: queue.splice(0, 20) });
    try { fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: body }); } catch (e) {}
  }

  track('pv', unitFromPath(path));
  if (unitFromPath(path)) track('unit_view', unitFromPath(path));

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a,button');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('wa.me') > -1) {
      var u = ''; try { u = unitFromText(decodeURIComponent(href)); } catch (x) {}
      track('wa_click', u || unitFromPath(path));
    } else if (href.indexOf('tel:') === 0) {
      track('call_click', unitFromPath(path));
    } else if (a.id === 'copy' || String(a.getAttribute('onclick') || '').indexOf('copyUnitLink') > -1) {
      track('copy_link', unitFromPath(path) || unitFromText(a.getAttribute('onclick')));
    } else if (a.id === 'share') {
      track('share', unitFromPath(path));
    } else if (a.classList && a.classList.contains('card-title')) {
      track('card_click', unitFromText(href));
    }
  }, true);

  var ft = null;
  document.addEventListener('change', function (e) {
    var el = e.target; if (!el || !el.id || el.id.indexOf('filter-') !== 0 || el.id === 'filter-search') return;
    track('filter', '', el.id.replace('filter-', '') + '=' + el.value);
  }, true);
  document.addEventListener('input', function (e) {
    var el = e.target; if (!el || el.id !== 'filter-search') return;
    clearTimeout(ft); ft = setTimeout(function () { if (el.value.trim().length > 1) track('search', '', el.value.trim()); }, 1500);
  }, true);

  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
})();
