const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
  const now = admin.firestore.Timestamp.now();
  const snap = await db.collection('reminders').where('sent', '==', false).where('scheduledTime', '<=', now).get();
  console.log('Found reminders:', snap.size);
  for (const doc of snap.docs) {
    const data = doc.data();
    const medicine = data.medicineName || 'دواءك';
    const targetId = process.env.ONESIGNAL_USER_ID || data.playerId || data.subscriptionId || data.oneSignalId;
    if (!targetId) { console.log('No target for', doc.id); continue; }
    console.log('Sending to', targetId, medicine);
    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + process.env.ONESIGNAL_REST_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: process.env.ONESIGNAL_APP_ID,
        include_subscription_ids: [targetId],
        headings: { en: 'تذكير دواء 💊', ar: 'تذكير دواء 💊' },
        contents: { en: 'حان وقت ' + medicine, ar: 'حان وقت ' + medicine },
        data: { reminderId: doc.id, medicineName: medicine },
        target_channel: 'push'
      })
    });
    const text = await res.text();
    console.log('OneSignal response:', res.status, text);
    if (res.ok) {
      await doc.ref.update({ sent: true, sentAt: admin.firestore.FieldValue.serverTimestamp() });
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
