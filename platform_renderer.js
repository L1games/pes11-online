(function () {
  'use strict';
  var pending = new WeakMap();
  function prepare(module, preference) {
    if (pending.has(module)) return pending.get(module);
    function apply(report) {
      if (module._psprecomp_apply_renderer_selection) module._psprecomp_apply_renderer_selection(report.selected);
      return report;
    }
    var capabilities = module._psprecomp_renderer_capabilities ? module._psprecomp_renderer_capabilities() : 2;
    var wanted = preference === 'software' ? 0 : preference === 'webgl2' || preference === 'opengl' ? 2 : 3;
    if (wanted === 3 && (!(capabilities & 4) || !window.navigator.gpu)) wanted = 2;
    if (!module._psprecomp_prepare_renderer) return Promise.resolve(apply({ selected: wanted === 0 ? 0 : 2, reason: '' }));
    var promise = new Promise(function (resolve) {
      var settled = false;
      var timer = setTimeout(function () {
        if (module._psprecomp_cancel_renderer_preparation) module._psprecomp_cancel_renderer_preparation();
        finish({ selected: 2, reason: 'Renderer preparation timed out.' });
      }, 15000);
      function finish(report) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(apply(report));
      }
      module.onRendererPrepared = finish;
      try { module._psprecomp_prepare_renderer(wanted); }
      catch (error) {
        if (module._psprecomp_cancel_renderer_preparation) module._psprecomp_cancel_renderer_preparation();
        finish({ selected: 2, reason: String(error) });
      }
    });
    pending.set(module, promise);
    promise.then(function () { pending.delete(module); });
    return promise;
  }
  function recover(options) {
    try {
      if (options.storage.getItem(options.key) !== '1') {
        options.storage.setItem(options.key, '1');
        options.reload();
        return true;
      }
    } catch (_) {}
    options.onManual();
    return false;
  }
  window.PSPRECOMPRENDERER = { prepare: prepare, recover: recover };
})();
