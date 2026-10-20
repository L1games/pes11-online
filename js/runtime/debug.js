(function (PES11) {
var Runtime = PES11.Runtime = PES11.Runtime || {};
var RTC_MODES = ['reliable', 'timed', 'unreliable', 'off'];

function setEnv(module, name, value) {
  module.ccall('pes11_set_env', null, ['string', 'string'], [name, String(value)]);
}

// Native switches for the next main(): the saved settings first, then
// ?env.NAME=value from the URL (e.g. ?env.PSPRECOMP_TRACE_GE_SUMMARY=1),
// which wins.
function apply(module) {
  var params = new URLSearchParams(window.location.search);
  var relay = PES11.NetServer.configured(PES11.Settings.get('net', 'server'));
  PES11.NetServer.channel();
  var room = PES11.Online ? PES11.Online.selection().room || 'wait' : params.get('room') || 'test';
  if (PES11.Online) relay = PES11.Online.gameServerUrl(relay);
  var trace = params.get('trace_net') === '1';
  // WebRTC to the players of the salón (pes11_webrtc.js); the relay stays the fallback.
  var rtc = params.get('rtc') || PES11.Settings.get('net', 'rtc') || 'reliable';
  if (RTC_MODES.indexOf(rtc) < 0) throw new Error('rtc admite ' + RTC_MODES.join(', ') + '.');
  module.pes11RtcMode = rtc;
  module.ccall('pes11_set_net_trace', null, ['number'], [trace ? 1 : 0]);
  if (trace) setEnv(module, 'PSPRECOMP_HLE_HISTOGRAM', '1');
  module.ccall('pes11_set_adhoc_server', null, ['string', 'string'], [relay === 'off' ? '' : relay, room]);
  if (relay && relay !== 'off')
    PES11.Core.pushLine('[net] PES11 relay: ' + PES11.NetServer.redact(relay) + ' room=' + room + ' rtc=' + rtc, false);
  var settings = PES11.Settings.environment();
  Object.keys(settings).forEach(function (name) { setEnv(module, name, settings[name]); });
  new URLSearchParams(window.location.search).forEach(function (value, key) {
    if (key.indexOf('env.') !== 0 || key.length <= 4) return;
    setEnv(module, key.substring(4), value);
    PES11.Core.pushLine('[env] ' + key.substring(4) + '=' + value, false);
  });
}

Runtime.Debug = {
  apply: apply
};
})(window.PES11);
