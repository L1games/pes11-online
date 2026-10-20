(function (PES11) {
var Runtime = PES11.Runtime = PES11.Runtime || {};
// Renderer choice before callMain(), through the shared
// platform_renderer.js (window.PSPRECOMPRENDERER) and the psprecomp_*
// renderer exports. Report codes: 0 software, 2 WebGL2, 3 WebGPU.
var startedReport = null;
var preparedReason = '';
var recoveryKey = 'pes11.renderer-fallback';
var names = { 0: 'Software', 2: 'WebGL2', 3: 'WebGPU' };

function requested() {
  var value = PES11.Settings.get('render', 'backend');
  return value === 'webgl2' || value === 'webgpu' ? value : 'auto';
}
function capabilities(module) {
  return module && typeof module._psprecomp_renderer_capabilities === 'function'
    ? module._psprecomp_renderer_capabilities() : 2;
}
function webgpuSupported(module) {
  return (capabilities(module) & 4) !== 0 && !!(window.navigator && window.navigator.gpu);
}
function updateControls(module) {
  var select = document.getElementById('rendererSelect');
  var note = document.getElementById('rendererNote');
  var supported = webgpuSupported(module);
  Array.prototype.forEach.call(select.options, function (option) {
    if (option.value === 'webgpu') option.disabled = !supported;
  });
  if (startedReport) {
    note.textContent = 'En uso: ' + (names[startedReport.selected] || 'Desconocido') +
      (startedReport.reason ? '. ' + startedReport.reason : '') +
      '. El cambio se aplica al reiniciar el juego.';
  } else {
    note.textContent = supported ? 'El cambio de renderer se aplica al reiniciar el juego.'
      : 'WebGPU no está disponible en este navegador o en esta versión del motor.';
  }
}
// A WebGPU failure at startup reloads once with WebGL2 (retryWithWebGL2).
function takeRecovery() {
  try {
    var saved = window.sessionStorage && window.sessionStorage.getItem(recoveryKey);
    if (!saved) return null;
    window.sessionStorage.removeItem(recoveryKey);
    return JSON.parse(saved).reason || 'WebGPU no pudo iniciar.';
  } catch (e) { return null; }
}
function prepare(module) {
  var choice = requested();
  var recovery = takeRecovery();
  if (recovery) choice = 'webgl2';
  else if (choice !== 'webgl2' && !webgpuSupported(module)) choice = 'webgl2';
  return window.PSPRECOMPRENDERER.prepare(module, choice).then(function (report) {
    preparedReason = recovery || report.reason || '';
    if (preparedReason) PES11.Core.pushLine('[renderer] ' + preparedReason, false);
    return report;
  });
}
function onStarted(report) {
  report.reason = report.reason || preparedReason;
  startedReport = report;
  if (report.selected === 2) {
    try { window.sessionStorage.removeItem(recoveryKey + '.used'); } catch (e) {}
  }
  updateControls(window.Module);
}
function retryWithWebGL2(reason) {
  try {
    if (window.sessionStorage.getItem(recoveryKey + '.used') === '1') return false;
    window.sessionStorage.setItem(recoveryKey + '.used', '1');
    window.sessionStorage.setItem(recoveryKey, JSON.stringify({ reason: reason }));
    window.location.reload();
    return true;
  } catch (e) {
    PES11.Core.pushLine('No se pudo preparar la recuperación. Elegí WebGL2 y recargá la página.', true);
    return false;
  }
}
function onLost(report) {
  PES11.Core.pushLine('Renderer detenido: ' + report.reason, true);
  PES11.Core.setStatus('Renderer detenido. Reiniciá con WebGL2.');
  var button = document.getElementById('rendererRetry');
  button.hidden = false;
  button.onclick = function () {
    if (PES11.Settings.set('render', 'backend', 'webgl2')) window.location.reload();
  };
  if (report.startup) retryWithWebGL2(report.reason);
}

Runtime.Renderer = {
  updateControls: updateControls,
  prepare: prepare,
  onStarted: onStarted,
  onLost: onLost
};
})(window.PES11);
