(function (PES11) {
// Nothing is downloaded on a browser that cannot run the engine.
if (!PES11.Compat.report(PES11.Compat.check())) {
  PES11.Ads.load();
  return;
}

// The pak index downloads while the engine does.
PES11.Data.prefetchPakMetadata();

// Emscripten reads window.Module, created by runtime/module.js.
PES11.Runtime.Loader.loadEngineScript();
})(window.PES11);
