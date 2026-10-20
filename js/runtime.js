(function (PES11) {
var Runtime = PES11.Runtime = PES11.Runtime || {};

// The implementation lives in js/runtime/*.
Runtime.init = function () {
  Runtime.Player.init();
  PES11.Core.setStatus('Descargando...');
};

Runtime.init();
})(window.PES11);
