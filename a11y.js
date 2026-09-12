/* ==========================================================
   AutoPass – תפריט נגישות
   ----------------------------------------------------------
   כלי עזר למשתמש בהתאם לנהוג בישראל. ההנגשה עצמה (ת"י 5568,
   רמה AA) מובנית בקוד האתר ואינה נשענת על התפריט.
   ללא ספריות צד שלישי. ההגדרות נשמרות בדפדפן של המשתמש בלבד.
   ========================================================== */
(() => {
  const root = document.documentElement;
  root.classList.add('js');

  const KEY = 'autopass_a11y';
  const FONT_STEPS = [100, 115, 130, 150, 175];

  const OPTIONS = [
    { id: 'contrast', label: 'ניגודיות גבוהה', icon: '◐' },
    { id: 'gray',     label: 'גווני אפור',     icon: '◑' },
    { id: 'links',    label: 'הדגשת קישורים',  icon: '🔗' },
    { id: 'headings', label: 'הדגשת כותרות',   icon: 'H' },
    { id: 'font',     label: 'גופן קריא',      icon: 'א' },
    { id: 'spacing',  label: 'ריווח טקסט',     icon: '↕' },
    { id: 'motion',   label: 'עצירת אנימציות', icon: '⏸' },
    { id: 'cursor',   label: 'סמן עכבר גדול',  icon: '➤' },
    { id: 'focus',    label: 'הדגשת מיקוד',    icon: '⌨' }
  ];

  const defaults = () => ({ size: 0, ...Object.fromEntries(OPTIONS.map(o => [o.id, false])) });

  const load = () => {
    try { return { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch (_) { return defaults(); }
  };
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* אחסון חסום */ }
  };

  let state = load();

  const apply = () => {
    const pct = FONT_STEPS[state.size] || 100;
    root.style.fontSize = pct === 100 ? '' : pct + '%';
    root.classList.toggle('a11y-zoomed', pct !== 100);
    OPTIONS.forEach(o => root.classList.toggle('a11y-' + o.id, Boolean(state[o.id])));
  };
  apply();

  /* ---------- בניית התפריט ---------- */
  const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 1.5a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6zm8.6 5.6-5.6 1.5v4.2l2.4 7.6a1.1 1.1 0 0 1-2.1.7L12.9 15h-1.8l-2.4 6.1a1.1 1.1 0 0 1-2.1-.7L9 12.8V8.6L3.4 7.1a1.1 1.1 0 1 1 .6-2.1c2.6.7 5.3 1 8 1s5.4-.3 8-1a1.1 1.1 0 1 1 .6 2.1z"/></svg>';

  const wrap = document.createElement('div');
  wrap.className = 'a11y-root';
  wrap.innerHTML = `
    <button type="button" class="a11y-btn" aria-expanded="false" aria-controls="a11yPanel">
      ${ICON}<span class="sr-only">תפריט נגישות</span>
    </button>
    <div class="a11y-panel" id="a11yPanel" role="dialog" aria-modal="false" aria-labelledby="a11yTitle" hidden>
      <div class="a11y-panel__head">
        <h2 id="a11yTitle">תפריט נגישות</h2>
        <button type="button" class="a11y-close" aria-label="סגירת תפריט הנגישות"><span aria-hidden="true">✕</span></button>
      </div>
      <div class="a11y-fs" role="group" aria-labelledby="a11yFsLabel">
        <span id="a11yFsLabel">גודל טקסט</span>
        <button type="button" class="a11y-fs__btn" data-step="-1" aria-label="הקטנת טקסט">א-</button>
        <output class="a11y-fs__val" aria-live="polite" aria-atomic="true"></output>
        <button type="button" class="a11y-fs__btn" data-step="1" aria-label="הגדלת טקסט">א+</button>
      </div>
      <div class="a11y-grid">
        ${OPTIONS.map(o => `
        <button type="button" class="a11y-opt" data-opt="${o.id}" aria-pressed="false">
          <span class="a11y-opt__icon" aria-hidden="true">${o.icon}</span>
          <span class="a11y-opt__label">${o.label}</span>
        </button>`).join('')}
      </div>
      <div class="a11y-actions">
        <button type="button" class="a11y-reset">איפוס כל ההגדרות</button>
        <a class="a11y-statement" href="accessibility.html">הצהרת נגישות</a>
      </div>
      <p class="a11y-hint">סגירה במקש Esc. ההגדרות נשמרות בדפדפן זה בלבד.</p>
    </div>`;

  // מיד אחרי קישור הדילוג – כך התפריט הוא מהרכיבים הראשונים בסדר המיקוד
  const skip = document.querySelector('.skip-link');
  if (skip) skip.after(wrap); else document.body.prepend(wrap);

  const btn = wrap.querySelector('.a11y-btn');
  const panel = wrap.querySelector('.a11y-panel');
  const closeBtn = wrap.querySelector('.a11y-close');
  const val = wrap.querySelector('.a11y-fs__val');
  const sizeBtns = [...wrap.querySelectorAll('.a11y-fs__btn')];
  const optBtns = [...wrap.querySelectorAll('.a11y-opt')];

  const sync = () => {
    val.textContent = (FONT_STEPS[state.size] || 100) + '%';
    // aria-disabled ולא disabled – כדי שהמיקוד לא ייעלם מהכפתור בקצה הטווח
    sizeBtns[0].setAttribute('aria-disabled', String(state.size <= 0));
    sizeBtns[1].setAttribute('aria-disabled', String(state.size >= FONT_STEPS.length - 1));
    optBtns.forEach(b => b.setAttribute('aria-pressed', String(Boolean(state[b.dataset.opt]))));
  };

  const update = () => { apply(); sync(); save(); };

  const open = () => {
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    closeBtn.focus();
  };
  const close = (returnFocus = true) => {
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (returnFocus) btn.focus();
  };

  btn.addEventListener('click', () => (panel.hidden ? open() : close()));
  closeBtn.addEventListener('click', () => close());

  sizeBtns.forEach(b => b.addEventListener('click', () => {
    const next = state.size + Number(b.dataset.step);
    if (next < 0 || next >= FONT_STEPS.length) return;
    state.size = next;
    update();
  }));

  optBtns.forEach(b => b.addEventListener('click', () => {
    state[b.dataset.opt] = !state[b.dataset.opt];
    update();
  }));

  wrap.querySelector('.a11y-reset').addEventListener('click', () => {
    state = defaults();
    update();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) close();
  });
  document.addEventListener('click', e => {
    if (!panel.hidden && !wrap.contains(e.target)) close(false);
  });

  sync();

  /* ---------- קישור "דלג לתוכן הראשי" – מעביר גם את המיקוד ---------- */
  document.querySelectorAll('.skip-link').forEach(a => a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.focus();
    target.scrollIntoView();
  }));

  /* ---------- סימון קישורים שנפתחים בחלון חדש לקוראי מסך ---------- */
  const NEW_WIN = ' (נפתח בחלון חדש)';
  document.querySelectorAll('a[target="_blank"]').forEach(a => {
    const label = a.getAttribute('aria-label');
    if (label !== null) {
      if (!label.includes('חלון חדש')) a.setAttribute('aria-label', label + NEW_WIN);
    } else if (!a.querySelector('.sr-only')) {
      a.insertAdjacentHTML('beforeend', `<span class="sr-only">${NEW_WIN}</span>`);
    }
  });
})();
