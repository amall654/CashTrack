(() => {
  const key = 'cashtrack.expenses.v1';
  const categories = ['الطعام والمشروبات', 'المواصلات', 'التسوق', 'الفواتير', 'الترفيه', 'الصحة', 'أخرى'];
  function validate(records) {
    if (!Array.isArray(records)) throw new Error('صيغة البيانات المحفوظة غير صالحة.');
    const ids = new Set();
    let total = 0;
    return records.map((record) => {
      if (!record || typeof record.id !== 'string' || !record.id.trim() || ids.has(record.id)
        || !Number.isSafeInteger(record.amountCents) || record.amountCents < 1 || record.amountCents > 100000000
        || !categories.includes(record.category) || typeof record.description !== 'string' || record.description.length > 60
        || typeof record.date !== 'string' || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(record.date)) {
        throw new Error('تحتوي البيانات على سجل غير صالح. لم يتم تغيير البيانات الأصلية.');
      }
      const date = new Date(`${record.date}T00:00:00Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== record.date) throw new Error('تاريخ محفوظ غير صالح.');
      ids.add(record.id);
      total += record.amountCents;
      if (!Number.isSafeInteger(total)) throw new Error('إجمالي المبالغ يتجاوز الحد المسموح.');
      return { id: record.id, amountCents: record.amountCents, category: record.category, date: record.date, description: record.description };
    });
  }
  function load() {
    const raw = window.localStorage.getItem(key);
    return raw === null ? [] : validate(JSON.parse(raw));
  }
  function save(records) {
    const clean = validate(records);
    window.localStorage.setItem(key, JSON.stringify(clean));
    return clean;
  }
  window.CashTrackStorage = Object.freeze({ key, categories, load, save, validate });
})();
