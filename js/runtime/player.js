(function (PES11) {
var Runtime = PES11.Runtime = PES11.Runtime || {};
var module = Runtime.module;
var started = false;
var initialized = false;

var stageEl = document.getElementById('stage');
var nowPlayingEl = document.getElementById('nowPlaying');
var startButtonEl = document.getElementById('startGame');

function showStartChoice() {
  PES11.Ads.load();
  PES11.Core.elements.overlay.classList.add('ready');
  PES11.Core.elements.startChoice.hidden = false;
  startButtonEl.focus({ preventScroll: true });
}

function setNowPlaying(text) {
  nowPlayingEl.textContent = text;
}

// Matches AudioSink::kSampleRate (platform_audio_sink.hpp). The AudioWorklet
// output (platform_audio_worklet.js) plays through Module.SDL2.audioContext
// and falls back to SDL without it. At the guest rate SDL skips
// SDL_ResampleAudio on the main thread and the browser resamples to the
// device on its audio thread instead.
var GUEST_AUDIO_RATE = 44100;

function createGuestRateAudioContext() {
  var Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return;
  var SDL2 = module.SDL2 = module.SDL2 || {};
  if (SDL2.audioContext) return;
  try { SDL2.audioContext = new Context({ sampleRate: GUEST_AUDIO_RATE }); }
  catch (e) { return; } // Without sampleRate support SDL creates its own context.
  // SDL only arms its resume listeners for a context it created itself.
  ['keydown', 'mousedown', 'touchstart'].forEach(function (name) {
    document.addEventListener(name, function () {
      if (SDL2.audioContext.state === 'suspended') SDL2.audioContext.resume();
    }, { once: true });
  });
}

function startRuntime() {
  if (started || !PES11.Storage.isReady()) return;
  started = true;
  // Still inside the click/key gesture, so the context starts running.
  createGuestRateAudioContext();
  PES11.Settings.setGameStarted(true);
  PES11.Core.elements.overlay.classList.remove('ready');
  PES11.Core.elements.startChoice.hidden = true;

  // The pak is announced and the native switches set before the renderer
  // reads PSPRECOMP_GE_SCALE and main() opens the game data.
  new Promise(function (resolve, reject) { PES11.Data.loadPakMetadata(resolve, reject); }).then(function (pak) {
    PES11.RangeCache.bindEngine(module);
    return PES11.CommentaryPreload.load(pak);
  }).then(function () {
    Runtime.Debug.apply(module);
    PES11.Core.setStatus('Preparando el renderer...');
    return Runtime.Renderer.prepare(module);
  }).then(function () {
    PES11.Core.elements.overlay.hidden = true;
    PES11.Core.elements.canvas.focus();
    module.callMain();
    Runtime.Background.sync();

    PES11.Controls.Gamepads.applySavedMappings();
    PES11.Controls.Bindings.applySaved();
    PES11.Controls.Touch.start();

    PES11.Controls.Bindings.setReady();
    setNowPlaying('▶ Pro Evolution Soccer 2011 (PSP)');
    window.dispatchEvent(new Event('pes11:game-started'));
  }).catch(function (error) {
    PES11.Core.pushLine('No se pudo iniciar el juego: ' + error.message, true);
    PES11.Core.setStatus('No se pudo iniciar: ' + error.message + ' Podés reintentar.');
    PES11.Settings.setGameStarted(false);
    PES11.Online.setGameStarted(false);
    // Show the status line with the error again, above the start button.
    PES11.Core.elements.overlay.classList.remove('ready');
    PES11.Core.elements.overlay.hidden = false;
    PES11.Core.elements.startChoice.hidden = false;
    started = false;
  });
}

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

// iPhone Safari has no Element.requestFullscreen, so the stage is stretched
// over the viewport with CSS instead (.player.pseudo-fullscreen).
function togglePseudoFullscreen() {
  var on = !stageEl.classList.contains('pseudo-fullscreen');
  stageEl.classList.toggle('pseudo-fullscreen', on);
  document.documentElement.classList.toggle('pseudo-fullscreen-lock', on);
  if (on) PES11.Core.elements.canvas.focus();
}

function toggleFullscreen() {
  try {
    if (fullscreenElement()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return;
    }

    var request = stageEl.requestFullscreen || stageEl.webkitRequestFullscreen;
    if (!request) {
      togglePseudoFullscreen();
      return;
    }
    var pending = request.call(stageEl, { navigationUI: 'hide' });
    if (pending && pending.catch) {
      pending.catch(function (e) {
        PES11.Core.pushLine('Fullscreen refused: ' + e, true);
      });
    }
  } catch (e) {
    PES11.Core.pushLine('Fullscreen unavailable: ' + e, true);
  }
}

function onFullscreenChange() {
  if (fullscreenElement()) PES11.Core.elements.canvas.focus();
}

function init() {
  if (initialized) return;
  initialized = true;

  // Browsers keep AudioContext suspended until a user gesture. Starting on
  // the first click/key lets SDL resume audio before the first game frame.
  startButtonEl.addEventListener('click', startRuntime);
  window.addEventListener('keydown', function (event) {
    // A focused button starts through its own click (Enter/Space).
    if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target.tagName)) return;
    if (PES11.Core.elements.startChoice.hidden === false && PES11.Controls.Bindings.isModalHidden()) {
      startRuntime();
    }
  });

  document.getElementById('fullscreen').onclick = toggleFullscreen;
  stageEl.addEventListener('dblclick', function () {
    if (PES11.Settings.isGameStarted()) toggleFullscreen();
  });
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);
}

Runtime.Player = {
  init: init,
  start: startRuntime,
  showStartChoice: showStartChoice,
  toggleFullscreen: toggleFullscreen,
  setNowPlaying: setNowPlaying,
  isStarted: function () { return started; }
};
})(window.PES11);
