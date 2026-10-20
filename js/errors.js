(function (PES11) {
// An EM_ASM lookup that fails means PES11Recomp.js and the .wasm come from
// different builds (a stale cached loader after an update).
function reportBuildMismatch(text) {
  if (!/ASM_CONSTS/.test(text)) return;
  PES11.Runtime.Downloads.showError('El juego se actualizó y el navegador tiene una versión vieja. ' +
                                    'Recargá con Ctrl+F5.');
}
window.onerror = function (message, source, lineno, colno, error) {
  var location = source ? ' @ ' + source + ':' + lineno + ':' + colno : '';
  var stack = error && error.stack ? '\n' + error.stack : '';
  PES11.Core.pushLine('Exception: ' + message + location + stack, true);
  reportBuildMismatch(String(message));
  PES11.Core.setStatus('Error: revisá el log');
};
// A repeated rejected Promise can otherwise flood both our DOM log and
// DevTools, which is measurable on the main browser thread. Keep the
// first rejection (including its stack) and collapse identical repeats
// into a cheap counter.
var rejectionLast = '';
var rejectionRepeats = 0;
function flushRejectionRepeats() {
  if (!rejectionRepeats) return;
  PES11.Core.pushLine('Unhandled rejection repeated ' + rejectionRepeats + ' more times: ' + rejectionLast, true);
  rejectionRepeats = 0;
}
window.onunhandledrejection = function (e) {
  var reason = e.reason;
  var message = reason && reason.message ? reason.message : String(reason);
  if (message === rejectionLast) {
    rejectionRepeats++;
    if ((rejectionRepeats & 63) === 0) flushRejectionRepeats();
  } else {
    flushRejectionRepeats();
    rejectionLast = message;
    var stack = e.reason && e.reason.stack ? '\n' + e.reason.stack : '';
    PES11.Core.pushLine('Unhandled rejection: ' + message + stack, true);
    reportBuildMismatch(message);
  }
  // The first instance is already in the log with its stack.
  if (e.preventDefault) e.preventDefault();
};
PES11.Errors = {};
})(window.PES11);
