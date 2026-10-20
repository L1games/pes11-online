(function () {
  'use strict';
  var module = window.Module = window.Module || {};
  var active = null;
  var activeButtons = [];
  var canCancel = true;
  module.pes11MessageDialogResult = 0;
  module.onMessageDialogClosed = function () {
    if (active) { active.close(); active.remove(); active = null; }
    activeButtons = [];
    module.pes11MessageDialogResult = 0;
  };
  module.onMessageDialog = function (text, mode, error, options) {
    module.onMessageDialogClosed();
    var dialog = document.createElement('dialog');
    dialog.id = 'pes11-message-dialog';
    Object.assign(dialog.style, {
      color: '#f5f5f5', background: '#20252b', border: '2px solid #5cbd72',
      borderRadius: '12px', padding: '24px', width: 'min(540px, 88vw)',
      maxHeight: '85vh', overflow: 'auto', font: '16px system-ui, sans-serif'
    });
    var message = document.createElement('p');
    message.style.whiteSpace = 'pre-wrap';
    message.style.margin = '0 0 24px';
    message.textContent = mode === 0 ? 'Error de PSP: 0x' + (error >>> 0).toString(16).toUpperCase().padStart(8, '0') : text;
    dialog.appendChild(message);
    var controls = document.createElement('div');
    Object.assign(controls.style, { display: 'flex', justifyContent: 'flex-end', gap: '12px' });
    dialog.appendChild(controls);
    var yesNo = (options & 0x10) !== 0;
    var ok = (options & 0x20) !== 0;
    canCancel = (options & 0x80) === 0;
    var choices = yesNo ? [['Sí', 1], ['No', 2]] : ok ? [['Aceptar', 1]] : canCancel ? [['Cerrar', 3]] : [];
    var focus;
    choices.forEach(function (choice, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = choice[0];
      Object.assign(button.style, {
        padding: '10px 24px', cursor: 'pointer', font: 'inherit', color: '#fff',
        background: '#35543e', border: '1px solid #91ad98', borderRadius: '6px'
      });
      button.addEventListener('click', function () {
        if (!module.pes11MessageDialogResult) module.pes11MessageDialogResult = choice[1];
      });
      controls.appendChild(button);
      activeButtons.push(button);
      if (index === (yesNo && (options & 0x100) ? 1 : 0)) focus = button;
    });
    dialog.addEventListener('cancel', function (event) {
      event.preventDefault();
      if (canCancel && !module.pes11MessageDialogResult) module.pes11MessageDialogResult = 3;
    });
    document.body.appendChild(dialog);
    active = dialog;
    dialog.showModal();
    if (focus) focus.focus();
  };
  // Register before SDL's window capture listener. Key releases still reach
  // the game so the button that opened the dialog cannot remain held.
  window.addEventListener('keydown', function (event) {
    if (!active) return;
    event.stopImmediatePropagation();
    var key = event.key;
    if (['Enter', ' ', 'Escape', 'Backspace', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(key) < 0) return;
    event.preventDefault();
    if (key === 'Escape' || key === 'Backspace') {
      if (canCancel && !event.repeat && !module.pes11MessageDialogResult) module.pes11MessageDialogResult = 3;
    } else if (key === 'Enter' || key === ' ') {
      if (!event.repeat && activeButtons.indexOf(document.activeElement) >= 0) document.activeElement.click();
    } else if (activeButtons.length) {
      var direction = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
      var index = Math.max(0, activeButtons.indexOf(document.activeElement));
      activeButtons[(index + direction + activeButtons.length) % activeButtons.length].focus();
    }
  }, true);
})();
