// afiaty-median-onesignal.js - نسخة Median Bridge
(function () {
  function saveId(id) {
    if (!id || id.length < 10) return false;
    try {
      localStorage.setItem('afiaty_player_id', id);
      localStorage.setItem('onesignal_player_id', id);
      localStorage.setItem('playerId', id);
      window.AfiatyPlayerId = id;
    } catch (e) {}
    console.log('Afiaty PlayerId:', id);
    return true;
  }
  function getBridge() {
    return window.median || window.gonative || window.Median || window.GoNative || null;
  }
  function toastMsg(m) {
    try { if (window.toast) window.toast(m); else console.log(m); } catch (e) { console.log(m); }
  }
  async function tryMedian() {
    var b = getBridge();
    if (!b) return null;
    var os = b.onesignal || b.OneSignal || b.push || b.pushNotifications || null;
    if (!os) return null;
    try {
      if (os.getPlayerId) {
        try {
          var r = os.getPlayerId();
          if (r && typeof r.then === 'function') {
            var id = await r;
            if (id && id.length > 10) return id;
          } else if (typeof r === 'string' && r.length > 10) return r;
        } catch (e) {}
        // callback style
        try {
          var id2 = await new Promise(function (res) {
            var done = false;
            try {
              os.getPlayerId(function (id) { if (!done) { done = true; res(id || null); } });
            } catch (e) { res(null); }
            setTimeout(function () { if (!done) { done = true; res(null); } }, 3000);
          });
          if (id2 && id2.length > 10) return id2;
        } catch (e) {}
      }
      if (os.getSubscriptionId) {
        try {
          var r2 = os.getSubscriptionId();
          if (r2 && typeof r2.then === 'function') {
            var id3 = await r2;
            if (id3 && id3.length > 10) return id3;
          } else if (typeof r2 === 'string' && r2.length > 10) return r2;
        } catch (e) {}
      }
      if (os.getPushSubscriptionId) {
        try {
          var r3 = os.getPushSubscriptionId();
          if (r3 && typeof r3.then === 'function') {
            var id4 = await r3;
            if (id4 && id4.length > 10) return id4;
          }
        } catch (e) {}
      }
    } catch (e) {}
    return null;
  }
  async function tryWeb() {
    try {
      if (window.OneSignal && window.OneSignal.getSubscriptionId) {
        var id = await window.OneSignal.getSubscriptionId();
        if (id && id.length > 10) return id;
      }
      if (window.OneSignal && window.OneSignal.getPlayerId) {
        var id2 = await window.OneSignal.getPlayerId();
        if (id2 && id2.length > 10) return id2;
      }
    } catch (e) {}
    return null;
  }
  async function activate() {
    toastMsg('جاري تفعيل الإشعارات...');
    // 1. جرب نقرا من الذاكرة
    try {
      var saved = localStorage.getItem('afiaty_player_id') || localStorage.getItem('onesignal_player_id');
      if (saved && saved.length > 10) { saveId(saved); toastMsg('تم تفعيل الإشعارات ✅'); return saved; }
    } catch (e) {}
    // 2. اطلب اذن من المتصفح اذا موجود
    try {
      if ('Notification' in window && Notification.permission !== 'granted') {
        try { await Notification.requestPermission(); } catch (e) {}
      }
    } catch (e) {}
    // 3. جرب جسر Median
    var id = await tryMedian();
    if (id && saveId(id)) { toastMsg('تم تفعيل الإشعارات ✅'); return id; }
    // 4. جرب OneSignal مال الويب
    var id2 = await tryWeb();
    if (id2 && saveId(id2)) { toastMsg('تم تفعيل الإشعارات ✅'); return id2; }
    toastMsg('تعذر تفعيل الإشعارات: لم يتم العثور على Player ID - افتح التطبيق من Median واعد المحاولة');
    return null;
  }
  window.AfiatyEnableNotifications = activate;
  window.enableNotifications = activate;
  window.activateNotifications = activate;
  window.requestNotificationPermission = activate;
  window.enableOneSignal = activate;
  window.AfiatyGetPlayerId = async function () {
    var s = null;
    try { s = localStorage.getItem('afiaty_player_id'); } catch (e) {}
    if (s && s.length > 10) return s;
    var m = await tryMedian();
    if (m) { saveId(m); return m; }
    return null;
  };
  // حاول تلقائيا اول ما يفتح التطبيق
  async function auto() {
    for (var i = 0; i < 5; i++) {
      var id = await tryMedian();
      if (id && saveId(id)) break;
      var w = await tryWeb();
      if (w && saveId(w)) break;
      await new Promise(function (r) { setTimeout(r, 2000); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else setTimeout(auto, 1000);
})();
