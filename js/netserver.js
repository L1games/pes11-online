(function (PES11) {
function normalize(value) {
  var server = String(value || '').trim();
  if (!server || server.toLowerCase() === 'off') return server.toLowerCase();
  if (server.indexOf('://') < 0) {
    var slash = server.indexOf('/');
    var authority = slash < 0 ? server : server.slice(0, slash);
    var path = slash < 0 ? '/pes11' : server.slice(slash);
    var hostname = authority.replace(/:\d+$/, '');
    if (authority === hostname) authority += ':8765';
    server = (/^(localhost|127\..*)$/.test(hostname) ? 'ws://' : 'wss://') + authority + path;
  }
  var url;
  try { url = new URL(server); } catch (error) { throw new Error('Dirección del servidor inválida. Usá ws://host:puerto/pes11 o wss://host/pes11.'); }
  if ((url.protocol !== 'ws:' && url.protocol !== 'wss:') || !url.hostname || url.username || url.password)
    throw new Error('El servidor debe ser una dirección ws:// o wss:// sin usuario ni contraseña.');
  if (server.indexOf('#') >= 0)
    throw new Error('La dirección WebSocket no admite fragmentos (#). Usá ws://host:puerto/pes11 o wss://host/pes11.');
  return server;
}
function configured(settingsValue) {
  var params = new URLSearchParams(window.location.search);
  return normalize(params.get('net_server') || params.get('server') || params.get('sv') || settingsValue || PES11.Config.netServer);
}
function redact(value) {
  return String(value).replace(/\b(token|pair)=[^&\s]+/gi, '$1=***');
}
// Public servers: relay channels 1..CHANNELS (the relay has 7).
var CHANNELS = 5;
// Server (relay channel) forced with ?channel=; 0 = chosen automatically.
function channel() {
  var values = new URLSearchParams(window.location.search).getAll('channel');
  if (values.length > 1 || (values.length && !/^[1-5]$/.test(values[0])))
    throw new Error('El servidor debe ser un número del 1 al 5.');
  return values.length ? Number(values[0]) : 0;
}
PES11.NetServer = { configured: configured, redact: redact, channel: channel, CHANNELS: CHANNELS };
})(window.PES11);
