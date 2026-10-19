/**
 * Minimal i18n engine.
 *
 * - Source language (pt) is the markup itself: it is the no-JS / SEO fallback and is
 *   captured from the DOM the first time an element is translated, so it is never duplicated.
 * - Other languages are dictionaries in assets/i18n/<lang>.js, registered at window.I18N[lang].
 *   To add a language: create the dictionary, add the code to SUPPORTED and a button in the switch.
 *
 * Markup:
 *   data-i18n="key"                     replaces the element's innerHTML
 *   data-i18n-attr="attr=key;attr2=k2"  replaces attributes (aria-label, content, ...)
 *
 * Language resolution: saved choice > browser preference (navigator.languages) > DEFAULT.
 * On change, fires `i18n:change` on document (detail.lang) so other scripts can react.
 */
(function () {
  'use strict';

  var DEFAULT = 'pt';
  var SUPPORTED = ['pt', 'en'];
  var HTML_LANG = { pt: 'pt-BR', en: 'en' };
  var STORAGE_KEY = 'lang';

  var dicts = window.I18N || {};
  var originals = new Map(); // element -> { html, attrs } captured from the source markup
  var current = DEFAULT;

  function stored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function save(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* private mode: not persisted */ }
  }

  function detect() {
    var saved = stored();
    if (SUPPORTED.indexOf(saved) > -1) return saved;

    var prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (var i = 0; i < prefs.length; i++) {
      var code = String(prefs[i] || '').toLowerCase().split('-')[0];
      if (SUPPORTED.indexOf(code) > -1) return code;
    }
    return DEFAULT;
  }

  function parseAttrs(spec) {
    return spec.split(';').map(function (pair) {
      var i = pair.indexOf('=');
      return [pair.slice(0, i).trim(), pair.slice(i + 1).trim()];
    });
  }

  // Looks up `key` in `lang`; falls back to the source markup when missing.
  function pick(lang, key, source) {
    var dict = lang === DEFAULT ? null : dicts[lang];
    return dict && dict[key] !== undefined ? dict[key] : source;
  }

  function apply(lang) {
    document.querySelectorAll('[data-i18n], [data-i18n-attr]').forEach(function (el) {
      var orig = originals.get(el);
      if (!orig) {
        orig = { html: el.hasAttribute('data-i18n') ? el.innerHTML : null, attrs: {} };
        if (el.hasAttribute('data-i18n-attr')) {
          parseAttrs(el.getAttribute('data-i18n-attr')).forEach(function (p) { orig.attrs[p[0]] = el.getAttribute(p[0]); });
        }
        originals.set(el, orig);
      }

      if (orig.html !== null) el.innerHTML = pick(lang, el.getAttribute('data-i18n'), orig.html);
      if (el.hasAttribute('data-i18n-attr')) {
        parseAttrs(el.getAttribute('data-i18n-attr')).forEach(function (p) {
          el.setAttribute(p[0], pick(lang, p[1], orig.attrs[p[0]]));
        });
      }
    });

    document.documentElement.lang = HTML_LANG[lang];
    document.querySelectorAll('.lang-switch [data-lang]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-lang') === lang));
    });
  }

  function setLang(lang, persist) {
    if (SUPPORTED.indexOf(lang) < 0) return;
    if (lang === DEFAULT || dicts[lang]) {
      current = lang;
      apply(lang);
      if (persist) save(lang);
      document.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: lang } }));
    }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.lang-switch [data-lang]');
    if (btn) setLang(btn.getAttribute('data-lang'), true);
  });

  window.i18n = { get lang() { return current; }, set: function (lang) { setLang(lang, true); } };

  // Initial render (runs before main.js, so Typed etc. read already-translated content).
  var initial = detect();
  if (initial !== DEFAULT) setLang(initial, false);
  else apply(DEFAULT);
})();
