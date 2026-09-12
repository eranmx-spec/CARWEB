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

/* ---------- כל כפתור "בדיקה חינם" ממקד את הטופס ---------- */
$$('a[href="#lead"]').forEach(a => a.addEventListener('click', () => {
  setTimeout(() => { if (!form.hidden) $('#name').focus({ preventScroll: true }); }, 500);
}));
