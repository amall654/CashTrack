// Temporary, in-memory preview only. Amal replaces this file with app.js.
(() => {
  let previewExpenses = [];
  document.querySelector('#year').textContent = new Date().getFullYear();
  const form = document.querySelector('#expense-form');
  const feedback = document.querySelector('#demo-feedback');
  function renderPreview() {
    window.CashTrackUI.render(previewExpenses, {
      totalCents: previewExpenses.reduce((sum, expense) => sum + expense.amountCents, 0),
    });
  }
  form.addEventListener('expense:create', (event) => {
    previewExpenses = [event.detail, ...previewExpenses];
    renderPreview();
    feedback.textContent = 'تمت إضافة المصروف إلى التجربة المؤقتة.';
  });
  form.addEventListener('expense:update', (event) => {
    if (!previewExpenses.some((expense) => expense.id === event.detail.id)) {
      event.preventDefault();
      return;
    }
    previewExpenses = previewExpenses.map((expense) => expense.id === event.detail.id ? event.detail : expense);
    renderPreview();
    feedback.textContent = 'تم تحديث المصروف والرسم في التجربة المؤقتة.';
  });
  renderPreview();
})();
