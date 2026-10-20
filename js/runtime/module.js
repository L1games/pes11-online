(function (PES11) {
var Runtime = PES11.Runtime = PES11.Runtime || {};

var Module = {
  canvas: PES11.Core.elements.canvas,
  noInitialRun: true,

  print: function () {
    PES11.Core.pushLine(Array.prototype.join.call(arguments, ' '), false);
  },

  printErr: function () {
    var text = Array.prototype.join.call(arguments, ' ');
    PES11.Core.pushLine(text, true);
    console.error(text);
  },

  setStatus: PES11.Core.setStatus,
  locateFile: PES11.Data.engineUrl,
  instantiateWasm: Runtime.Loader.instantiateEngine,
  getPreloadedPackage: Runtime.Loader.takeDataPackage,
  totalDependencies: 0,
  // Cache identity for game data ranges kept by platform_range_fetch.js.
  rangeCacheName: PES11.Data.rangeCacheName,
  rangeCacheKeyOrigin: 'https://pes11-range.invalid',

  monitorRunDependencies: function (left) {
    this.totalDependencies = Math.max(this.totalDependencies, left);
    PES11.Core.setStatus(left
      ? 'Preparando... (' + (this.totalDependencies - left) + '/' + this.totalDependencies + ')'
      : 'Iniciando...');
  },

  onRuntimeInitialized: function () {
    PES11.Core.setStatus('Cargando partidas guardadas...');
    PES11.Storage.mount(function () {
      PES11.Storage.setReady(true);
      Runtime.Player.showStartChoice();
      PES11.Settings.render();
      PES11.Settings.applyVolume(PES11.Settings.volume());
      PES11.Settings.setEnabled(true);
      PES11.Saves.render();
      Runtime.Renderer.updateControls(Module);
    });
    // With General > Descargas on, the whole pak downloads in the background
    // once the engine is in.
    PES11.Data.prefetchPakMetadata().then(PES11.PakDownload.offer);
  },

  // Called from C++ (report_captured_binding in pes11_app_web.cpp).
  onBindingCaptured: PES11.Controls.Bindings.handleCaptured,
  // Called from C++ (platform_web_savedata.cpp).
  onSavedataDialog: PES11.Savedata.openDialog,
  onSavedataResult: PES11.Savedata.showResult,
  // Called from C++ (platform_web_renderer.cpp).
  onRendererStarted: Runtime.Renderer.onStarted,
  onRendererLost: Runtime.Renderer.onLost,
  // Called from C++ (pes11_adhoc_config.cpp): the game opened or closed its
  // Ad hoc salón, the players it is matched with and the name it advertises.
  onAdhocHosting: function (hosting) { PES11.Online.Match.hostingChanged(hosting); },
  onAdhocPeers: function (macs) { PES11.Online.Match.peersChanged(macs); },
  onAdhocName: function (name) { PES11.Online.Nick.fromGame(name); },
  // Called from platform_range_fetch.js while game data downloads.
  onRangeFetchActivity: Runtime.Downloads.onActivity,
  onRangeFetchError: Runtime.Downloads.onFetchError
};

// Emscripten's generated PES11Recomp.js expects this exact global.
PES11.RangeCache.bindEngine(Module);
window.Module = Module;
Runtime.module = Module;
})(window.PES11);
