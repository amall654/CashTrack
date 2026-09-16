const dialog = document.querySelector('#expense-dialog');
const form = document.querySelector('#expense-form');
const formatter = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 });
let totalCents = 185000;

document.querySelector('#year').textContent = new Date().getFullYear();
document.querySelector('#open-expense').addEventListener('click', () => dialog.showModal());
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }
});
form.elements.description.addEventListener('input', (event) => event.target.setCustomValidity(''));
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const description = form.elements.description.value.trim();
  if (!description) {
    form.elements.description.setCustomValidity('يرجى كتابة وصف للمصروف.');
    form.elements.description.reportValidity();
    return;
  }
  if (!form.reportValidity()) return;
  const amount = Number(form.elements.amount.value);
  if (!Number.isFinite(amount) || amount <= 0) return;
  totalCents += Math.round(amount * 100);
  document.querySelector('#expense-total').textContent = formatter.format(totalCents / 100);

  const row = document.createElement('div');
  row.className = 'expense-row';
  const icon = document.createElement('span');
  icon.className = 'expense-icon travel-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '✓';
  const details = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = description;
  const category = document.createElement('small');
  category.textContent = form.elements.category.value;
  details.append(title, category);
  const value = document.createElement('b');
  value.textContent = `${formatter.format(amount)} ر.س`;
  row.append(icon, details, value);
  const list = document.querySelector('#expense-list');
  list.prepend(row);
  while (list.children.length > 2) list.lastElementChild.remove();
  document.querySelector('#demo-feedback').textContent = `تمت إضافة «${description}» إلى المعاينة. الرسم توضيحي ثابت.`;
  form.reset();
  dialog.close();
});
