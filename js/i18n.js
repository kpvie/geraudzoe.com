(function () {
  const STORAGE_KEY = 'site-lang';
  const DEFAULT_LANG = 'fr';

  // Ajoute une ligne ici pour chaque nouvelle langue (et crée le JSON correspondant dans /lang/)
  // flagClass utilise la librairie flag-icons (fi fi-<code pays ISO 3166-1 alpha-2>)
  const SUPPORTED_LANGS = [
    { code: 'fr', label: 'Français', flagClass: 'fi fi-fr' },
    { code: 'en', label: 'English', flagClass: 'fi fi-gb' }
  ];

  const cache = {};

  function getInitialLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGS.some(l => l.code === saved)) return saved;

    const browserLang = (navigator.language || DEFAULT_LANG).slice(0, 2);
    if (SUPPORTED_LANGS.some(l => l.code === browserLang)) return browserLang;

    return DEFAULT_LANG;
  }

  async function loadLang(code) {
    if (cache[code]) return cache[code];
    const res = await fetch(`lang/${code}.json`);
    if (!res.ok) throw new Error(`Impossible de charger lang/${code}.json`);
    const data = await res.json();
    cache[code] = data;
    return data;
  }

  function getValue(obj, path) {
    return path.split('.').reduce(
      (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
      obj
    );
  }

  function applyTranslations(dict) {
    // Texte simple
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const value = getValue(dict, el.getAttribute('data-i18n'));
      if (value !== undefined) el.textContent = value;
    });

    // Contenu avec balises HTML à l'intérieur (ex: <strong>)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const value = getValue(dict, el.getAttribute('data-i18n-html'));
      if (value !== undefined) el.innerHTML = value;
    });

    // Placeholders de formulaire
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const value = getValue(dict, el.getAttribute('data-i18n-placeholder'));
      if (value !== undefined) el.setAttribute('placeholder', value);
    });

    // aria-label
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
      const value = getValue(dict, el.getAttribute('data-i18n-aria-label'));
      if (value !== undefined) el.setAttribute('aria-label', value);
    });
  }

  function updateSwitcherUI(code) {
    const btn = document.getElementById('langCurrent');
    const lang = SUPPORTED_LANGS.find(l => l.code === code);
    if (btn && lang) {
      btn.innerHTML = `<span class="${lang.flagClass}"></span> ${lang.code.toUpperCase()}`;
    }

    document.querySelectorAll('.lang-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.lang === code);
    });
  }

  async function setLanguage(code) {
    try {
      const dict = await loadLang(code);
      applyTranslations(dict);
      document.documentElement.setAttribute('lang', code);
      localStorage.setItem(STORAGE_KEY, code);
      updateSwitcherUI(code);
    } catch (err) {
      console.error('[i18n] Erreur de traduction :', err);
    }
  }

  function buildSwitcher() {
    const container = document.getElementById('langSwitcher');
    if (!container) return;

    const dropdown = document.createElement('div');
    dropdown.className = 'lang-dropdown';

    SUPPORTED_LANGS.forEach(l => {
      const opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'lang-option';
      opt.dataset.lang = l.code;
      opt.innerHTML = `<span class="${l.flagClass}"></span> ${l.label}`;
      opt.addEventListener('click', () => {
        setLanguage(l.code);
        dropdown.classList.remove('open');
      });
      dropdown.appendChild(opt);
    });

    container.appendChild(dropdown);

    const toggleBtn = document.getElementById('langCurrent');
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) dropdown.classList.remove('open');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildSwitcher();
    setLanguage(getInitialLang());
  });
})();
