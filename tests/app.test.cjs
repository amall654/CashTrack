const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = (file) => fs.readFileSync(path.join(__dirname, '../js', file), 'utf8');
const record = (id, amountCents = 1235, category = 'الصحة', date = '2026-09-16') => ({ id, amountCents, category, date, description: '' });

function memoryStorage() {
  const data = new Map();
  return { data, failRead: false, failWrite: false,
    getItem(key) { if (this.failRead) throw new Error('SecurityError'); return data.get(key) ?? null; },
    setItem(key, value) { if (this.failWrite) throw new Error('QuotaExceededError'); data.set(key, value); },
  };
}
function boot(localStorage = memoryStorage()) {
  function target() {
    const listeners = new Map();
    return { textContent: '', dataset: {}, hidden: false, focus() {},
      addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
      dispatch(type, detail) {
        const event = { detail, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
        for (const fn of listeners.get(type) || []) fn(event);
        return event;
      },
    };
  }
  const nodes = new Map();
  const document = target();
  document.querySelector = (selector) => { if (!nodes.has(selector)) nodes.set(selector, target()); return nodes.get(selector); };
  const filters = document.querySelector('#expense-filters');
  filters.elements = Object.fromEntries(['category', 'from', 'to', 'sort'].map((key) => [key, { value: key === 'sort' ? 'newest' : '' }]));
  filters.reset = () => Object.entries(filters.elements).forEach(([key, item]) => { item.value = key === 'sort' ? 'newest' : ''; });
  const window = Object.assign(target(), { localStorage, confirm: () => true });
  let rendered;
  window.CashTrackUI = { render(expenses, options) { rendered = JSON.parse(JSON.stringify({ expenses, ...options })); } };
  const context = vm.createContext({ window, document, Date, console });
  vm.runInContext(read('storage.js'), context);
  vm.runInContext(read('app.js'), context);
  return { window, document, filters, node: document.querySelector, get view() { return rendered; },
    create(value) { return document.querySelector('#expense-form').dispatch('expense:create', value); },
    update(value) { return document.querySelector('#expense-form').dispatch('expense:update', value); },
  };
}

test('starts empty, persists creation and edits across reloads', () => {
  const storage = memoryStorage();
  let app = boot(storage);
  assert.equal(app.view.totalCents, 0);
  assert.equal(app.view.expenses.length, 0);
  assert.equal(app.create(record('one')).defaultPrevented, false);
  app = boot(storage);
  assert.equal(app.view.totalCents, 1235);
  app.update(record('one', 1999));
  app = boot(storage);
  assert.equal(app.view.totalCents, 1999);
  assert.equal(app.view.expenses.length, 1);
});
test('deletion requires confirmation and remains deleted after reload', () => {
  const storage = memoryStorage();
  const app = boot(storage);
  app.create(record('one'));
  app.window.confirm = () => false;
  app.document.dispatch('expense:delete', { id: 'one' });
  assert.equal(app.view.expenses.length, 1);
  app.window.confirm = () => true;
  app.document.dispatch('expense:delete', { id: 'one' });
  assert.equal(boot(storage).view.expenses.length, 0);
});
test('filters inclusive dates and category, sorts and resets empty results', () => {
  const app = boot();
  app.create(record('a', 100, 'الصحة', '2026-09-15'));
  app.create(record('b', 200, 'الصحة', '2026-09-16'));
  app.create(record('c', 500, 'التسوق', '2026-09-17'));
  assert.deepEqual(app.view.expenses.map(x => x.id), ['c', 'b', 'a']);
  app.filters.elements.category.value = 'الصحة';
  app.filters.elements.from.value = '2026-09-16';
  app.filters.elements.to.value = '2026-09-16';
  app.filters.dispatch('change');
  assert.equal(app.view.totalCents, 200);
  assert.equal(app.view.filtered, true);
  app.filters.elements.from.value = '2026-09-18';
  app.filters.dispatch('input');
  assert.equal(app.view.expenses.length, 0);
  assert.ok(app.node('#filter-error').textContent);
  app.document.dispatch('expenses:reset-filters');
  assert.equal(app.view.totalCents, 800);
  assert.equal(app.view.filtered, false);
  app.filters.elements.sort.value = 'oldest';
  app.filters.dispatch('change');
  assert.deepEqual(app.view.expenses.map(x => x.id), ['a', 'b', 'c']);
  app.filters.elements.sort.value = 'amount-desc';
  app.filters.dispatch('change');
  assert.deepEqual(app.view.expenses.map(x => x.amountCents), [500, 200, 100]);
  app.filters.elements.category.value = 'الفواتير';
  app.filters.dispatch('change');
  assert.equal(app.view.expenses.length, 0);
  app.node('#reset-filters').dispatch('click');
  assert.equal(app.view.expenses.length, 3);
});
test('failed writes cancel create/update and preserve records on delete', () => {
  const storage = memoryStorage();
  const app = boot(storage);
  app.create(record('a'));
  storage.failWrite = true;
  assert.equal(app.create(record('b')).defaultPrevented, true);
  assert.equal(app.update(record('a', 500)).defaultPrevented, true);
  app.document.dispatch('expense:delete', { id: 'a' });
  assert.equal(app.view.totalCents, 1235);
  assert.equal(boot(storage).view.totalCents, 1235);
  assert.equal(app.node('#storage-status').dataset.state, 'error');
  storage.failWrite = false;
  assert.equal(app.update(record('a', 500)).defaultPrevented, false);
  assert.equal(app.view.totalCents, 500);
});
test('blocked reads can recover; malformed saved records are never overwritten', () => {
  const storage = memoryStorage();
  storage.failRead = true;
  const app = boot(storage);
  assert.equal(app.create(record('a')).defaultPrevented, true);
  storage.failRead = false;
  app.node('#retry-storage').dispatch('click');
  assert.equal(app.create(record('a')).defaultPrevented, false);
  for (const bad of ['{broken', '{}', JSON.stringify([record('a'), record('a')]), JSON.stringify([record('a', 0)]), JSON.stringify([record('a', 100, 'الصحة', '2026-02-30')])]) {
    storage.setItem(app.window.CashTrackStorage.key, bad);
    const broken = boot(storage);
    assert.equal(broken.create(record('new')).defaultPrevented, true);
    assert.equal(storage.getItem(app.window.CashTrackStorage.key), bad);
  }
});
test('rejects invalid record fields before writing', () => {
  const app = boot();
  for (const changes of [{ amountCents: 1.5 }, { amountCents: 100000001 }, { category: 'invalid' }, { description: 'x'.repeat(61) }, { date: '0000-01-01' }, { id: '' }]) {
    assert.equal(app.create({ ...record('a'), ...changes }).defaultPrevented, true);
  }
  assert.equal(app.view.totalCents, 0);
});
