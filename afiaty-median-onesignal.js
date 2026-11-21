// afiaty-median-onesignal.js - نسخة Median الصحيحة v3
(function () {
  function saveId(subId, oneId, raw) {
    var id = subId || oneId;
    if (!id || id.length < 10) return false;
    try {
      localStorage.setItem('afiaty_player_id', id);
      localStorage.setItem('onesignal_player_id', id);
      localStorage.setItem('playerId', id);
      if (oneId) localStorage.setItem('afiaty_onesignal_id', oneId);
      if (subId) localStorage.setItem('afiaty_subscription_id', subId);
      window.AfiatyPlayerId = id;
      window.AfiatyOneSignalInfo = raw || null;
    } catch (e) {}
    console.log('Afiaty OneSignal:', id);
    return true;
  }
  function toastMsg(m) {
    try { if (window.toast) window.toast(m); else console.log(m); } catch (e) { console.log(m); }
  }
  window.median_onesignal_info = function (info) {
    try {
      if (!info) return;
      var subId = (info.subscription && info.subscription.id) || info.subscriptionId || info.subscription_id || null;
      var oneId = info.oneSignalId || info.oneSignalUserId || info.userId || info.oneSignal_id || null;
      if (subId || oneId) saveId(subId, oneId, info);
      else { try { localStorage.setItem('afiaty_onesignal_debug', JSON.stringify(info)); } catch (e) {} }
    } catch (e) {}
  };
  window.gonative_onesignal_info = window.median_onesignal_info;
  async function requestInfo() {
    try {
      var bridges = [];
      if (window.median && window.median.onesignal) bridges.push(window.median.onesignal);
      if (window.gonative && window.gonative.onesignal) bridges.push(window.gonative.onesignal);
      for (var i = 0; i < bridges.length; i++) {
        var os = bridges[i];
        try { if (os.info) os.info(); } catch (e) {}
        try {
          if (os.onesignalInfo) {
            var p = os.onesignalInfo();
            if (p && p.then) { var info = await p; if (info) window.median_onesignal_info(info); }
          }
        } catch (e) {}
      }
    } catch (e) {}
    try { var s = localStorage.getItem('afiaty_player_id'); if (s && s.length > 10) return s; } catch (e) {}
    return null;
  }
  async function activate() {
    toastMsg('جاري تفعيل الإشعارات...');
    try {
      var saved = localStorage.getItem('afiaty_player_id');
      if (saved && saved.length > 10) { toastMsg('تم تفعيل الإشعارات ✅'); return saved; }
    } catch (e) {}
    try { if ('Notification' in window && Notification.permission !== 'granted') { try { await Notification.requestPermission(); } catch (e) {} } } catch (e) {}
    for (var k = 0; k < 6; k++) {
      var id = await requestInfo();
      if (id && id.length > 10) { toastMsg('تم تفعيل الإشعارات ✅'); return id; }
      await new Promise(function (r) { setTimeout(r, 2000); });
    }
    if (!window.median && !window.gonative) toastMsg('تعذر: جسر Median غير موجود');
    else toastMsg('تعذر: Median لم يرجع ID - تأكد ان FCM مرفوع في OneSignal');
    return null;
  }
  window.AfiatyEnableNotifications = activate;
  window.enableNotifications = activate;
  window.activateNotifications = activate;
  window.AfiatyGetPlayerId = async function () {
    await requestInfo();
    try { return localStorage.getItem('afiaty_player_id'); } catch (e) { return null; }
  };
  async function auto() {
    for (var i = 0; i < 5; i++) {
      var id = await requestInfo();
      if (id && id.length > 10) break;
      await new Promise(function (r) { setTimeout(r, 2000); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else setTimeout(auto, 1000);
})();
