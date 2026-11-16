const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/busLayout.js');

test('defaults: 11 rows, 3 driver-side, 2 door-side, door on right, no wheelchair', () => {
  const layout = L.createLayout();
  assert.strictEqual(layout.rows, 11);
  assert.strictEqual(layout.doorSide, 'right');
  assert.strictEqual(layout.wheelchair.enabled, false);
  const benches = L.getBenches(layout);
  assert.strictEqual(benches.length, 11);
  assert.strictEqual(benches[0].driver.length, 3);
  assert.strictEqual(benches[0].door.length, 2);
  assert.strictEqual(L.getSeats(layout).length, 55);
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
  assert.strictEqual(benches.length, 11);
  assert.strictEqual(benches[8].wheelchair, false);
  for (const b of benches.slice(9)) {
    assert.strictEqual(b.wheelchair, true);
    assert.strictEqual(b.driver.length, 0);
    assert.strictEqual(b.door.length, 0);
  }
  assert.strictEqual(L.getSeats(layout).length, 9 * 5);
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
  assert.throws(() => L.setBenchOverride(L.createLayout(), 12, 'door', 2));
  assert.throws(() => L.createLayout({ rows: 3, wheelchair: { enabled: true, rows: 3 } }));
});

test('emergency window exits: set per row and side, shown on benches, dropped when the row goes away', () => {
  let layout = L.createLayout({ rows: 6 });
  assert.deepStrictEqual(layout.emergencyWindows, {});
  layout = L.setEmergencyWindow(layout, 3, 'driver', true);
  layout = L.setEmergencyWindow(layout, 3, 'door', true);
  layout = L.setEmergencyWindow(layout, 5, 'door', true);
  assert.strictEqual(L.hasEmergencyWindow(layout, 3, 'driver'), true);
  assert.strictEqual(L.hasEmergencyWindow(layout, 4, 'driver'), false);
  const b = L.getBenches(layout);
  assert.deepStrictEqual([b[2].driverWindow, b[2].doorWindow, b[4].driverWindow, b[4].doorWindow], [true, true, false, true]);
  layout = L.setEmergencyWindow(layout, 3, 'driver', false);
  assert.strictEqual(L.hasEmergencyWindow(layout, 3, 'driver'), false);
  assert.strictEqual(L.hasEmergencyWindow(L.createLayout(Object.assign({}, layout, { rows: 4 })), 5, 'door'), false);
  assert.throws(() => L.setEmergencyWindow(layout, 99, 'door', true), /out of range/);
  assert.throws(() => L.setEmergencyWindow(layout, 1, 'rear', true), /unknown side/);
});

test('emergency windows never show on wheelchair rows and survive other layout changes', () => {
  let layout = L.createLayout({ rows: 6, wheelchair: { enabled: true, rows: 2 } });
  layout = L.setEmergencyWindow(layout, 5, 'door', true);
  assert.strictEqual(L.getBenches(layout)[4].doorWindow, false);
  layout = L.flipDoorSide(L.setSeatsPerSide(L.setEmergencyWindow(layout, 2, 'driver', true), 'door', 3));
  assert.strictEqual(L.hasEmergencyWindow(layout, 2, 'driver'), true);
});

test('seat labels: driver side odd, door side even, A is the window seat', () => {
  const layout = L.createLayout();
  const [b1, b2] = L.getBenches(layout);
  assert.deepStrictEqual(b1.driver.map(s => s.label), ['A1', 'B1', 'C1']);
  assert.deepStrictEqual(b1.door.map(s => s.label), ['B2', 'A2']);
  assert.deepStrictEqual(b2.driver.map(s => s.label), ['A3', 'B3', 'C3']);
  assert.deepStrictEqual(b2.door.map(s => s.label), ['B4', 'A4']);
  const flipped = L.getBenches(L.flipDoorSide(layout))[0];
  assert.deepStrictEqual(flipped.driver.map(s => s.label), ['C1', 'B1', 'A1']);
  assert.deepStrictEqual(flipped.door.map(s => s.label), ['A2', 'B2']);
});
