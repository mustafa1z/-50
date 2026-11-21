const admin = require('firebase-admin');

async function main() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  const appId = process.env.ONESIGNAL_APP_ID;
  const restKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 5 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  console.log('Checking reminders at', now.toISOString());

  // نجيب كل التذكيرات - collectionGroup يشمل reminders اللي جوه users و اللي بره
  const snap = await db.collectionGroup('reminders').limit(100).get();
  console.log('Found reminders:', snap.size);

  for (const doc of snap.docs) {
    const data = doc.data();

    // اذا انرسل قبل، نتخطاه
    if (data.sent === true || data.notified === true || data.isDone === true) continue;

    // نطلع وقت التذكير من اي حقل موجود
    let due = null;
    const timeFields = ['scheduledTime', 'remindAt', 'dueAt', 'time', 'dateTime', 'datetime', 'timestamp', 'remindTime'];
    for (const f of timeFields) {
      const v = data[f];
      if (!v) continue;
      if (v && typeof v.toDate === 'function') { due = v.toDate(); break; }
      if (v && v.seconds) { due = new Date(v.seconds * 1000); break; }
      if (typeof v === 'string' || typeof v === 'number') { due = new Date(v); break; }
    }
    if (!due || isNaN(due.getTime())) {
      console.log('Skip - no time:', doc.id);
      continue;
    }

    // نرسل اذا وقته هسه او قريب، او فات عليه اقل من ساعة
    if (due > windowEnd || due < oneHourAgo) {
      console.log('Skip - not due yet:', doc.id, due.toISOString());
      continue;
    }

    const medicine = data.medicineName || data.medicine || data.title || data.name || 'دواءك';

    // نطلع Player ID من التذكير نفسه، واذا ماكو نجيبه من ملف اليوزر
    let playerId = data.playerId || data.onesignalPlayerId || data.player_id || data.onesignalId || data.subscriptionId || data.deviceId || null;
    const userId = data.userId || data.uid || data.user_id || null;

    if (!playerId && userId) {
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const u = userDoc.data();
          playerId = u.onesignalPlayerId || u.playerId || u.player_id || u.onesignalId || u.subscriptionId || null;
        }
      } catch (e) { console.log('User fetch error', e.message); }
    }

    if (!playerId) {
      console.log('Skip - no playerId:', doc.id);
      continue;
    }

    console.log('Sending to', playerId, 'for', medicine, 'due', due.toISOString());

    // نرسل اشعار OneSignal
    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Key ' + restKey
      },
      body: JSON.stringify({
        app_id: appId,
        include_player_ids: [playerId],
        headings: { en: 'Afiaty - وقت الدواء', ar: 'عافيتي - وقت الدواء' },
        contents: { en: 'حان وقت ' + medicine, ar: 'حان وقت ' + medicine },
        data: { reminderId: doc.id, medicine: medicine }
      })
    });

    const text = await res.text();
    console.log('OneSignal:', res.status, text.slice(0, 200));

    if (res.ok) {
      await doc.ref.update({ sent: true, sentAt: admin.firestore.FieldValue.serverTimestamp() });
      console.log('Marked sent:', doc.id);
    }
  }
  console.log('Done');
}

main().catch(e => { console.error(e); process.exit(1); });
