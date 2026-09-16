const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const context = { window: {}, Intl };
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../js/expense-chart.js'), 'utf8'), context);
const summarize = context.window.CashTrackChart.summarize;
test('empty chart has zero total and no segments', () => {
  const result = summarize([]);
  assert.equal(result.totalCents, 0);
  assert.equal(result.groups.length, 0);
});
test('groups amounts in halalas and calculates shares', () => {
  const result = summarize([
    { amountCents: 1000, category: 'الصحة' },
    { amountCents: 2000, category: 'الصحة' },
    { amountCents: 1000, category: 'التسوق' },
  ]);
  assert.equal(result.totalCents, 4000);
  assert.equal(result.groups.find(g => g.category === 'الصحة').ratio, 0.75);
  assert.equal(result.groups.find(g => g.category === 'التسوق').ratio, 0.25);
});
test('invalid amounts are excluded and legacy categories use Other', () => {
  const result = summarize([
    { amountCents: -5, category: 'الصحة' },
    { amountCents: 1.5, category: 'الصحة' },
    { amountCents: NaN, category: 'الصحة' },
    { amountCents: 1250, category: 'قديم' },
  ]);
  assert.equal(result.totalCents, 1250);
  assert.equal(result.groups[0].category, 'أخرى');
  assert.equal(result.groups[0].ratio, 1);
});
