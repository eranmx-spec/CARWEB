/**
 * AutoPass – קליטת לידים מדף הנחיתה אל Google Sheets
 * ---------------------------------------------------
 * להדביק ב-  script.google.com  →  New project  →  Deploy → New deployment
 * Type: Web app | Execute as: Me | Who has access: Anyone
 * את כתובת ה-/exec שמתקבלת מדביקים ב-script.js → CONFIG.SHEET_ENDPOINT
 */

// ===== הגדרות =====
var SHEET_ID    = '15LWO63T9VoghSyaJdNU_aYdaUSoOubS8sFGLSFcsHH4'; // הגיליון "לידים - מוסך טסט שנתי"
var SHEET_NAME  = '';            // ריק = הגיליון הראשון
var NOTIFY_MAIL = '';            // אימייל לקבלת התראה על כל ליד חדש (ריק = בלי התראות)

var HEADERS = ['חותמת זמן','שם מלא','טלפון','דגם / סוג רכב',
               'חודש הטסט','מקור הליד','הערות','סטטוס','תאריך תיאום'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000); // מונע דריסה כששני לידים נכנסים באותו רגע
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var sheet = getSheet_();

    sheet.appendRow([
      p.timestamp || Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm'),
      p.name  || '',
      formatPhone_(p.phone),
      p.car   || '',
      p.month || '',
      p.source || 'דף נחיתה',
      p.notes || '',
      'חדש',
      ''
    ]);

    if (NOTIFY_MAIL) {
      MailApp.sendEmail({
        to: NOTIFY_MAIL,
        subject: 'ליד חדש מהאתר: ' + (p.name || '') + ' – ' + (p.phone || ''),
        body: [
          'שם: '    + (p.name || ''),
          'טלפון: ' + (p.phone || ''),
          'רכב: '   + (p.car || ''),
          'טסט: '   + (p.month || ''),
          'הערות: ' + (p.notes || ''),
          'מקור: '  + (p.source || ''),
          '',
          'לגיליון: https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit'
        ].join('\n')
      });
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// בדיקה מהירה שה-Web App חי: פתיחת כתובת ה-/exec בדפדפן
function doGet() {
  return json_({ ok: true, service: 'AutoPass leads endpoint' });
}

function getSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME || 'לידים');

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

/** שומר על אפס מוביל ומעצב 050-1234567 */
function formatPhone_(phone) {
  var digits = String(phone || '').replace(/[^\d+]/g, '').replace(/^\+?972/, '0');
  if (/^0\d{9}$/.test(digits)) return digits.slice(0, 3) + '-' + digits.slice(3);
  if (/^0\d{8}$/.test(digits)) return digits.slice(0, 2) + '-' + digits.slice(2);
  return "'" + String(phone || '');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** הרצה חד-פעמית (אופציונלי): עיצוב כותרות, הקפאת שורה 1 וסינון */
function setupSheet() {
  var sheet = getSheet_();
  sheet.setRightToLeft(true);

  // ניקוי עמודות ישנות שכבר לא בשימוש (למשל "מספר רישוי")
  var current = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var c = current.length; c >= 1; c--) {
    var title = String(current[c - 1]).trim();
    if (title && HEADERS.indexOf(title) === -1) sheet.deleteColumn(c);
  }
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setValues([HEADERS])
    .setFontWeight('bold')
    .setBackground('#ff8a1f')
    .setFontColor('#1a1000');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, HEADERS.length);
  if (!sheet.getFilter()) sheet.getRange(1, 1, sheet.getMaxRows(), HEADERS.length).createFilter();
}
