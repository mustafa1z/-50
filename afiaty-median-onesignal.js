// Afiaty - Median OneSignal v5
function AfiatySaveOneSignal(info) {
  try {
    if (!info) return;
    var sid = '';
    var uid = '';
    if (info.subscription && info.subscription.id) sid = info.subscription.id;
    if (!sid && info.oneSignalUserId) sid = info.oneSignalUserId;
    if (info.oneSignalId) uid = info.oneSignalId;
    if (!uid && info.oneSignalUserId) uid = info.oneSignalUserId;
    if (sid) localStorage.setItem('afiaty_player_id', sid);
    if (uid) localStorage.setItem('afiaty_onesignal_id', uid);
    console.log('Afiaty OneSignal:', uid, sid);
  } catch (e) {}
}

function median_onesignal_info(info) {
  AfiatySaveOneSignal(info);
}
window.median_onesignal_info = median_onesignal_info;

setTimeout(function() {
  try {
    if (window.median && window.median.onesignal && window.median.onesignal.info) {
      var p = window.median.onesignal.info();
      if (p && p.then) p.then(AfiatySaveOneSignal).catch(function() {});
    }
  } catch (e) {}
}, 1500);

window.AfiatyEnableNotif = async function() {
  try {
    if (window.median && window.median.onesignal && window.median.onesignal.info) {
      var info = await window.median.onesignal.info();
      AfiatySaveOneSignal(info);
    }
  } catch (e) {}
  return true;
};
