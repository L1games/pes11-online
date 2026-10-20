(function (PES11) {
// Savedata lives under /game/ms0 (see platform_filesystem.cpp); mounting an
// IDBFS there and pulling it down before the game starts is what makes
// saves survive a reload. Writes land in the mount immediately (same as
// MEMFS) and are pushed back to IndexedDB by WebSavedataHost
// (platform_web_savedata.cpp) after every save.
// Mounted as soon as the runtime is ready so saves can be managed before
// the game starts.
var storageReady = false;
function mountSaveStorage(done) {
  try {
    var FS = window.Module.FS, IDBFS = window.Module.IDBFS;
    FS.mkdirTree('/game/ms0');
    FS.mount(IDBFS, {}, '/game/ms0');
    FS.syncfs(true, function (err) {
      if (err) PES11.Core.pushLine('Save storage load failed: ' + err, true);
      done();
    });
  } catch (e) {
    PES11.Core.pushLine('Save storage unavailable, saves will not persist: ' + e, true);
    done();
  }
}

PES11.Storage = {
  isReady: function () { return storageReady; },
  setReady: function (ready) { storageReady = !!ready; },
  mount: mountSaveStorage
};
})(window.PES11);
