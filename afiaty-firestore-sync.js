// afiaty-firestore-sync.js - يخلي تذكير التطبيق ينحفظ بقاعدة البيانات
(function () {
  // ===== 1) الصق كود Firebase اللي نسخته هنا =====
  // امسح هالسطرين الجوه، والصق بدالهم الكود اللي نسخته من Firebase
  // اللي يبدي بـ const firebaseConfig = {
  // وينتهي بـ };
  


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBG-xwxw6GuVhxL6mFsTlg0pJE6w_Oigtw",
  authDomain: "afiaty-app-c4d19.firebaseapp.com",
  databaseURL: "https://afiaty-app-c4d19-default-rtdb.firebaseio.com",
  projectId: "afiaty-app-c4d19",
  storageBucket: "afiaty-app-c4d19.firebasestorage.app",
  messagingSenderId: "517088634256",
  appId: "1:517088634256:web:491bcbdeda8acb5704ff15",
  measurementId: "G-D9KVXC9R2N"
};


  // ===== 2) باقي الكود - لا تغير شي هنا =====
    function loadScript(src) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[src="' + src + '"]')) return res();
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function getPlayerId() {
    var keys = ['onesignal_player_id', 'afiaty_player_id', 'playerId', 'onesignalId', 'subscriptionId', 'OneSignalPlayerId'];
    for (var i = 0; i < keys.length; i++) {
      try { var v = localStorage.getItem(keys[i]); if (v && v.length > 10) return v; } catch (e) {}
    }
    if (window.AfiatyPlayerId) return window.AfiatyPlayerId;
    try {
      var os = localStorage.getItem('OneSignal');
      if (os) { var o = JSON.parse(os); if (o && o.subscriptionId) return o.subscriptionId; }
    } catch (e) {}
    return null;
  }

  function getMedicineName(obj) {
    return obj.medicineName || obj.medicine || obj.drugName || obj.drug || obj.name || obj.title || obj.medicine_name || 'دواءك';
  }

  function getTime(obj) {
    var t = obj.scheduledTime || obj.remindAt || obj.dueAt || obj.datetime || obj.dateTime || obj.timestamp || obj.time;
    if (!t && obj.date && obj.time) t = obj.date + ' ' + obj.time;
    if (!t && obj.hour !== undefined) {
      var d = new Date(); d.setHours(obj.hour || 8, obj.minute || 0, 0, 0);
      if (d < new Date()) d.setDate(d.getDate() + 1);
      return d;
    }
    if (!t) return null;
    if (t && typeof t === 'object' && t.seconds) return new Date(t.seconds * 1000);
    var d2 = new Date(t);
    if (isNaN(d2.getTime())) return null;
    return d2;
  }

  function getSynced() {
    try { return JSON.parse(localStorage.getItem('afiaty_synced_ids') || '[]'); } catch (e) { return []; }
  }
  function markSynced(hash) {
    var arr = getSynced(); if (arr.indexOf(hash) === -1) arr.push(hash);
    try { localStorage.setItem('afiaty_synced_ids', JSON.stringify(arr)); } catch (e) {}
  }

  async function syncAll() {
    try {
      if (typeof firebaseConfig === 'undefined') return;
      if (!window.firebase || !window.firebase.firestore) return;
      if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      var db = firebase.firestore();
      var playerId = getPlayerId()  || 'pending'; 
      
      var synced = getSynced();

      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key) continue;
        if (key === 'afiaty_synced_ids') continue;
        var raw = localStorage.getItem(key);
        if (!raw || raw.length < 10 || raw[0] !== '[' && raw[0] !== '{') continue;
        var data;
        try { data = JSON.parse(raw); } catch (e) { continue; }
        var list = Array.isArray(data) ? data : [data];
        for (var j = 0; j < list.length; j++) {
          var obj = list[j];
          if (!obj || typeof obj !== 'object') continue;
          var med = getMedicineName(obj);
          var due = getTime(obj);
          if (!due) continue;
          if (due < new Date(Date.now() - 60 * 60 * 1000)) continue;
          var hash = med + '|' + due.toISOString().slice(0, 16);
          if (synced.indexOf(hash) !== -1) continue;
          try {
            await db.collection('reminders').add({
              medicineName: med,
              playerId: playerId,
              scheduledTime: firebase.firestore.Timestamp.fromDate(due),
              sent: false,
              source: 'app',
              localKey: key,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            markSynced(hash);
            console.log('Afiaty synced:', med, due.toISOString());
          } catch (e) { console.log('Afiaty sync error', e.message); }
        }
      }
    } catch (e) { console.log('Afiaty sync error', e.message); }
  }

  async function init() {
    try {
      await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js');
      // نحاول نجيب Player ID من OneSignal اذا موجود
      try {
        if (window.OneSignal && window.OneSignal.getSubscriptionId) {
          var sid = await window.OneSignal.getSubscriptionId();
          if (sid) { try { localStorage.setItem('afiaty_player_id', sid); } catch (e) {} }
        }
      } catch (e) {}
      setInterval(syncAll, 10000);
      setTimeout(syncAll, 3000);
      var origSet = localStorage.setItem;
      localStorage.setItem = function (k, v) { origSet.apply(this, arguments); setTimeout(syncAll, 1000); };
      // دالة يدوية اذا التطبيق يريد يستعملها
      window.AfiatySaveReminder = async function (med, isoTime) {
        try {
          if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
          var db = firebase.firestore();
          var pid = getPlayerId()  || 'pending'; 
          
          await db.collection('reminders').add({
            medicineName: med,
            playerId: pid,
            scheduledTime: firebase.firestore.Timestamp.fromDate(new Date(isoTime)),
            sent: false,
            source: 'app-manual',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        } catch (e) {}
      };
    } catch (e) { console.log('Afiaty sync init error', e.message); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
