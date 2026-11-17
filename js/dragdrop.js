(function (root) {
  'use strict';

  // Native HTML5 drag and drop, delegated from the document so re-rendering never loses handlers.
  // handlers: { onDropSeat(studentId, seatId), onDropPool(studentId), onMessage(text),
  //   onLift(studentId)    a student starts moving (drag or tap-pick), so the app can show where they fit,
  //   onRelease()          the move ended or was cancelled,
  //   isPaused()           true while another click mode (swap mode) owns clicks }
  function attach(doc, handlers) {
    var dragging = null;
    function lift(id) { if (handlers.onLift) handlers.onLift(id); }
    function release() { if (handlers.onRelease) handlers.onRelease(); }
    function paused() { return !!(handlers.isPaused && handlers.isPaused()); }

    doc.addEventListener('dragstart', function (e) {
      var chip = e.target.closest && e.target.closest('[data-student-id][draggable="true"]');
      if (!chip) return;
      dragging = chip.getAttribute('data-student-id');
      e.dataTransfer.setData('text/plain', dragging);
      e.dataTransfer.effectAllowed = 'move';
      // Mark after the browser has taken its drag image, so the ghost is not the faded chip.
      setTimeout(function () { chip.classList.add('dragging'); lift(dragging); }, 0);
    });

    doc.addEventListener('dragend', function () {
      dragging = null;
      clearHover(doc);
      release();
      Array.prototype.forEach.call(doc.querySelectorAll('.dragging'), function (n) { n.classList.remove('dragging'); });
    });

    doc.addEventListener('dragover', function (e) {
      if (dragging === null) return;
      var target = dropTarget(e.target);
      if (!target) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      clearHover(doc);
      target.classList.add('drop-hover');
    });

    // Keyboard alternative: Enter/Space on a student picks them up, Enter/Space on a seat
    // (or the student list) puts them down, Escape cancels. Selection survives re-rendering.
    var picked = null;
    function say(msg) { if (handlers.onMessage) handlers.onMessage(msg); }
    function mark() {
      Array.prototype.forEach.call(doc.querySelectorAll('.picked'), function (n) { n.classList.remove('picked'); });
      if (picked === null) return;
      Array.prototype.forEach.call(doc.querySelectorAll('[data-student-id][draggable="true"]'), function (n) {
        if (n.getAttribute('data-student-id') === picked) n.classList.add('picked');
      });
    }
    function nameOf(chip) { var n = chip.querySelector('.chip-name'); return n ? (n.getAttribute('data-full-name') || n.textContent) : chip.textContent; }
    function updateBar(name) {
      var bar = doc.getElementById('pick-bar');
      if (!bar) return;
      bar.hidden = picked === null;
      var label = bar.querySelector('.pick-text');
      if (label && picked !== null) label.textContent = 'Picked up ' + name + '. Tap a seat to place them.';
    }
    function pickUp(chip) {
      picked = chip.getAttribute('data-student-id');
      mark();
      lift(picked);
      updateBar(nameOf(chip));
      say('Picked up ' + nameOf(chip) + '. Move to a seat or the student list and press Enter (or tap a seat). Escape cancels.');
    }
    function cancel() { picked = null; mark(); updateBar(); release(); say('Move cancelled.'); }
    function putDown(target) {
      var id = picked, seatId = target.getAttribute('data-seat-id');
      picked = null;
      updateBar();
      release();
      if (seatId) handlers.onDropSeat(id, seatId); else handlers.onDropPool(id);
      mark();
      return seatId;
    }

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && picked !== null) { cancel(); return; }
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var t = e.target;
      if (!t || !t.closest || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName)) return;
      var chip = t.closest('[data-student-id][draggable="true"]');
      var target = dropTarget(t);
      var inPool = target && target.hasAttribute('data-pool');
      if (picked === null) {
        if (!chip) return;
        e.preventDefault();
        pickUp(chip);
        return;
      }
      // Something is picked up. A chip in the student list just changes the pick.
      if (chip && inPool) {
        e.preventDefault();
        pickUp(chip);
        return;
      }
      if (!target) return;
      e.preventDefault();
      var seatId = putDown(target);
      var again = seatId && doc.querySelector('.seat[data-seat-id="' + seatId + '"]');
      if (again && again.focus) again.focus();
    });

    // Touch alternative (phones and tablets have no HTML5 drag): tap a student to pick them up,
    // then tap a seat to put them down, or tap the student list to send them back. Tap them again to cancel.
    doc.addEventListener('click', function (e) {
      var t = e.target;
      if (paused()) return;
      if (!t || !t.closest || t.closest('button, input, select, textarea, label, a, summary, .popover')) return;
      var chip = t.closest('[data-student-id][draggable="true"]');
      var target = dropTarget(t);
      var inPool = target && target.hasAttribute('data-pool');
      if (picked === null) { if (chip) pickUp(chip); return; }
      if (chip && chip.getAttribute('data-student-id') === picked) { cancel(); return; }
      if (chip && inPool) { pickUp(chip); return; }
      if (target) putDown(target);
    });
    var bar = doc.getElementById && doc.getElementById('pick-bar');
    if (bar) {
      bar.querySelector('.pick-cancel').addEventListener('click', cancel);
      bar.querySelector('.pick-return').addEventListener('click', function () {
        if (picked === null) return;
        putDown(doc.querySelector('[data-pool]'));
      });
    }
    doc.addEventListener('focusin', mark);

    doc.addEventListener('drop', function (e) {
      var target = dropTarget(e.target);
      if (!target || dragging === null) return;
      e.preventDefault();
      var id = dragging;
      dragging = null;
      clearHover(doc);
      release();
      var seatId = target.getAttribute('data-seat-id');
      if (seatId) handlers.onDropSeat(id, seatId); else handlers.onDropPool(id);
    });
  }

  function dropTarget(node) {
    if (!node || !node.closest) return null;
    return node.closest('.seat[data-drop="true"]') || node.closest('[data-pool]');
  }

  function clearHover(doc) {
    Array.prototype.forEach.call(doc.querySelectorAll('.drop-hover'), function (n) { n.classList.remove('drop-hover'); });
  }

  var api = { attach: attach };
  root.BusApp = root.BusApp || {};
  root.BusApp.dragdrop = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
