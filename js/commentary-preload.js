(function (PES11) {
// A small sidecar lists the physical PAK blocks used by speech. PAKs without
// a matching list download completely before gameplay instead. The blocks are
// fetched by PES11.PakDownload, which owns the range cache writes.
var BLOCK_BYTES = 256 * 1024; // WebPakSource / platform_range_fetch.js
var STALL_MS = 20000;

function valid(manifest, pak) {
  var tail = pak.total - pak.indexBytes;
  var header = Array.prototype.map.call(pak.meta.subarray(0, 64), function (byte) {
    return ('0' + byte.toString(16)).slice(-2);
  }).join('');
  if (!manifest || manifest.version !== 1 || manifest.blockBytes !== BLOCK_BYTES ||
      manifest.pakBytes !== pak.total || manifest.tailOffset !== tail || manifest.headerHex !== header ||
      !Array.isArray(manifest.archives) || !Array.isArray(manifest.ranges) ||
      !manifest.archives.every(function (name) { return typeof name === 'string' && /^[a-z]sound\.cpk$/i.test(name); }) ||
      (manifest.archives.length === 0 && manifest.ranges.length !== 0) ||
      (manifest.archives.length !== 0 && manifest.ranges.length === 0)) return false;
  var previousEnd = 0;
  return manifest.ranges.every(function (range) {
    if (!Array.isArray(range) || range.length !== 2) return false;
    var begin = range[0], size = range[1], end = begin + size;
    if (!Number.isSafeInteger(begin) || !Number.isSafeInteger(size) || size <= 0 ||
        begin < previousEnd || begin < 0 || begin >= tail || begin % BLOCK_BYTES !== 0 ||
        end > Math.min(pak.total, Math.ceil(tail / BLOCK_BYTES) * BLOCK_BYTES) ||
        (size % BLOCK_BYTES !== 0 && end !== pak.total)) return false;
    previousEnd = end;
    return true;
  });
}

function readManifest(url, pak) {
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, STALL_MS);
  return fetch(url, {cache: 'no-store', signal: controller.signal}).then(function (response) {
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  }).then(function (manifest) {
    return valid(manifest, pak) ? manifest.ranges : null;
  }).catch(function () { return null; }).then(function (ranges) {
    clearTimeout(timer);
    return ranges;
  });
}

function findRanges(pak) {
  var sidecar = new URL(pak.url, window.location.href);
  sidecar.pathname += '.commentary.json';
  if (PES11.Config.commentaryManifest && PES11.Core.sources.pak === PES11.Config.pak) {
    return readManifest(PES11.Config.commentaryManifest, pak).then(function (ranges) {
      return ranges !== null ? ranges : readManifest(sidecar.href, pak);
    });
  }
  return readManifest(sidecar.href, pak);
}

function load(pak) {
  if (!pak) return Promise.resolve();
  var fullPak = false;
  PES11.Core.setStatus('Preparando descarga de relatos...');
  return PES11.PakDownload.preload(pak, function () {
    return findRanges(pak).then(function (ranges) {
      fullPak = ranges === null;
      if (fullPak) PES11.Core.pushLine('[commentary-preload] No matching manifest; caching the complete PAK.', false);
      return ranges;
    });
  }, function (done, total) {
    var label = fullPak ? 'Precargando juego completo para los relatos' : 'Precargando relatos';
    if (!PES11.RangeCache.isPersistent()) label += ' en memoria';
    // Core.setStatus recognizes this byte fraction and updates its progress bar.
    PES11.Core.setStatus(label + ': ' + (done / 1048576).toFixed(1) + ' / ' +
      (total / 1048576).toFixed(1) + ' MB (' + done + '/' + total + ')');
  });
}

PES11.CommentaryPreload = {load: load};
})(window.PES11);
