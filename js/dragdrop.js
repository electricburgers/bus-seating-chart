(function (root) {
  'use strict';

  // Native HTML5 drag and drop, delegated from the document so re-rendering never loses handlers.
  // handlers: { onDropSeat(studentId, seatId), onDropPool(studentId) }
  function attach(doc, handlers) {
    var dragging = null;

    doc.addEventListener('dragstart', function (e) {
      var chip = e.target.closest && e.target.closest('[data-student-id][draggable="true"]');
      if (!chip) return;
      dragging = chip.getAttribute('data-student-id');
      e.dataTransfer.setData('text/plain', dragging);
      e.dataTransfer.effectAllowed = 'move';
      chip.classList.add('dragging');
    });

    doc.addEventListener('dragend', function () {
      dragging = null;
      clearHover(doc);
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
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && picked !== null) { picked = null; mark(); say('Move cancelled.'); return; }
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var t = e.target;
      if (!t || !t.closest || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName)) return;
      var chip = t.closest('[data-student-id][draggable="true"]');
      var target = dropTarget(t);
      var inPool = target && target.hasAttribute('data-pool');
      if (picked === null) {
        if (!chip) return;
        e.preventDefault();
        picked = chip.getAttribute('data-student-id');
        mark();
        say('Picked up ' + (chip.querySelector('.chip-name') || chip).textContent + '. Move to a seat or the student list and press Enter. Escape cancels.');
        return;
      }
      // Something is picked up. A chip in the student list just changes the pick.
      if (chip && inPool) {
        e.preventDefault();
        picked = chip.getAttribute('data-student-id');
        mark();
        return;
      }
      if (!target) return;
      e.preventDefault();
      var id = picked, seatId = target.getAttribute('data-seat-id');
      picked = null;
      if (seatId) handlers.onDropSeat(id, seatId); else handlers.onDropPool(id);
      mark();
      var again = seatId && doc.querySelector('.seat[data-seat-id="' + seatId + '"]');
      if (again && again.focus) again.focus();
    });
    doc.addEventListener('focusin', mark);

    doc.addEventListener('drop', function (e) {
      var target = dropTarget(e.target);
      if (!target || dragging === null) return;
      e.preventDefault();
      var id = dragging;
      dragging = null;
      clearHover(doc);
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
