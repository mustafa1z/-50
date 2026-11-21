// afiaty-median-onesignal.js - نسخة فحص v4
(function () {
  function saveId(subId, oneId) {
    var id = subId || oneId;
    if (!id || id.length < 10) return false;
    try {
      localStorage.setItem('afiaty_player_id', id);
      localStorage.setItem('onesignal_player_id', id);
      localStorage.setItem('playerId', id);
      window.AfiatyPlayerId = id;
    } catch (e) {}
    return true;
  }
  function showDebug() {
    var m = window.median ? 'YES' : 'NO';
    var g = window.gonative ? 'YES' : 'NO';
    var mk = window.median ? Object.keys(window.median).join(',') : 'none';
    var ok = (window.median && window.median.onesignal) ? 'YES' : 'NO';
    var okk = (window.median && window.median.onesignal) ? Object.keys(window.median.onesignal).join(',') : 'none';
    var msg = 'median: ' + m + '\ngonative: ' + g + '\nmedian keys: ' + mk + '\nonesignal: ' + ok + '\nonesignal keys: ' + okk;
    try { alert(msg); } catch (e) { console.log(msg); }
    return msg;
  }
  window.median_onesignal_info = function (info) {
    try {
      if (!info) return;
      var subId = (info.subscription && info.subscription.id) || info.subscriptionId || null;
      var oneId = info.oneSignalId || info.oneSignalUserId || info.userId || null;
      if (subId || oneId) saveId(subId, oneId);
      else { try { localStorage.setItem('afiaty_onesignal_debug', JSON.stringify(info)); } catch (e) {} }
    } catch (e) {}
  };
  window.gonative_onesignal_info = window.median_onesignal_info;
  async function requestInfo() {
    try {
      var list = [];
      if (window.median && window.median.onesignal) list.push(window.median.onesignal);
      if (window.gonative && window.gonative.onesignal) list.push(window.gonative.onesignal);
      for (var i = 0; i < list.length; i++) {
        try { if (list[i].info) list[i].info(); } catch (e) {}
        try {
          if (list[i].onesignalInfo) {
            var p = list[i].onesignalInfo();
            if (p && p.then) { var info = await p; if (info) window.median_onesignal_info(info); }
          }
        } catch (e) {}
      }
    } catch (e) {}
    try { var s = localStorage.getItem('afiaty_player_id'); if (s && s.length > 10) return s; } catch (e) {}
    return null;
  }
  async function activate() {
    var dbg = showDebug();
    try {
      var saved = localStorage.getItem('afiaty_player_id');
      if (saved && saved.length > 10) { alert('تم تفعيل الإشعارات ✅\nID: ' + saved); return saved; }
    } catch (e) {}
    for (var k = 0; k < 4; k++) {
      var id = await requestInfo();
      if (id && id.length > 10) { alert('تم تفعيل الإشعارات ✅\nID: ' + id); return id; }
      await new Promise(function (r) { setTimeout(r, 2000); });
    }
    alert('تعذر تفعيل الإشعارات\n' + dbg + '\n\nاذا median=NO، يعني الجسر مو مفعل في Median. اذا onesignal=NO، يعني OneSignal مو مفعل او FCM مو مرفوع.');
    return null;
  }
  window.AfiatyEnableNotifications = activate;
  window.enableNotifications = activate;
  window.activateNotifications = activate;
  function auto() { requestInfo(); }
  document.addEventListener('median_library_ready', auto);
  window.addEventListener('median_library_ready', auto);
  document.addEventListener('gonative_library_ready', auto);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(auto, 2000); });
  else setTimeout(auto, 2000);
})();
