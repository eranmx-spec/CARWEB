/* ==========================================================
   AutoPass – landing page logic
   ==========================================================
   1. הדביקו כאן את כתובת ה-Web App של Google Apps Script
      (מדריך מלא: README.md → "חיבור לגוגל שיט")
   ========================================================== */
const CONFIG = {
  SHEET_ENDPOINT: '', // דוגמה: 'https://script.google.com/macros/s/AKfy..../exec'
  SOURCE: 'דף נחיתה'
};

/* ---------- helpers ---------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ---------- year ---------- */
$('#year').textContent = new Date().getFullYear();

/* ---------- sticky header ---------- */
const header = $('#header');
const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 12);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- mobile nav ---------- */
const navToggle = $('#navToggle');
const nav = $('#nav');
navToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(open));
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && nav.classList.contains('is-open')) {
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.focus();
  }
});
$$('#nav a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
}));

/* ---------- reveal on scroll ---------- */
// כותרות הסקשנים נכנסות גם הן בתנועה
$$('.section__head').forEach(el => el.classList.add('reveal', 'reveal--head'));
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
  });
}, { threshold: 0.15 });
$$('.reveal').forEach(el => io.observe(el));

/* ---------- animated counters ---------- */
const countIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = Number(el.dataset.count);
    // עצירת אנימציות (תפריט נגישות / הגדרת מערכת) – מציגים את הערך הסופי מיד
    const motionOff = document.documentElement.classList.contains('a11y-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (motionOff) {
      el.textContent = target.toLocaleString('he-IL') + (target >= 1000 ? '+' : '');
      countIO.unobserve(el);
      return;
    }
    const dur = 1200;
    const start = performance.now();
    const tick = now => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('he-IL');
      if (p < 1) requestAnimationFrame(tick);
      else if (target >= 1000) el.textContent = target.toLocaleString('he-IL') + '+';
    };
    requestAnimationFrame(tick);
    countIO.unobserve(el);
  });
}, { threshold: 0.5 });
$$('[data-count]').forEach(el => countIO.observe(el));

/* ---------- FAQ: פותח אחד בכל פעם ---------- */
const faqItems = $$('.faq details');
faqItems.forEach(d => d.addEventListener('toggle', () => {
  if (d.open) faqItems.filter(o => o !== d).forEach(o => (o.open = false));
}));

/* ---------- ולידציה ---------- */
// מספר ישראלי: נייד 05X-XXXXXXX, קווי 0X-XXXXXXX, וגם 07X. תומך ב-+972 / רווחים / מקפים
const PHONE_RE = /^0(?:5\d{8}|7\d{8}|[23489]\d{7})$/;

const normalizePhone = raw =>
  raw.replace(/[\s\-().]/g, '').replace(/^\+?972/, '0');

const showError = (name, msg) => {
  const input = $(`#${name}`);
  const box = $(`[data-err="${name}"]`);
  if (box) box.textContent = msg || '';
  input.classList.toggle('invalid', Boolean(msg));
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
};

const validate = data => {
  let ok = true;
  if (data.name.trim().length < 2) { showError('name', 'נא למלא שם מלא'); ok = false; }
  else showError('name', '');

  const phone = normalizePhone(data.phone);
  if (!phone) { showError('phone', 'נא למלא מספר טלפון'); ok = false; }
  else if (!PHONE_RE.test(phone)) { showError('phone', 'מספר הטלפון לא נראה תקין'); ok = false; }
  else showError('phone', '');

  return ok;
};

/* ניקוי שגיאה תוך כדי הקלדה */
['name', 'phone'].forEach(id => $(`#${id}`).addEventListener('input', () => showError(id, '')));

/* ---------- גיבוי מקומי (למקרה שהשליחה נכשלת) ---------- */
const LS_KEY = 'autopass_leads';
const backupLead = lead => {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    all.push(lead);
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch (_) { /* מצב פרטי / אחסון חסום */ }
};

/* ייצוא הלידים ששמורים בדפדפן – להרצה מהקונסול: exportLeads() */
window.exportLeads = () => {
  const all = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  if (!all.length) return console.log('אין לידים שמורים מקומית');
  const cols = ['timestamp', 'name', 'phone', 'car', 'month', 'source', 'notes'];
  const csv = ['﻿' + cols.join(',')]
    .concat(all.map(l => cols.map(c => `"${String(l[c] ?? '').replace(/"/g, '""')}"`).join(',')))
    .join('\n');
  console.log(csv);
  return csv;
};

/* ---------- שליחה ---------- */
const form = $('#leadForm');
const submitBtn = $('#submitBtn');
const successBox = $('#formSuccess');

const params = new URLSearchParams(location.search);
const utm = ['utm_source', 'utm_medium', 'utm_campaign']
  .map(k => params.get(k)).filter(Boolean).join(' / ');

form.addEventListener('submit', async e => {
  e.preventDefault();

  const data = {
    timestamp: new Date().toLocaleString('he-IL'),
    name:   $('#name').value.trim(),
    phone:  $('#phone').value.trim(),
    car:    $('#car').value.trim(),
    month:  $('#month').value,
    notes:  $('#notes').value.trim(),
    consent: $('#consent').checked ? 'כן' : 'לא',
    source: utm ? `${CONFIG.SOURCE} (${utm})` : CONFIG.SOURCE,
    page:   location.href
  };

  if (!validate(data)) {
    $(data.name.trim().length < 2 ? '#name' : '#phone').focus();
    return;
  }

  submitBtn.classList.add('is-loading');
  submitBtn.disabled = true;
  backupLead(data);

  try {
    if (CONFIG.SHEET_ENDPOINT) {
      // form-encoded → בלי preflight; no-cors → Apps Script מחזיר תשובה אטומה וזה בסדר
      await fetch(CONFIG.SHEET_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams(data).toString()
      });
    } else {
      console.warn('SHEET_ENDPOINT לא הוגדר ב-script.js — הליד נשמר מקומית בלבד.', data);
    }
  } catch (err) {
    console.error('שליחת הליד נכשלה, הליד נשמר מקומית:', err);
  } finally {
    submitBtn.classList.remove('is-loading');
    submitBtn.disabled = false;
    form.hidden = true;
    successBox.hidden = false;
    successBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
    $('#successTitle').focus({ preventScroll: true });
    if (typeof gtag === 'function') gtag('event', 'generate_lead');
    if (typeof fbq === 'function') fbq('track', 'Lead');
  }
});

$('#resetForm').addEventListener('click', () => {
  form.reset();
  $('#consent').checked = true;
  form.hidden = false;
  successBox.hidden = true;
  $('#name').focus();
});

/* ---------- סרט התמונות הנע ---------- */
// משכפלים כל שורה פעם אחת כדי שהגלילה תהיה רציפה; העותק מוסתר מקוראי מסך
$$('.strip__track').forEach(track => {
  [...track.children].forEach(li => {
    const clone = li.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelector('img').alt = '';
    track.appendChild(clone);
  });
});
const strip = $('.strip');
const stripToggle = $('#stripToggle');
stripToggle.addEventListener('click', () => {
  const paused = strip.classList.toggle('is-paused');
  stripToggle.setAttribute('aria-pressed', String(paused));
  $('.strip__toggle-label', stripToggle).textContent = paused ? 'הפעלת התמונות הנעות' : 'עצירת התמונות הנעות';
});

/* ---------- מסך חי על הטאבלט (שלב 1) ---------- */
const tabScreen = $('#tabScreen');
const tabImg = tabScreen.previousElementSibling;
// פינות המסך בתמונה המקורית (560×560): עליונה-שמאלית, עליונה-ימנית, תחתונה-ימנית, תחתונה-שמאלית
const SCREEN_QUAD = [[273, 93], [492, 126], [404, 480], [173, 430]];
const SCREEN_W = 300, SCREEN_H = 474;

// מטריצה פרספקטיבית שממפה מלבן W×H לארבע נקודות
const quadMatrix = ([[x0, y0], [x1, y1], [x2, y2], [x3, y3]], w, h) => {
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const k = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + k * x3;
  const d = y1 - y0 + g * y1, e = y3 - y0 + k * y3;
  return `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${k / h},0,0,1,0,${x0},${y0},0,1)`;
};

const placeTabScreen = () => {
  const w = tabImg.clientWidth, h = tabImg.clientHeight;
  if (!w) return;
  // התמונה מוצגת ב-object-fit:cover – מחשבים קנה מידה והיסט
  const s = Math.max(w / 560, h / 560);
  const ox = (w - 560 * s) / 2, oy = (h - 560 * s) / 2;
  const quad = SCREEN_QUAD.map(([x, y]) => [x * s + ox, y * s + oy]);
  tabScreen.style.transform = quadMatrix(quad, SCREEN_W, SCREEN_H);
  tabScreen.classList.add('is-placed');
};
new ResizeObserver(placeTabScreen).observe(tabImg);

const motionOff = () => document.documentElement.classList.contains('a11y-motion') ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const tsFields = $$('.ts__field', tabScreen);
const tsPicks = $$('[data-pick]', tabScreen);
const tsBtn = $('.ts__btn', tabScreen);
const wait = ms => new Promise(r => setTimeout(r, ms));
let tsGen = 0; // כל הפעלה מקבלת מספר; לולאה ישנה נעצרת כשהמספר משתנה

const tsFinal = () => {
  $$('.ts__type', tabScreen).forEach(t => (t.textContent = t.dataset.text));
  tsPicks.forEach(p => p.classList.add('is-on'));
};
const tsLoop = async () => {
  const gen = ++tsGen;
  while (gen === tsGen) {
    if (motionOff()) { tsFinal(); tabScreen.classList.remove('is-done'); return; }
    tabScreen.classList.remove('is-done');
    tsPicks.forEach(p => p.classList.remove('is-on'));
    tsFields.forEach(f => f.classList.remove('is-active'));
    $$('.ts__type', tabScreen).forEach(t => (t.textContent = ''));
    await wait(700);
    for (const field of tsFields) {
      const t = $('.ts__type', field);
      field.classList.add('is-active');
      for (const ch of t.dataset.text) { if (gen !== tsGen) return; t.textContent += ch; await wait(95); }
      await wait(250);
      field.classList.remove('is-active');
    }
    for (const p of tsPicks) { await wait(500); p.classList.add('is-on'); }
    await wait(600);
    tsBtn.classList.add('is-press');
    await wait(180);
    tsBtn.classList.remove('is-press');
    await wait(250);
    tabScreen.classList.add('is-done');
    await wait(2800);
  }
};
// רץ רק כשהטאבלט על המסך
new IntersectionObserver(([e]) => {
  if (e.isIntersecting) tsLoop(); else tsGen++;
}, { threshold: 0.3 }).observe(tabScreen.parentElement);

/* ---------- אישור אחרי לחיצה על וואטסאפ ---------- */
// שעות פעילות: א'–ה' 07:30–18:00, ו' 07:30–13:00 (שעון ישראל)
const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const israelNow = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
  }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, mins: Number(get('hour')) * 60 + Number(get('minute')) };
};
const OPEN = 7 * 60 + 30;
const closeAt = day => (day <= 4 ? 18 * 60 : day === 5 ? 13 * 60 : 0);

const replyEta = () => {
  const { day, mins } = israelNow();
  if (mins >= OPEN && mins < closeAt(day)) return { open: true, text: 'יחזור אליך תוך דקות' };
  // היום הפעיל הבא (שבת סגור)
  let next = mins < OPEN && closeAt(day) ? day : (day + 1) % 7;
  if (next === 6) next = 0;
  const when = next === day ? 'היום' : next === (day + 1) % 7 ? 'מחר' : `ביום ${DAY_NAMES[next]}`;
  return { open: false, text: `יחזור אליך ${when} מ-07:30` };
};

const waBox = $('#waConfirm');
const waCard = $('.wa-confirm__card', waBox);
let waLastFocus = null;
let waTimer = 0;

const openWaConfirm = href => {
  const eta = replyEta();
  $('#waEta').textContent = eta.text;
  $('#waStatus').textContent = eta.open ? 'מקוון עכשיו' : 'נחזור בשעות הפעילות';
  $('#waRetry').href = href;
  waLastFocus = document.activeElement;
  waBox.classList.remove('is-shown');
  waBox.hidden = false;
  void waBox.offsetWidth; // מאתחל את האנימציה בכל פתיחה
  waBox.classList.add('is-shown');
  // "מקליד..." עד שהתשובה מופיעה
  const typing = $('.wa-confirm__typing', waBox);
  typing.hidden = false;
  setTimeout(() => { typing.hidden = true; }, 1900);
  document.body.classList.add('has-modal');
  waCard.focus({ preventScroll: true });
};
const closeWaConfirm = () => {
  if (waBox.hidden) return;
  waBox.hidden = true;
  waBox.classList.remove('is-shown');
  document.body.classList.remove('has-modal');
  if (waLastFocus) waLastFocus.focus({ preventScroll: true });
};

// הקישור נפתח כרגיל; החלון מחכה ללקוח כשהוא חוזר לאתר
$$('a[href*="wa.me/"]').forEach(a => {
  if (a.id === 'waRetry') return;
  a.addEventListener('click', () => {
    clearTimeout(waTimer);
    waTimer = setTimeout(() => openWaConfirm(a.href), 700);
  });
});
$$('[data-close]', waBox).forEach(el => el.addEventListener('click', closeWaConfirm));
waBox.addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.stopPropagation(); closeWaConfirm(); return; }
  if (e.key !== 'Tab') return;
  // מלכודת מיקוד בתוך החלון
  const items = $$('button, a[href]', waCard);
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && (document.activeElement === first || document.activeElement === waCard)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

/* ---------- כל כפתור "בדיקה והכנה" ממקד את הטופס ---------- */
$$('a[href="#lead"]').forEach(a => a.addEventListener('click', () => {
  setTimeout(() => { if (!form.hidden) $('#name').focus({ preventScroll: true }); }, 500);
}));
