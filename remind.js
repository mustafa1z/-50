// يرسل إشعار التذكير عبر OneSignal بوقته. يشتغل كل 5 دقائق من GitHub Actions.
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  databaseURL: 'https://afiaty-app-c4d19-default-rtdb.firebaseio.com'
});

const TZ = 'Asia/Baghdad';
const WINDOW_MIN = 20; // إذا تأخر التشغيل، يرسل خلال 20 دقيقة من وقت التذكير

function parts(d){
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', weekday:'short', hour12:false });
  const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: (Number(p.hour) % 24) * 60 + Number(p.minute), wd: p.weekday };
}

let TOKENS = {};

async function sendViaOneSignal(uid, r, target, label){
  const body = {
    app_id: process.env.ONESIGNAL_APP_ID,
    target_channel: 'push',
    ...target,
    headings: { en: '⏰ عافيتي' },
    contents: { en: `وقت ${r.type || 'التذكير'} - ${r.time}${r.note ? ' - ' + r.note : ''}` }
  };
  const res = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Key ' + process.env.ONESIGNAL_REST_KEY },
    body: JSON.stringify(body)
  });
  const j = await res.json().catch(() => ({}));
  console.log('send', uid, 'via', label, res.status, JSON.stringify(j));
  return res.ok && !!j.id;
}

async function sendPush(uid, r){
  const ids = (TOKENS[uid] && TOKENS[uid].onesignalIds) || [];

  // الحل: نرسل أولاً عن طريق external_id وهو رقم حسابك الثابت ETH...
  // هذا الرقم ما يتغير حتى لو تغير رقم الجهاز، فـ OneSignal هو يلقى جهازك المشترك الحالي ويدز له.
  const okExternal = await sendViaOneSignal(uid, r, { include_aliases: { external_id: [uid] } }, 'external_id');
  if (okExternal) return true;

  // إذا فشل external_id، نجرب رقم الجهاز القديم المخزون كخطة بديلة فقط
  if (ids.length) {
    const okSub = await sendViaOneSignal(uid, r, { include_subscription_ids: ids }, 'subscription_ids');
    if (okSub) return true;
  }

  return false;
}

(async () => {
  const db = admin.database();
  TOKENS = (await db.ref('sehaty_fcm_tokens').get()).val() || {};
  const all = (await db.ref('sehaty_reminders').get()).val() || {};
  const now = parts(new Date());
  let sent = 0;
  for (const [uid, rems] of Object.entries(all)) {
    for (const [id, r] of Object.entries(rems || {})) {
      if (!r || !r.active || !r.time) continue;
      const [h, m] = String(r.time).split(':').map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) continue;
      const diff = now.minutes - (h * 60 + m);
      if (diff < 0 || diff > WINDOW_MIN) continue;
      if (r.lastSent === now.date) continue;
      if (r.repeat === 'مرة واحدة' && r.firedOnce) continue;
      if (r.repeat === 'أسبوعي' && r.createdAt && parts(new Date(r.createdAt)).wd !== now.wd) continue;
      if (await sendPush(uid, r)) {
        const upd = { lastSent: now.date };
        if (r.repeat === 'مرة واحدة') { upd.active = false; upd.firedOnce = true; }
        await db.ref(`sehaty_reminders/${uid}/${id}`).update(upd);
        sent++;
      }
    }
  }
  console.log('done, sent:', sent);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
