(function (root) {
  'use strict';

  // Fake route for trying the app and previewing exports. Pure: pass a rng (0 <= n < 1) for repeatable output.
  var FIRST = ['Ava', 'Liam', 'Noah', 'Mia', 'Ethan', 'Zoe', 'Lucas', 'Ella', 'Mason', 'Ruby', 'Owen', 'Nora', 'Leo', 'Isla', 'Eli',
    'Maya', 'Finn', 'Hazel', 'Jude', 'Aria', 'Theo', 'Luna', 'Kai', 'Ivy', 'Ezra', 'Cora', 'Sam', 'Tess', 'Omar', 'Priya'];
  var LAST = ['Nguyen', 'Garcia', 'Smith', 'Patel', 'Johnson', 'Kim', 'Brown', 'Lopez', 'Davis', 'Khan', 'Miller', 'Chen',
    'Wilson', 'Reyes', 'Moore', 'Singh', 'Clark', 'Diaz', 'Hall', 'Okafor'];
  var SCHOOLS = ['Oak Elementary', 'Maple Middle', 'Riverside Elementary'];

  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function dep(name) {
    return (typeof require === 'function' && typeof module !== 'undefined') ? require('./' + name + '.js') : root.BusApp[name];
  }

  function generate(rng) {
    rng = rng || Math.random;
    var Layout = dep('busLayout'), Features = dep('seatFeatures'), Roster = dep('roster');
    function pick(list) { return list[Math.floor(rng() * list.length)]; }
    function shuffle(list) {
      var a = list.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    }

    var layout = Layout.createLayout({ rows: 11, driverSeats: 3, doorSeats: 2, wheelchair: { enabled: true, rows: 2 } });
    var seats = Layout.getSeats(layout).map(function (s) { return s.id; });
    var wcSpots = Layout.getWheelchairSpots(layout).map(function (s) { return s.id; });

    // Unique names.
    var used = {}, students = [];
    while (students.length < 34) {
      var name = pick(FIRST) + ' ' + pick(LAST);
      if (used[name]) continue;
      used[name] = true;
      students.push({ id: 's' + (students.length + 1), name: name, school: pick(SCHOOLS), needs: {} });
    }

    // The last two students use wheelchairs; a few others need a car seat, 5-star belt or harness.
    var needKeys = ['carSeat', 'fiveStarBelt', 'harnessAttachment'];
    students[students.length - 1].needs.wheelchair = true;
    students[students.length - 2].needs.wheelchair = true;
    var needy = shuffle(students.slice(0, students.length - 2)).slice(0, 6);
    needy.forEach(function (s, i) { s.needs[needKeys[i % 3]] = true; });

    var order = shuffle(seats), roster = {}, features = {};
    function placeStudent(s, seatId) { roster = Roster.assign(roster, layout, s.id, seatId); }
    students.forEach(function (s) {
      if (s.needs.wheelchair) { placeStudent(s, wcSpots.shift()); return; }
      var seatId = order.shift();
      placeStudent(s, seatId);
      needKeys.forEach(function (k) { if (s.needs[k]) features = Features.toggleFeature(features, seatId, k); });
    });

    // Baseline is the roster as built. "After" moves a few students so the change log has rows.
    var after = roster, moved = 0, seated = students.filter(function (s) { return !s.needs.wheelchair; });
    var plain = shuffle(seated.filter(function (s) { return !Object.keys(s.needs).length; }));
    while (moved < 4 && plain.length >= 2) {
      after = Roster.swap(after, plain.pop().id, plain.pop().id);
      moved++;
    }
    if (order.length) after = Roster.place(after, layout, plain.length ? plain.pop().id : seated[0].id, order.shift());
    // One deliberate wrong-seat example: a student who needs a car seat sits somewhere without one.
    var wrongStudent = needy.filter(function (s) { return s.needs.carSeat; })[0];
    if (wrongStudent && order.length) after = Roster.place(after, layout, wrongStudent.id, order.shift());

    return { layout: layout, students: students, features: features, baselineRoster: roster, roster: after };
  }

  var api = { generate: generate, mulberry: mulberry };
  root.BusApp = root.BusApp || {};
  root.BusApp.sampleData = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
