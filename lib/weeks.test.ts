// Quick checks for lib/weeks.ts. Run (no extra dependencies):
//   node node_modules/typescript/bin/tsc lib/weeks.ts lib/weeks.test.ts --module commonjs --target es2020 --outDir .test-build
//   node .test-build/weeks.test.js
import assert from 'node:assert/strict';

import {
  addWeeks, firstWeekOfMonth, formatWeekRange, getWeekEnd, getWeekStart, monthOfWeek, relationToNow, toISODate,
} from './weeks';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const iso = (x: Date) => toISODate(x);
let n = 0;
const test = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log('ok -', name);
};

test('getWeekStart: any day maps to its Monday (Sunday belongs to the previous Monday)', () => {
  assert.equal(iso(getWeekStart(d(2026, 11, 9))), '2026-11-09'); // Monday
  assert.equal(iso(getWeekStart(d(2026, 11, 12))), '2026-11-09'); // Thursday
  assert.equal(iso(getWeekStart(d(2026, 11, 15))), '2026-11-09'); // Sunday
  assert.equal(iso(getWeekStart(d(2026, 11, 16))), '2026-11-16');
});

test('formatWeekRange: week inside one month', () => {
  assert.equal(formatWeekRange(d(2026, 11, 9)), '9 – 15 de noviembre');
});

test('formatWeekRange: week that crosses a month', () => {
  assert.equal(formatWeekRange(d(2026, 11, 30)), '30 nov – 6 dic');
  assert.equal(formatWeekRange(d(2026, 10, 26)), '26 oct – 1 nov');
});

test('formatWeekRange: week that crosses a year (December to January)', () => {
  assert.equal(formatWeekRange(d(2026, 12, 28)), '28 dic – 3 ene');
  assert.equal(iso(getWeekEnd(d(2026, 12, 28))), '2027-01-03');
});

test('addWeeks: forward/back, across a month and across a year', () => {
  assert.equal(iso(addWeeks(d(2026, 11, 23), 1)), '2026-11-30');
  assert.equal(iso(addWeeks(d(2026, 12, 28), 1)), '2027-01-04');
  assert.equal(iso(addWeeks(d(2027, 1, 4), -1)), '2026-12-28');
  assert.equal(iso(addWeeks(d(2026, 11, 9), 0)), '2026-11-09');
});

test('addWeeks: stays on Monday midnight over daylight-saving changes', () => {
  // Spring and autumn transitions in the US and Europe.
  for (const start of [d(2026, 3, 2), d(2026, 3, 23), d(2026, 10, 19), d(2026, 10, 26), d(2026, 11, 2)]) {
    for (let k = 1; k <= 3; k++) {
      const w = addWeeks(start, k);
      assert.equal(w.getDay(), 1);
      assert.equal(w.getHours(), 0);
    }
  }
});

test('firstWeekOfMonth: month change from the selector jumps to that month\'s first Monday', () => {
  assert.equal(iso(firstWeekOfMonth(2026, 11)), '2026-11-02'); // the 1st is a Sunday
  assert.equal(iso(firstWeekOfMonth(2026, 12)), '2026-12-07'); // the 1st is a Tuesday
  assert.equal(iso(firstWeekOfMonth(2027, 1)), '2027-01-04'); // the 1st is a Friday
  assert.equal(iso(firstWeekOfMonth(2026, 6)), '2026-06-01'); // the 1st is already a Monday
});

test('year change keeps the month: December 2026 -> December 2027', () => {
  const { month } = monthOfWeek(d(2026, 12, 28));
  assert.equal(iso(firstWeekOfMonth(2027, month)), '2027-12-06');
});

test('monthOfWeek uses the Monday (30 Nov - 6 Dec belongs to November)', () => {
  assert.deepEqual(monthOfWeek(d(2026, 11, 30)), { month: 11, year: 2026 });
  assert.deepEqual(monthOfWeek(d(2026, 12, 28)), { month: 12, year: 2026 });
});

test('arrows crossing a month update month and year', () => {
  assert.deepEqual(monthOfWeek(addWeeks(d(2026, 11, 23), 1)), { month: 11, year: 2026 });
  assert.deepEqual(monthOfWeek(addWeeks(d(2026, 11, 30), 1)), { month: 12, year: 2026 });
  assert.deepEqual(monthOfWeek(addWeeks(d(2026, 12, 28), 1)), { month: 1, year: 2027 });
});

test('relationToNow: actual / pasada / proxima / none', () => {
  const now = d(2026, 11, 11); // a Wednesday
  assert.equal(relationToNow(d(2026, 11, 9), now), 'actual');
  assert.equal(relationToNow(d(2026, 11, 2), now), 'pasada');
  assert.equal(relationToNow(d(2026, 11, 16), now), 'proxima');
  assert.equal(relationToNow(d(2026, 11, 23), now), null);
  assert.equal(relationToNow(d(2026, 10, 26), now), null);
});

console.log(`\n${n} tests passed`);
