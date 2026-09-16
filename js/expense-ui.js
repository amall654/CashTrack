(() => {
  const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 });

  // Presentation only: the caller owns records, filtering, persistence and totals.
  function render(expenses, { filtered = false, totalCents = 0 } = {}) {
    const list = document.querySelector('#expense-list');
    list.replaceChildren();
    document.querySelector('#expense-total').textContent = money.format(totalCents / 100);
    document.querySelector('#total-label').textContent = filtered ? 'إجمالي النتائج' : 'إجمالي المصروفات';
    document.querySelector('#expense-list-heading').textContent = filtered ? 'نتائج التصفية' : 'المصروفات';
    const empty = document.querySelector('#expense-empty');
    empty.hidden = expenses.length > 0;
    document.querySelector('#empty-title').textContent = filtered ? 'لا توجد نتائج مطابقة' : 'ابدئي بأول مصروف';
    document.querySelector('#empty-description').textContent = filtered ? 'جرّبي تصنيفًا أو فترة مختلفة.' : 'سجّلي مبلغًا بسيطًا لتري تفاصيل إنفاقك هنا.';
    document.querySelector('#empty-add').hidden = filtered;
    document.querySelector('#empty-reset').hidden = !filtered;
    for (const expense of expenses) {
      const row = document.createElement('div');
      row.className = 'expense-row';
      const details = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = expense.description || expense.category;
      const category = document.createElement('small');
      category.textContent = expense.category;
      const date = document.createElement('time');
      date.dateTime = expense.date;
      date.textContent = expense.date;
      details.append(title, category, date);
      const amount = document.createElement('b');
      amount.textContent = `${money.format(expense.amountCents / 100)} ر.س`;
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'edit-expense';
      edit.textContent = 'تعديل';
      edit.setAttribute('aria-label', `تعديل ${expense.description || expense.category}`);
      edit.addEventListener('click', () => window.CashTrackForm.openEdit(expense));
      row.append(details, amount, edit);
      list.append(row);
    }
    window.CashTrackChart.render(expenses, { filtered });
  }
  document.querySelector('#empty-add').addEventListener('click', () => window.CashTrackForm.openCreate());
  document.querySelector('#empty-reset').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('expenses:reset-filters'));
  });
  window.CashTrackUI = Object.freeze({ render });
})();
