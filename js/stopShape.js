(function (root) {
  'use strict';

  // Geometry for the bus stop badge. The padded viewBox leaves room around the outline so the shape is never
  // shaved at the edge when the SVG is rasterized for the export preview, JPEG or PDF.
  var VIEWBOX = '-6 -6 112 102';
  var STROKE = 6; // keep in step with .stop-tri stroke-width in styles.css
  var SHAPES = ['triangle', 'circle', 'square', 'squircle'];

  function spec(shape) {
    if (shape === 'circle') return { tag: 'ellipse', attrs: { cx: '50', cy: '45', rx: '44', ry: '41' } };
    if (shape === 'square') return { tag: 'rect', attrs: { x: '5', y: '4', width: '90', height: '82' } };
    if (shape === 'squircle') return { tag: 'rect', attrs: { x: '5', y: '4', width: '90', height: '82', rx: '30', ry: '30' } };
    return { tag: 'polygon', attrs: { points: '50,4 97,86 3,86' } };
  }

  // Baseline of the number, so it sits in the wide part of the shape.
  function numberY(shape) { return shape === 'circle' || shape === 'square' || shape === 'squircle' ? 64 : 78; }

  // Which seat corner the badge sits in: 'tl', 'tr', 'bl' (default) or 'br'.
  function corner(c) {
    var id = ['tl', 'tr', 'bl', 'br'].indexOf(c) < 0 ? 'bl' : c;
    return { id: id, top: id.charAt(0) === 't', right: id.charAt(1) === 'r' };
  }

  var api = { corner: corner, VIEWBOX: VIEWBOX, STROKE: STROKE, SHAPES: SHAPES, spec: spec, numberY: numberY };
  root.BusApp = root.BusApp || {};
  root.BusApp.stopShape = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
