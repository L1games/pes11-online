(function (PES11) {
var Runtime = PES11.Runtime = PES11.Runtime || {};

// Browsers stop requestAnimationFrame in a hidden tab, which would freeze
// the game. While the page is hidden, a worker timer posts ticks and each
// one runs one engine slice (psprecomp_web_background_tick in
// platform_web_main_loop.cpp). Timers inside a dedicated worker are not
// throttled like the page's own, and the frame pacer still keeps the game
// at real speed. rAF takes over again once the page is visible.
var TICK_MS = 8;
var WORKER_SOURCE =
  'var timer = null;\n' +
  'onmessage = function (event) {\n' +
  '  if (event.data === "start" && timer === null)\n' +
  '    timer = setInterval(function () { postMessage(0); }, ' + TICK_MS + ');\n' +
  '  if (event.data === "stop" && timer !== null) { clearInterval(timer); timer = null; }\n' +
  '};\n';

var worker = null;
var workerFailed = false;
// Without workers (blocked by the host), page timers still give about one
// turn per second.
var fallbackTimer = null;

function tick() {
  var module = Runtime.module;
  if (!document.hidden || !module || typeof module._psprecomp_web_background_tick !== 'function') return;
  module._psprecomp_web_background_tick();
}

function createWorker() {
  try {
    var url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
    var created = new Worker(url);
    created.onmessage = tick;
    created.onerror = function () { workerFailed = true; stop(); start(); };
    return created;
  } catch (e) {
    return null;
  }
}

function start() {
  if (!PES11.Settings.isGameStarted()) return;
  if (!worker && !workerFailed) {
    worker = createWorker();
    if (!worker) workerFailed = true;
  }
  if (worker && !workerFailed) {
    worker.postMessage('start');
    return;
  }
  if (fallbackTimer === null) fallbackTimer = setInterval(tick, TICK_MS);
}

function stop() {
  if (worker) worker.postMessage('stop');
  if (fallbackTimer !== null) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
}

// Also called once the game starts, in case the page is already hidden.
function sync() {
  if (document.hidden) start();
  else stop();
}

document.addEventListener('visibilitychange', sync);

Runtime.Background = {
  sync: sync
};
})(window.PES11);
