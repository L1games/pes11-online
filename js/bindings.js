(function (PES11) {
// --- Control bindings --------------------------------------------
// Local seats use the PES6 Controls layout and independent bindings.
// `key` indices mirror psprecomp::platform::KeyboardKey
// and `pad` indices GamepadButton
// (platform/include/psprecomp/platform/platform_input_mapping.hpp) exactly:
// they cross to C++ as plain ints, so they must never be renumbered.
var KEYBOARD_KEY_COUNT = 24;
var GAMEPAD_BUTTON_COUNT = 24;
// Saves made before the PS2 controls carry only these first indices.
var PSP_ACTION_COUNT = 16;
var CONTROL_GROUPS = [
  { name: 'Gatillos', area: 'shoulders', controls: [
    { label: 'L2', pad: 16, key: 16 }, { label: 'L1', pad: 6, key: 11 },
    { label: 'R1', pad: 7, key: 10 }, { label: 'R2', pad: 17, key: 17 }
  ] },
  { name: 'Cruceta', area: 'dpad', controls: [
    { label: 'Arriba', pad: 8, key: 0, position: 'up' },
    { label: 'Izquierda', pad: 10, key: 3, position: 'left' },
    { label: 'Derecha', pad: 11, key: 1, position: 'right' },
    { label: 'Abajo', pad: 9, key: 2, position: 'down' }
  ] },
  { name: 'Botones de acción', area: 'face', controls: [
    { label: 'Triángulo', symbol: '△', pad: 3, key: 7, position: 'up', color: 'triangle' },
    { label: 'Cuadrado', symbol: '□', pad: 2, key: 6, position: 'left', color: 'square' },
    { label: 'Círculo', symbol: '○', pad: 1, key: 5, position: 'right', color: 'circle' },
    { label: 'Cruz', symbol: '×', pad: 0, key: 4, position: 'down', color: 'cross' }
  ] },
  { name: 'Stick izquierdo', area: 'analog', controls: [
    { label: 'Arriba', pad: 12, key: 12, position: 'up' },
    { label: 'Izquierda', pad: 14, key: 14, position: 'left' },
    { label: 'Derecha', pad: 15, key: 15, position: 'right' },
    { label: 'Abajo', pad: 13, key: 13, position: 'down' }
  ] },
  { name: 'Stick derecho', area: 'right-analog', controls: [
    { label: 'Arriba', pad: 20, key: 20, position: 'up' },
    { label: 'Izquierda', pad: 22, key: 22, position: 'left' },
    { label: 'Derecha', pad: 23, key: 23, position: 'right' },
    { label: 'Abajo', pad: 21, key: 21, position: 'down' }
  ] },
  { name: 'Menú', area: 'system', controls: [
    { label: 'Select', pad: 5, key: 9 }, { label: 'Start', pad: 4, key: 8 },
    { label: 'L3', pad: 18, key: 18 }, { label: 'R3', pad: 19, key: 19 }
  ] }
];
// Player tabs, device selection and persistence follow PES6 Controls.
var KEYBOARD_ACTIONS = new Array(KEYBOARD_KEY_COUNT).fill('');
var bindingsStatusEl = document.getElementById('bindingsStatus');
var bindingsModalEl = document.getElementById('bindingsModal');
var playerDeviceEl = document.getElementById('playerDevice');
var captureTarget = null;
var selectedPlayer = 0;

function playerCount() { return window.Module.ccall('pes11_player_count', 'number', [], []); }
function scancodeLabel(code) {
  if (code < 0) return '(unbound)';
  try { return window.Module.ccall('pes11_scancode_name', 'string', ['number'], [code]) || ('#' + code); }
  catch (e) { return '#' + code; }
}

function renderControlBoard(container, keyboard) {
  container.innerHTML = '';
  container.className = 'control-board';
  CONTROL_GROUPS.forEach(function (group) {
    var section = document.createElement('fieldset');
    section.className = 'control-group control-' + group.area;
    var legend = document.createElement('legend');
    legend.textContent = group.name;
    section.appendChild(legend);
    var controls = document.createElement('div');
    controls.className = 'control-group-buttons';
    group.controls.forEach(function (control) {
      var index = keyboard ? control.key : control.pad;
      var current = keyboard
        ? scancodeLabel(window.Module.ccall('pes11_get_keyboard_binding', 'number', ['number'], [index]))
        : window.Module.ccall('pes11_player_binding_name', 'string', ['number', 'number'], [selectedPlayer, index]);
      var button = document.createElement('button');
      button.className = 'binding-button' + (control.color ? ' binding-' + control.color : '');
      button.dataset.index = index;
      if (control.position) button.classList.add('control-position-' + control.position);
      button.title = 'Asignar ' + group.name + ': ' + control.label;
      button.setAttribute('aria-label', group.name + ', ' + control.label + ': ' + current + '. Cambiar asignación');
      var label = document.createElement('span');
      label.className = 'binding-label';
      label.textContent = (control.symbol ? control.symbol + ' ' : '') + control.label;
      var value = document.createElement('span');
      value.className = 'binding-value';
      value.textContent = current;
      button.appendChild(label);
      button.appendChild(value);
      button.onclick = function () {
        beginCapture({ keyboard: keyboard, player: selectedPlayer, index: index, button: button, value: value });
      };
      controls.appendChild(button);
    });
    section.appendChild(controls);
    container.appendChild(section);
  });
  var figure = document.createElement('figure');
  figure.className = 'controller-preview';
  var image = document.createElement('img');
  image.src = 'assets/joystick.png';
  image.alt = 'Mando estilo DualShock con cruceta, dos sticks y botones de PlayStation';
  image.width = 479;
  image.height = 280;
  image.draggable = false;
  figure.appendChild(image);
  var caption = document.createElement('figcaption');
  caption.textContent = keyboard ? 'TECLADO · JUGADOR 1' : 'MANDO · JUGADOR ' + (selectedPlayer + 1);
  figure.appendChild(caption);
  container.appendChild(figure);
}
function renderKeyboard() {
  renderControlBoard(document.getElementById('keyboardBindings'), true);
}
function renderPlayer() {
  var tabs = document.getElementById('playerTabs');
  tabs.innerHTML = '';
  for (var player = 0; player < playerCount(); player++) {
    (function (player) {
      var tab = document.createElement('button');
      tab.textContent = 'J' + (player + 1);
      tab.title = 'Jugador ' + (player + 1);
      tab.setAttribute('aria-pressed', player === selectedPlayer ? 'true' : 'false');
      if (player === selectedPlayer) tab.className = 'active';
      tab.onclick = function () {
        if (captureTarget) return;
        selectedPlayer = player;
        renderPlayer();
      };
      tabs.appendChild(tab);
    })(player);
  }
  playerDeviceEl.textContent =
    window.Module.ccall('pes11_player_device_name', 'string', ['number'], [selectedPlayer]);
  renderControlBoard(document.getElementById('gamepadBindings'), false);
}
function renderBindings() {
  renderKeyboard();
  renderPlayer();
}

function beginCapture(target) {
  if (captureTarget) return; // one capture in flight at a time
  captureTarget = target;
  target.originalText = target.value.textContent;
  target.value.textContent = 'Presioná...';
  target.button.classList.add('capturing');
  if (target.keyboard) {
    bindingsStatusEl.textContent = 'Presioná una tecla (Esc cancela)...';
    window.Module.ccall('pes11_begin_keyboard_capture', null, [], []);
    return;
  }
  bindingsStatusEl.textContent = 'Jugador ' + (target.player + 1) +
    ': presioná un botón del mando (Esc en el teclado cancela)...';
  window.Module.ccall('pes11_begin_player_capture', null, ['number'], [target.player]);
}

// onBindingCaptured itself is attached to Module below, once Module
// exists (it is declared later in this file); everything it closes
// over here (captureTarget, bindingsStatusEl, renderBindings,
// saveBindings) is already defined by then.
function handleBindingCaptured(isGamepadFlag, code) {
  var target = captureTarget;
  captureTarget = null;
  if (!target) return;
  target.value.textContent = target.originalText;
  target.button.classList.remove('capturing');
  if (code < 0) {
    bindingsStatusEl.textContent = 'Cancelado.';
    return;
  }
  if (target.keyboard) {
    window.Module.ccall('pes11_rebind_keyboard', null, ['number', 'number'], [code, target.index]);
  } else {
    window.Module.ccall('pes11_rebind_player', null, ['number', 'number', 'number'],
                 [target.player, code, target.index]);
  }
  bindingsStatusEl.textContent = 'Asignado.';
  renderBindings();
  var container = document.getElementById(target.keyboard ? 'keyboardBindings' : 'gamepadBindings');
  container.querySelector('[data-index="' + target.index + '"]').focus();
  saveBindings();
}
function cancelCapture() {
  if (!captureTarget) return;
  window.Module.ccall('pes11_cancel_capture', null, [], []);
  captureTarget.value.textContent = captureTarget.originalText;
  captureTarget.button.classList.remove('capturing');
  captureTarget = null;
}

// v1 held the keyboard and Player 1's pad only; it is read once to
// migrate and then superseded by v2.
var BINDINGS_STORAGE_KEY = 'pes11-bindings-v2';
var LEGACY_BINDINGS_STORAGE_KEY = 'pes11-bindings-v1';
function collectBindings() {
  var data = { format: 'pes11-controls', version: 2, keyboard: {}, players: [] };
  KEYBOARD_ACTIONS.forEach(function (_, index) {
    data.keyboard[index] = window.Module.ccall('pes11_get_keyboard_binding', 'number', ['number'], [index]);
  });
  var buttons = window.Module.ccall('pes11_player_button_count', 'number', [], []);
  for (var player = 0; player < playerCount(); player++) {
    var seat = {
      device: window.Module.ccall('pes11_player_device_identity', 'string', ['number'], [player]),
      buttons: {}
    };
    for (var index = 0; index < buttons; index++) {
      seat.buttons[index] = window.Module.ccall('pes11_get_player_binding', 'number',
                                         ['number', 'number'], [player, index]);
    }
    data.players.push(seat);
  }
  return data;
}
function saveBindings() {
  try {
    localStorage.setItem(BINDINGS_STORAGE_KEY, JSON.stringify(collectBindings()));
  } catch (e) { /* private mode or storage disabled: bindings just won't persist */ }
}
function readSavedBindings() {
  try {
    var raw = localStorage.getItem(BINDINGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    raw = localStorage.getItem(LEGACY_BINDINGS_STORAGE_KEY);
    if (!raw) return null;
    var legacy = JSON.parse(raw);
    return { version: 1, keyboard: legacy.keyboard || {}, players: [{ device: '', buttons: legacy.gamepad || {} }] };
  } catch (e) { return null; }
}
// PS2 actions (index PSP_ACTION_COUNT and up) a section does not carry: a
// save from before the PS2 controls. They keep their current binding across
// the clear below, unless the section gives that source to another action.
function bindingsMissingFrom(section, count, read) {
  var kept = {};
  for (var index = PSP_ACTION_COUNT; index < count; index++)
    if (!(index in section)) kept[index] = read(index);
  return kept;
}
function restoreMissingBindings(kept, section, rebind) {
  var used = Object.keys(section).map(function (index) { return section[index]; });
  Object.keys(kept).forEach(function (index) {
    var code = kept[index];
    if (code >= 0 && used.indexOf(code) < 0) rebind(code, parseInt(index, 10));
  });
}
// `exact` (a loaded file) clears each section it carries first, so what
// the file leaves unbound stays unbound; the startup restore only
// overrides the defaults it has entries for.
function applyBindings(data, exact) {
  var clearSections = exact || data.version >= 2;
  var keptKeys = {};
  if (clearSections && data.keyboard) {
    keptKeys = bindingsMissingFrom(data.keyboard, KEYBOARD_KEY_COUNT, function (index) {
      return window.Module.ccall('pes11_get_keyboard_binding', 'number', ['number'], [index]);
    });
    window.Module.ccall('pes11_clear_keyboard_bindings', null, [], []);
  }
  Object.keys(data.keyboard || {}).forEach(function (index) {
    var code = data.keyboard[index];
    if (code >= 0) window.Module.ccall('pes11_rebind_keyboard', null, ['number', 'number'], [code, parseInt(index, 10)]);
  });
  restoreMissingBindings(keptKeys, data.keyboard || {}, function (code, index) {
    window.Module.ccall('pes11_rebind_keyboard', null, ['number', 'number'], [code, index]);
  });
  var buttons = window.Module.ccall('pes11_player_button_count', 'number', [], []);
  (data.players || []).forEach(function (seat, player) {
    if (!seat || player >= playerCount()) return;
    // An empty identity is the untouched default (first free pad).
    if (typeof seat.device === 'string') {
      window.Module.ccall('pes11_set_player_device_identity', null, ['number', 'string'], [player, seat.device]);
    }
    var keptButtons = {};
    if (clearSections && seat.buttons) {
      keptButtons = bindingsMissingFrom(seat.buttons, buttons, function (index) {
        return window.Module.ccall('pes11_get_player_binding', 'number', ['number', 'number'], [player, index]);
      });
      window.Module.ccall('pes11_clear_player_bindings', null, ['number'], [player]);
    }
    var rebindButton = function (code, index) {
      window.Module.ccall('pes11_rebind_player_gamepad', null, ['number', 'number', 'number'],
                   [player, code, index]);
    };
    Object.keys(seat.buttons || {}).forEach(function (index) {
      var code = seat.buttons[index];
      if (code >= 0) rebindButton(code, parseInt(index, 10));
    });
    restoreMissingBindings(keptButtons, seat.buttons || {}, rebindButton);
  });
  // A previous one/two-player save can claim devices initially assigned to
  // the new seats. Restore unspecified seats to automatic after those claims
  // so the remaining free pads are assigned to J3/J4 instead of staying unused.
  for (var player = 0; player < playerCount(); player++) {
    if (!(data.players || [])[player]) {
      window.Module.ccall('pes11_set_player_device_identity', null,
                     ['number', 'string'], [player, '']);
    }
  }
}
function applySavedBindings() {
  var data = readSavedBindings();
  if (!data) return;
  try { applyBindings(data, false); }
  catch (e) { PES11.Core.pushLine('Could not restore saved control bindings: ' + e, true); }
}

// The binding calls need the running game, so a click before it starts is
// remembered and opens the dialog as soon as it does.
var openPending = false;
var engineReady = false;
function openBindingsDialog() {
  openPending = false;
  renderBindings();
  bindingsStatusEl.textContent = '';
  bindingsModalEl.hidden = false;
  PES11.Controls.Gamepads.startTester();
}
document.getElementById('openBindings').onclick = function () {
  if (engineReady) { openBindingsDialog(); return; }
  openPending = true;
  PES11.Savedata.toast('Los controles se abrirán al empezar el juego');
};
document.getElementById('closeBindings').onclick = function () {
  cancelCapture();
  PES11.Controls.Gamepads.cancelCalibration();
  bindingsModalEl.hidden = true;
};
function showBindingMode(keyboard) {
  cancelCapture();
  document.getElementById('keyboardBindingsPanel').hidden = !keyboard;
  document.getElementById('gamepadBindingsPanel').hidden = keyboard;
  ['showGamepadBindings', 'showKeyboardBindings'].forEach(function (id, index) {
    var active = keyboard === (index === 1);
    var button = document.getElementById(id);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  bindingsStatusEl.textContent = '';
}
document.getElementById('showGamepadBindings').onclick = function () { showBindingMode(false); };
document.getElementById('showKeyboardBindings').onclick = function () { showBindingMode(true); };
function selectDevice(step) {
  if (captureTarget) return;
  window.Module.ccall('pes11_player_select_device', null, ['number', 'number'], [selectedPlayer, step]);
  renderPlayer();
  saveBindings();
}
document.getElementById('prevDevice').onclick = function () { selectDevice(-1); };
document.getElementById('nextDevice').onclick = function () { selectDevice(1); };
document.getElementById('resetPlayerBindings').onclick = function () {
  cancelCapture();
  window.Module.ccall('pes11_reset_player_bindings', null, ['number'], [selectedPlayer]);
  renderBindings();
  saveBindings();
  bindingsStatusEl.textContent = 'Jugador ' + (selectedPlayer + 1) + ' restablecido.';
};
document.getElementById('autoBindings').onclick = function () {
  cancelCapture();
  window.Module.ccall('pes11_reset_bindings', null, [], []);
  window.Module.ccall('pes11_auto_configure_controls', null, [], []);
  renderBindings();
  saveBindings();
  bindingsStatusEl.textContent = 'Mandos conectados asignados en orden y botones restablecidos.';
};
document.getElementById('exportBindings').onclick = function () {
  cancelCapture();
  var blob = new Blob([JSON.stringify(collectBindings(), null, 2) + '\n'], { type: 'application/json' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'pes11-controles.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  bindingsStatusEl.textContent = 'Archivo guardado.';
};
var importBindingsFileEl = document.getElementById('importBindingsFile');
document.getElementById('importBindings').onclick = function () {
  cancelCapture();
  importBindingsFileEl.value = '';
  importBindingsFileEl.click();
};
importBindingsFileEl.onchange = function () {
  var file = importBindingsFileEl.files && importBindingsFileEl.files[0];
  if (!file) return;
  file.text().then(function (text) {
    var data = JSON.parse(text);
    if (!data || data.format !== 'pes11-controls' || (!Array.isArray(data.players) && !data.gamepad))
      throw new Error('no es un archivo de controles de PES11Recomp');
    if (!data.players) data.players = [{ device: '', buttons: data.gamepad || {} }];
    applyBindings(data, true);
    renderBindings();
    saveBindings();
    bindingsStatusEl.textContent = 'Configuración cargada de ' + file.name + '.';
  }).catch(function (e) {
    bindingsStatusEl.textContent = 'No se pudo cargar: ' + (e && e.message ? e.message : e);
  });
};
document.getElementById('resetBindings').onclick = function () {
  cancelCapture();
  window.Module.ccall('pes11_reset_bindings', null, [], []);
  for (var player = 1; player < playerCount(); player++)
    window.Module.ccall('pes11_reset_player_bindings', null, ['number'], [player]);
  renderBindings();
  saveBindings();
  bindingsStatusEl.textContent = 'Controles restablecidos.';
};

PES11.Controls = PES11.Controls || {};
PES11.Controls.Bindings = {
  isModalHidden: function () { return bindingsModalEl.hidden; },
  handleCaptured: handleBindingCaptured,
  applySaved: applySavedBindings,
  // Called once main() has run and the binding exports are usable.
  setReady: function () { engineReady = true; if (openPending) openBindingsDialog(); },
  cancelCapture: cancelCapture,
  renderPlayer: renderPlayer,
  renderGamepad: renderPlayer,
  setStatus: function (text) { bindingsStatusEl.textContent = text; }
};
})(window.PES11);
