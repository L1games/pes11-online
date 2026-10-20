(function (PES11) {
// The page and the engine must share this store, including on ordinary HTTP
// where Cache API is unavailable and compressed bytes stay in session memory.
var opened = null;
var persistent = false;
var blocks = new Map();
var memory = {
  keys: function () {
    return Promise.resolve(Array.from(blocks.keys(), function (url) { return { url: url }; }));
  },
  match: function (key) {
    var bytes = blocks.get(typeof key === 'string' ? key : key.url);
    return Promise.resolve(bytes ? new Response(bytes) : undefined);
  },
  put: function (key, response) {
    return response.arrayBuffer().then(function (bytes) {
      blocks.set(typeof key === 'string' ? key : key.url, bytes);
    });
  },
  delete: function (key) {
    return Promise.resolve(blocks.delete(typeof key === 'string' ? key : key.url));
  }
};

function useMemory() { persistent = false; return memory; }

function open() {
  if (opened) return opened;
  try {
    if (window.isSecureContext && typeof caches !== 'undefined') {
      opened = caches.open(PES11.Data.rangeCacheName).then(function (cache) {
        persistent = true;
        return cache;
      }).catch(useMemory);
    } else {
      opened = Promise.resolve(useMemory());
    }
  } catch (error) { opened = Promise.resolve(useMemory()); }
  return opened;
}

function bindEngine(module) {
  module['rangeCacheName'] = PES11.Data.rangeCacheName;
  module['rangeCacheKeyOrigin'] = 'https://pes11-range.invalid';
  module['openRangeCache'] = open;
  // Also bind existing non-modular builds when only the page was updated.
  var legacy = window.PSPRECOMPRANGE;
  if (legacy && typeof legacy.openCache === 'function') legacy.openCache = open;
}

function clear() {
  return open().then(function (cache) {
    return cache.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) { return cache.delete(key); }));
    });
  });
}

PES11.RangeCache = { open: open, bindEngine: bindEngine, clear: clear,
  isPersistent: function () { return persistent; } };
})(window.PES11);
