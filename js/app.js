(() => {
  const form = document.querySelector('#expense-form');
  const filters = document.querySelector('#expense-filters');
  const feedback = document.querySelector('#demo-feedback');
  const storageStatus = document.querySelector('#storage-status');
  const retry = document.querySelector('#retry-storage');
  let expenses = [];
  let ready = false;

  document.querySelector('#year').textContent = new Date().getFullYear();
  function render() {
    const { category, from, to, sort } = filters.elements;
    const invalidRange = Boolean(from.value && to.value && from.value > to.value);
    document.querySelector('#filter-error').textContent = invalidRange ? 'تاريخ البداية يجب أن يسبق تاريخ النهاية.' : '';
    const visible = expenses.filter((expense) => !invalidRange
      && (!category.value || expense.category === category.value)
      && (!from.value || expense.date >= from.value)
      && (!to.value || expense.date <= to.value));
    visible.sort((a, b) => {
      if (sort.value === 'amount-desc') return b.amountCents - a.amountCents || b.date.localeCompare(a.date);
      if (sort.value === 'oldest') return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
      return b.date.localeCompare(a.date) || a.id.localeCompare(b.id);
    });
    window.CashTrackUI.render(visible, {
      filtered: Boolean(category.value || from.value || to.value),
      totalCents: visible.reduce((sum, expense) => sum + expense.amountCents, 0),
    });
  }
  function reportFailure(message) {
    storageStatus.textContent = message;
    storageStatus.dataset.state = 'error';
    retry.hidden = false;
  }
  function load() {
    try {
      expenses = window.CashTrackStorage.load();
      ready = true;
      storageStatus.textContent = 'تُحفظ المصروفات في هذا المتصفح بعد نجاح كل عملية.';
      delete storageStatus.dataset.state;
      retry.hidden = true;
    } catch {
      ready = false;
      reportFailure('تعذر قراءة البيانات: التخزين محظور أو البيانات غير صالحة. لم نغيّر البيانات المحفوظة. تحققي من إعدادات المتصفح ثم أعيدي المحاولة.');
    }
    render();
  }
  function commit(next, message) {
    if (!ready) {
      reportFailure('تعذر الحفظ قبل تحميل البيانات بنجاح. أعيدي محاولة قراءة التخزين أولًا.');
      return false;
    }
    try {
      // Persist first: failed writes must never change the displayed records.
      expenses = window.CashTrackStorage.save(next);
      storageStatus.textContent = 'تم حفظ آخر تغيير في هذا المتصفح.';
      delete storageStatus.dataset.state;
      retry.hidden = true;
      render();
      feedback.textContent = message;
      return true;
    } catch {
      reportFailure('تعذر حفظ التغيير؛ قد تكون مساحة التخزين ممتلئة أو الحفظ محظورًا. بقيت المصروفات دون تغيير.');
      return false;
    }
  }
  form.addEventListener('expense:create', (event) => {
    if (!commit([event.detail, ...expenses], 'تمت إضافة المصروف وحفظه. قد تخفيه التصفية الحالية.')) event.preventDefault();
  });
  form.addEventListener('expense:update', (event) => {
    if (!expenses.some((expense) => expense.id === event.detail.id)) {
      event.preventDefault();
      feedback.textContent = 'لم يعد هذا المصروف موجودًا. أغلقي النموذج وراجعي القائمة.';
      return;
    }
    if (!commit(expenses.map((expense) => expense.id === event.detail.id ? event.detail : expense), 'تم حفظ تعديلات المصروف.')) event.preventDefault();
  });
  document.addEventListener('expense:delete', (event) => {
    const expense = expenses.find((item) => item.id === event.detail.id);
    if (!expense || !window.confirm(`هل تريدين حذف المصروف «${expense.description || expense.category}»؟`)) return;
    if (commit(expenses.filter((item) => item.id !== expense.id), 'تم حذف المصروف وحفظ التغيير.')) document.querySelector('#open-expense').focus();
  });
  filters.addEventListener('submit', (event) => event.preventDefault());
  filters.addEventListener('input', render);
  filters.addEventListener('change', render);
  function resetFilters() { filters.reset(); render(); }
  document.querySelector('#reset-filters').addEventListener('click', resetFilters);
  document.addEventListener('expenses:reset-filters', resetFilters);
  retry.addEventListener('click', load);
  window.addEventListener('storage', (event) => {
    if (event.key === window.CashTrackStorage.key || event.key === null) load();
  });
  load();
})();
