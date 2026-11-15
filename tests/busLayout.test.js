const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/busLayout.js');

test('defaults: 10 rows, 3 driver-side, 2 door-side, door on right, no wheelchair', () => {
  const layout = L.createLayout();
  assert.strictEqual(layout.rows, 10);
  assert.strictEqual(layout.doorSide, 'right');
  assert.strictEqual(layout.wheelchair.enabled, false);
  const benches = L.getBenches(layout);
  assert.strictEqual(benches.length, 10);
  assert.strictEqual(benches[0].driver.length, 3);
  assert.strictEqual(benches[0].door.length, 2);
  assert.strictEqual(L.getSeats(layout).length, 50);
});

test('seat ids are unique and stable', () => {
  const ids = L.getSeats(L.createLayout()).map(s => s.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  assert.strictEqual(L.getBenches(L.createLayout())[0].driver[0].id, '1-driver-1');
});

test('whole-bus seats per side can change', () => {
  const layout = L.setSeatsPerSide(L.createLayout(), 'driver', 2);
  assert.strictEqual(L.getBenches(layout)[4].driver.length, 2);
  assert.strictEqual(L.getBenches(layout)[4].door.length, 2);
});

test('single bench override beats whole-bus default', () => {
  let layout = L.setBenchOverride(L.createLayout(), 3, 'door', 3);
  const benches = L.getBenches(layout);
  assert.strictEqual(benches[2].door.length, 3);
  assert.strictEqual(benches[1].door.length, 2);
  layout = L.clearBenchOverride(layout, 3, 'door');
  assert.strictEqual(L.getBenches(layout)[2].door.length, 2);
});

test('functions do not mutate their input', () => {
  const a = L.createLayout();
  L.setSeatsPerSide(a, 'driver', 1);
  L.flipDoorSide(a);
  L.setWheelchair(a, { enabled: true });
  assert.strictEqual(a.doorSide, 'right');
  assert.strictEqual(a.driverSeats, 3);
  assert.strictEqual(a.wheelchair.enabled, false);
});

test('door flip changes left-to-right side order', () => {
  const layout = L.createLayout();
  assert.deepStrictEqual(L.sideOrder(layout), ['driver', 'door']);
  const flipped = L.flipDoorSide(layout);
  assert.strictEqual(flipped.doorSide, 'left');
  assert.deepStrictEqual(L.sideOrder(flipped), ['door', 'driver']);
});

test('wheelchair area replaces the whole rear rows, min 2 rows', () => {
  const layout = L.setWheelchair(L.createLayout(), { enabled: true });
  assert.strictEqual(layout.wheelchair.rows, 2);
  const benches = L.getBenches(layout);
  assert.strictEqual(benches.length, 10);
  assert.strictEqual(benches[7].wheelchair, false);
  for (const b of benches.slice(8)) {
    assert.strictEqual(b.wheelchair, true);
    assert.strictEqual(b.driver.length, 0);
    assert.strictEqual(b.door.length, 0);
  }
  assert.strictEqual(L.getSeats(layout).length, 8 * 5);
});

test('wheelchair rows can grow but not go below 2', () => {
  const three = L.setWheelchair(L.createLayout(), { enabled: true, rows: 3 });
  assert.strictEqual(L.getBenches(three).filter(b => b.wheelchair).length, 3);
  assert.throws(() => L.setWheelchair(L.createLayout(), { enabled: true, rows: 1 }));
});

test('wheelchair door is on the door side', () => {
  const layout = L.setWheelchair(L.createLayout(), { enabled: true });
  assert.strictEqual(L.wheelchairDoorSide(layout), 'right');
  assert.strictEqual(L.wheelchairDoorSide(L.flipDoorSide(layout)), 'left');
});

test('markers: driver seat, front door, rear emergency exit', () => {
  const m = L.getMarkers(L.createLayout());
  assert.deepStrictEqual(m.driverSeat, { side: 'left', position: 'front' });
  assert.deepStrictEqual(m.frontDoor, { side: 'right', position: 'front' });
  assert.deepStrictEqual(m.rearExit, { position: 'rear' });
  assert.strictEqual(L.getMarkers(L.flipDoorSide(L.createLayout())).driverSeat.side, 'right');
});

test('validation rejects bad input', () => {
  assert.throws(() => L.createLayout({ rows: 0 }));
  assert.throws(() => L.createLayout({ rows: 2.5 }));
  assert.throws(() => L.setSeatsPerSide(L.createLayout(), 'middle', 2));
  assert.throws(() => L.setSeatsPerSide(L.createLayout(), 'door', -1));
  assert.throws(() => L.setBenchOverride(L.createLayout(), 11, 'door', 2));
  assert.throws(() => L.createLayout({ rows: 3, wheelchair: { enabled: true, rows: 3 } }));
});
