(function (PES11) {
// --- Settings ---------------------------------------------------------
// Kept in localStorage as { section: { key: value } }. Controls tagged
// data-section/data-key edit one value. The engine reads them at start as
// PSPRECOMP_* switches (environment()); only the volume applies live.
var STORAGE_KEY = 'pes11.settings';
var DEFAULTS = {
  render: { backend: 'auto', scale: '2', linear_filter: '0' },
  audio: { volume: '100' },
  game: { stadium_camera: '1' },
  net: { rtc: 'reliable' }
};
var settingsStatusEl = document.getElementById('settingsStatus');
var volumeRangeEl = document.getElementById('volumeRange');
var volumeValueEl = document.getElementById('volumeValue');
var gameStarted = false;

function readStored() {
  try {
    var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return stored && typeof stored === 'object' ? stored : {};
  } catch (e) { return {}; }
}
var stored = readStored();

function getValue(section, key) {
  var value = stored[section] && stored[section][key];
  if (typeof value === 'string') return value;
  return DEFAULTS[section] ? DEFAULTS[section][key] : undefined;
}
function setValue(section, key, value) {
  stored[section] = stored[section] || {};
  stored[section][key] = value;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    return true;
  } catch (e) {
    settingsStatusEl.textContent = 'No se pudo guardar: ' + e;
    return false;
  }
}

function settingsControls() {
  return Array.prototype.slice.call(document.querySelectorAll('.settings-panel [data-key]'));
}
function volume() {
  var value = parseInt(getValue('audio', 'volume'), 10);
  return isFinite(value) ? Math.min(100, Math.max(0, value)) : 100;
}
// Applies at any time, even before the game starts: the engine keeps the
// value until the audio device exists.
function applyVolume(percent) {
  volumeValueEl.textContent = percent + '%';
  if (window.Module && typeof window.Module._pes11_set_master_volume === 'function')
    window.Module.ccall('pes11_set_master_volume', null, ['number'], [percent]);
}
// The option marked `selected` in the markup, else the first one.
function defaultOptionOf(select) {
  for (var i = 0; i < select.options.length; i++)
    if (select.options[i].defaultSelected) return select.options[i];
  return select.options[0];
}
function renderSettings() {
  settingsControls().forEach(function (control) {
    if (control === volumeRangeEl) {
      control.value = volume();
      volumeValueEl.textContent = control.value + '%';
      return;
    }
    var value = getValue(control.dataset.section, control.dataset.key);
    var known = Array.prototype.some.call(control.options, function (o) { return o.value === value; });
    control.value = known ? value : defaultOptionOf(control).value;
  });
}
settingsControls().forEach(function (control) {
  if (control === volumeRangeEl) {
    // Dragging applies live; releasing the slider saves.
    control.oninput = function () {
      settingsStatusEl.textContent = '';
      applyVolume(parseInt(control.value, 10));
    };
    control.onchange = function () {
      if (setValue('audio', 'volume', control.value)) settingsStatusEl.textContent = 'Guardado y aplicado.';
    };
    return;
  }
  control.onchange = function () {
    if (!setValue(control.dataset.section, control.dataset.key, control.value)) return;
    settingsStatusEl.textContent = gameStarted ? 'Guardado. Se aplica al reiniciar el juego.' : 'Guardado.';
    if (control.dataset.section === 'render' && PES11.Runtime && PES11.Runtime.Renderer)
      PES11.Runtime.Renderer.updateControls(window.Module);
  };
});
// Disabled until the engine runtime is ready.
function setSettingsEnabled(enabled) {
  Array.prototype.forEach.call(
    document.querySelectorAll('.settings-panel select, .settings-panel input, .settings-panel button'),
    function (control) { control.disabled = !enabled; });
}
setSettingsEnabled(false);

// PSPRECOMP_* switches for the next start (pes11_set_env before main()).
function environment() {
  var scale = parseInt(getValue('render', 'scale'), 10);
  return {
    PSPRECOMP_GE_SCALE: String(isFinite(scale) ? Math.min(3, Math.max(1, scale)) : 2),
    PSPRECOMP_LINEAR_FILTER: getValue('render', 'linear_filter') === '1' ? '1' : '0',
    PSPRECOMP_STADIUM_CAMERA: getValue('game', 'stadium_camera') === '0' ? '0' : '1'
  };
}

PES11.Settings = {
  get: getValue,
  set: setValue,
  volume: volume,
  applyVolume: applyVolume,
  render: renderSettings,
  setEnabled: setSettingsEnabled,
  environment: environment,
  isGameStarted: function () { return gameStarted; },
  setGameStarted: function (started) { gameStarted = !!started; }
};
})(window.PES11);
