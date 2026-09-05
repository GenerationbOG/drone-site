/**
 * COREPLUS i18n engine
 * - Loads i18n/common.json (nav/footer, present on every page)
 * - Optionally loads a page-specific dictionary at i18n/<page>.json
 *   (e.g. i18n/index.json) if the current page has one — pages without
 *   one simply keep their body content in Russian for now, while nav/
 *   footer still translate everywhere.
 * - Persists the chosen language in localStorage so it's remembered
 *   across pages and visits.
 */
(function () {
  const SUPPORTED = ['ru', 'en', 'fr'];
  const stored = localStorage.getItem('coreplus_lang');
  let currentLang = SUPPORTED.includes(stored) ? stored : 'ru';

  let commonDict = null;
  let pageDict = null;

  function pageKey() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    return path.replace('.html', '');
  }

  async function loadDicts() {
    try {
      const res = await fetch('i18n/common.json', { cache: 'no-store' });
      commonDict = await res.json();
    } catch (e) {
      commonDict = { ru: {}, en: {}, fr: {} };
    }
    try {
      const res2 = await fetch(`i18n/${pageKey()}.json`, { cache: 'no-store' });
      if (res2.ok) pageDict = await res2.json();
    } catch (e) {
      pageDict = null;
    }
  }

  function t(key, lang) {
    if (pageDict && pageDict[lang] && pageDict[lang][key] != null) return pageDict[lang][key];
    if (commonDict && commonDict[lang] && commonDict[lang][key] != null) return commonDict[lang][key];
    return null;
  }

  function applyLang(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key, lang);
      if (val != null) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const val = t(key, lang);
      if (val != null) el.innerHTML = val;
    });
    document.querySelectorAll('.lang-switch button').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
  }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) return;
    currentLang = lang;
    localStorage.setItem('coreplus_lang', lang);
    applyLang(lang);
  }

  function initSwitcher() {
    document.querySelectorAll('.lang-switch button').forEach(btn => {
      btn.addEventListener('click', () => setLang(btn.dataset.lang));
    });
  }

  async function init() {
    await loadDicts();
    initSwitcher();
    applyLang(currentLang);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.coreplusI18n = { setLang, getLang: () => currentLang };
})();
