(function (PES11) {
// --- Data sources ---------------------------------------------------
// Emscripten asks for its side files by name; the URLs come from
// PES11.Config (js/config.js) through PES11.Core.sources.
function engineUrl(path, prefix) {
  if (/\.wasm$/.test(path)) return PES11.Core.sources.wasm;
  if (/\.data$/.test(path)) return PES11.Core.sources.data;
  return (prefix || '') + path;
}

// pes11.pak (extratools/PES 2011/CPKTools/cpk_pack.py) streams through Range
// requests like the .cpk files. Only its header and tail (block table +
// index) are fetched up front, into /game/pes11.pak.meta for
// platform_web_pak_source.cpp. ?pak=off keeps the loose .cpk files,
// ?pak=<url> loads another pak.
var PAK_HEADER_BYTES = 64;
var PAK_META_PATH = '/game/pes11.pak.meta';
// Metadata requests are retried with exponential backoff (same statuses as
// platform_range_fetch.js); a transfer idle for STALL_MS is aborted and retried.
var METADATA_MAX_ATTEMPTS = 6;
var METADATA_STALL_MS = 20000;
var METADATA_MAX_RETRY_DELAY_MS = 16000;
function isRetryableStatus(status) {
  return status === 0 || status === 408 || status === 425 || status === 429 || status >= 500;
}
function fetchRangeOnce(url, begin, end) {
  var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var timer = controller ? setTimeout(function () { controller.abort(); }, METADATA_STALL_MS) : 0;
  return fetch(url, {
    headers: { Range: 'bytes=' + begin + '-' + end },
    cache: 'no-store',
    signal: controller ? controller.signal : undefined
  }).then(function (response) {
    if (response.status !== 206) {
      // A 200 would be the whole file: stop it instead of downloading it.
      if (response.body) response.body.cancel().catch(function () {});
      var error = new Error('HTTP ' + response.status);
      error.status = response.status;
      throw error;
    }
    var total = parseInt((response.headers.get('Content-Range') || '').split('/')[1], 10);
    return response.arrayBuffer().then(function (bytes) {
      return { bytes: new Uint8Array(bytes), total: total };
    });
  }).then(function (result) {
    clearTimeout(timer);
    return result;
  }, function (error) {
    clearTimeout(timer);
    throw error;
  });
}
function fetchRange(url, begin, end, attempt) {
  attempt = attempt || 0;
  return fetchRangeOnce(url, begin, end).catch(function (error) {
    var status = typeof error.status === 'number' ? error.status : 0;
    if (!isRetryableStatus(status) || attempt + 1 >= METADATA_MAX_ATTEMPTS) throw error;
    var delay = Math.min(1000 * Math.pow(2, attempt), METADATA_MAX_RETRY_DELAY_MS);
    var reason = error.name === 'AbortError' ? 'stalled for ' + METADATA_STALL_MS + ' ms' : String(error);
    PES11.Core.pushLine('[pak] bytes ' + begin + '-' + end + ': ' + reason + ', retry ' + (attempt + 1) +
                        ' in ' + delay + ' ms', false);
    PES11.Runtime.Downloads.showWarning('Conexión lenta, reintentando la descarga del juego...');
    return new Promise(function (resolve) { setTimeout(resolve, delay); }).then(function () {
      return fetchRange(url, begin, end, attempt + 1);
    });
  });
}
// Header + tail of the pak, fetched as soon as the page loads (js/app.js) so
// it is ready by the time the player clicks.
// Resolves to null (no pak), { error } or { url, total, meta, indexBytes }.
var pakMetadata = null;
function fetchPakMetadata() {
  var setting = PES11.Core.sources.pak;
  if (setting === 'off') return Promise.resolve(null);
  var url = setting || '/PSP_GAME/USRDIR/pes11.pak';
  return fetchRange(url, 0, PAK_HEADER_BYTES - 1).then(function (head) {
    var magic = String.fromCharCode.apply(null, head.bytes.subarray(0, 8));
    if (magic !== 'PES6PAK2') throw new Error('not a PES6PAK2 file');
    // u64 block_table_offset: the block table and the index run from there to EOF.
    var view = new DataView(head.bytes.buffer);
    function u64(offset) { return view.getUint32(offset, true) + view.getUint32(offset + 4, true) * 4294967296; }
    var tail = u64(52);
    // Cross-origin hosts that do not expose Content-Range hide the size: the
    // index (index_offset + index_csize) ends the file.
    if (!isFinite(head.total)) head.total = Math.max(u64(28) + u64(36), tail + view.getUint32(24, true) * 16);
    if (tail < PAK_HEADER_BYTES || tail >= head.total) throw new Error('bad header');
    return fetchRange(url, tail, head.total - 1).then(function (rest) {
      var meta = new Uint8Array(PAK_HEADER_BYTES + rest.bytes.length);
      meta.set(head.bytes);
      meta.set(rest.bytes, PAK_HEADER_BYTES);
      return { url: url, total: head.total, meta: meta, indexBytes: rest.bytes.length };
    });
  }).then(function (pak) {
    PES11.Runtime.Downloads.clearWarning();
    return pak;
  }, function (e) {
    PES11.Runtime.Downloads.clearWarning();
    // A failed attempt is not kept: the next call downloads again.
    pakMetadata = null;
    return { error: e };
  });
}
// Announces the pak to the engine before callMain(). done(pak) runs with the
// metadata, or with nothing when the game streams the loose .cpk files.
function loadPakMetadata(done, failed) {
  if (!pakMetadata) pakMetadata = fetchPakMetadata();
  pakMetadata.then(function (pak) {
    if (!pak) { done(); return; }
    if (pak.error) {
      // A pak URL set in PES11.Config has no loose .cpk files next to it:
      // starting without it would leave the game on a black screen.
      if (PES11.Core.sources.pak) {
        PES11.Core.pushLine('pes11.pak download failed (' + PES11.Core.sources.pak + '): ' +
                            pak.error.message, true);
        throw pak.error;
      }
      PES11.Core.pushLine('No pes11.pak (' + pak.error.message + '), streaming the .cpk files.', false);
      done();
      return;
    }
    window.Module.FS.writeFile(PAK_META_PATH, pak.meta);
    window.Module.ccall('pes11_set_web_pak', null, ['string', 'number', 'string'],
                        [pak.url, pak.total, PAK_META_PATH]);
    PES11.Core.pushLine('Game data: ' + pak.url + ' (' + Math.round(pak.total / 1048576) + ' MB, index ' +
                        Math.round(pak.indexBytes / 1024) + ' KB)', false);
    done(pak);
  }).catch(function (error) {
    if (failed) failed(error);
    else PES11.Runtime.Downloads.showError('No se pudieron descargar los datos del juego (' +
                                           error.message + '). Recargá la página.');
  });
}

function formatBytesMB(bytes) { return (bytes / 1048576).toFixed(bytes >= 104857600 ? 0 : 1) + ' MB'; }

// Game data ranges the engine keeps in the Cache API (platform_range_fetch.js
// reads Module.rangeCacheName); this row shows and clears them.
var RANGE_CACHE_NAME = 'pes11-ranges-v1';
var downloadsStatusEl = document.getElementById('downloadsStatus');
function showDownloadsUsage() {
  if (!navigator.storage || !navigator.storage.estimate) {
    downloadsStatusEl.textContent = '';
    return;
  }
  navigator.storage.estimate().then(function (estimate) {
    downloadsStatusEl.textContent = 'En este navegador: ' + formatBytesMB(estimate.usage || 0);
  }).catch(function () {});
}
document.getElementById('clearDownloads').onclick = function () {
  Promise.all([
    PES11.RangeCache.clear(),
    typeof caches !== 'undefined' ? caches.delete(PES11.Runtime.Loader.engineCacheName) : Promise.resolve()
  ]).then(function () {
    downloadsStatusEl.textContent = 'Borrados. Se vuelven a bajar a medida que el juego los use.';
    setTimeout(showDownloadsUsage, 1500);
  });
};
showDownloadsUsage();

PES11.Data = {
  rangeCacheName: RANGE_CACHE_NAME,
  engineUrl: engineUrl,
  loadPakMetadata: loadPakMetadata,
  prefetchPakMetadata: function () {
    if (!pakMetadata) pakMetadata = fetchPakMetadata();
    return pakMetadata;
  }
};
})(window.PES11);
