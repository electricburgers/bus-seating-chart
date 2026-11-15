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
