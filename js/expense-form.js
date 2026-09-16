(() => {
  const dialog = document.querySelector('#expense-dialog');
  const form = document.querySelector('#expense-form');
  const fields = ['amount', 'category', 'date', 'description'];
  const feedback = document.querySelector('#form-feedback');
  const title = document.querySelector('#dialog-title');
  const submit = form.querySelector('[type="submit"]');
  let editingId = null;
  let returnFocus = null;

  function clearError(name) {
    form.elements[name].removeAttribute('aria-invalid');
    document.querySelector(`#${name}-error`).textContent = '';
  }

  function resetForm() {
    form.reset();
    fields.forEach(clearError);
    feedback.textContent = '';
    const today = new Date();
    form.elements.date.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  function open(expense = null) {
    returnFocus = document.activeElement;
    resetForm();
    editingId = expense ? expense.id : null;
    title.textContent = expense ? 'تعديل المصروف' : 'إضافة مصروف';
    submit.textContent = expense ? 'حفظ التعديلات' : 'إضافة المصروف';
    if (expense) {
      form.elements.amount.value = (expense.amountCents / 100).toFixed(2);
      form.elements.category.value = expense.category;
      form.elements.date.value = expense.date;
      form.elements.description.value = expense.description || '';
    }
    dialog.showModal();
    form.elements.amount.focus();
  }
  window.CashTrackForm = Object.freeze({ openCreate: () => open(), openEdit: (expense) => open(expense) });
  document.querySelector('#open-expense').addEventListener('click', () => open());
  document.querySelector('#cancel-expense').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    editingId = null;
    resetForm();
    if (returnFocus?.isConnected) returnFocus.focus();
    else document.querySelector('#open-expense').focus();
  });
  document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  fields.forEach((name) => {
    form.elements[name].addEventListener('input', () => {
      clearError(name);
      feedback.textContent = '';
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    fields.forEach(clearError);
    const amount = Number(form.elements.amount.value);
    const category = form.elements.category.value;
    const date = form.elements.date.value;
    const description = form.elements.description.value.trim();
    const errors = {};
    if (!form.elements.amount.value || !Number.isFinite(amount) || amount <= 0) {
      errors.amount = 'أدخلي مبلغًا أكبر من صفر.';
    } else if (amount > 1000000) {
      errors.amount = 'الحد الأعلى للمصروف هو ١٬٠٠٠٬٠٠٠ ريال.';
    } else if (form.elements.amount.validity.stepMismatch) {
      errors.amount = 'استخدمي منزلتين عشريتين كحد أقصى للمبلغ.';
    }
    if (!category || !Array.from(form.elements.category.options).some((option) => option.value === category)) {
      errors.category = 'اختاري تصنيفًا للمصروف.';
    }
    if (!date || !form.elements.date.validity.valid) errors.date = 'أدخلي تاريخًا صحيحًا للمصروف.';
    if (description.length > 60) errors.description = 'الوصف يجب ألا يتجاوز ٦٠ حرفًا.';
    for (const [name, message] of Object.entries(errors)) {
      form.elements[name].setAttribute('aria-invalid', 'true');
      document.querySelector(`#${name}-error`).textContent = message;
    }
    if (Object.keys(errors).length) {
      feedback.textContent = 'تعذر الحفظ. راجعي الحقول الموضحة.';
      form.elements[Object.keys(errors)[0]].focus();
      return;
    }

    // Public integration contract: monetary values are integer halalas.
    // A synchronous consumer may preventDefault() if saving fails.
    const accepted = form.dispatchEvent(new CustomEvent(editingId === null ? 'expense:create' : 'expense:update', {
      bubbles: true,
      cancelable: true,
      detail: { id: editingId ?? crypto.randomUUID(), amountCents: Math.round(amount * 100), category, date, description },
    }));
    if (!accepted) {
      feedback.textContent = 'لم يتم حفظ المصروف. حاولي مرة أخرى.';
      return;
    }
    resetForm();
    dialog.close();
  });
})();
