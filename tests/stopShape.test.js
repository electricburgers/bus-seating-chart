const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/stopShape.js');

function box(vb) { const [x, y, w, h] = vb.split(' ').map(Number); return { l: x, t: y, r: x + w, b: y + h }; }
// Outer extent of a shape including half its stroke.
function extent(spec) {
  const a = spec.attrs, half = S.STROKE / 2;
  if (spec.tag === 'ellipse') return { l: +a.cx - +a.rx - half, r: +a.cx + +a.rx + half, t: +a.cy - +a.ry - half, b: +a.cy + +a.ry + half };
  if (spec.tag === 'rect') return { l: +a.x - half, r: +a.x + +a.width + half, t: +a.y - half, b: +a.y + +a.height + half };
  const pts = a.points.split(' ').map((p) => p.split(',').map(Number));
  // A mitered or rounded corner can reach a full half stroke past the point.
  return { l: Math.min(...pts.map((p) => p[0])) - half, r: Math.max(...pts.map((p) => p[0])) + half, t: Math.min(...pts.map((p) => p[1])) - half, b: Math.max(...pts.map((p) => p[1])) + half };
}

test('lists the four shapes', () => {
  assert.deepStrictEqual(S.SHAPES, ['triangle', 'circle', 'square', 'squircle']);
});

test('unknown shape falls back to a triangle', () => {
  assert.strictEqual(S.spec('hexagon').tag, 'polygon');
  assert.strictEqual(S.spec().tag, 'polygon');
});

test('shapes use the expected elements', () => {
  assert.strictEqual(S.spec('circle').tag, 'ellipse');
  assert.strictEqual(S.spec('square').tag, 'rect');
  assert.strictEqual(S.spec('squircle').attrs.rx, S.spec('squircle').attrs.ry);
  assert.ok(+S.spec('squircle').attrs.rx > 0);
  assert.strictEqual(S.spec('square').attrs.rx, undefined);
});

test('every shape, stroke included, fits inside the viewBox with room to spare', () => {
  S.SHAPES.forEach((name) => {
    const vb = box(S.VIEWBOX), e = extent(S.spec(name));
    const margin = 2; // room so anti-aliasing and rounding when the SVG is rasterized never shave the edge
    assert.ok(e.l >= vb.l + margin && e.t >= vb.t + margin && e.r <= vb.r - margin && e.b <= vb.b - margin, name + ' is clipped: ' + JSON.stringify(e) + ' in ' + S.VIEWBOX);
  });
});

test('the number sits inside every shape', () => {
  S.SHAPES.forEach((name) => {
    const e = extent(S.spec(name)), y = S.numberY(name);
    assert.ok(y > e.t && y < e.b, name);
  });
});

test('corner names resolve to a vertical and horizontal side, bottom left by default', () => {
  assert.deepStrictEqual(S.corner('tr'), { id: 'tr', top: true, right: true });
  assert.deepStrictEqual(S.corner('bl'), { id: 'bl', top: false, right: false });
  assert.deepStrictEqual(S.corner('br'), { id: 'br', top: false, right: true });
  assert.deepStrictEqual(S.corner('tl'), { id: 'tl', top: true, right: false });
  assert.deepStrictEqual(S.corner('nope'), { id: 'bl', top: false, right: false });
  assert.deepStrictEqual(S.corner(), { id: 'bl', top: false, right: false });
});
