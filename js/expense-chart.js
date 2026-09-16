(() => {
  const palette = ['#176b45', '#64833c', '#438b9b', '#ae7540', '#8163a5', '#b14f74', '#68757c'];
  const categories = ['الطعام والمشروبات', 'المواصلات', 'التسوق', 'الفواتير', 'الترفيه', 'الصحة', 'أخرى'];
  const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 });
  const percentage = new Intl.NumberFormat('ar-SA', { style: 'percent', maximumFractionDigits: 1 });

  function summarize(expenses) {
    const totals = new Map();
    for (const expense of expenses) {
      if (!Number.isSafeInteger(expense.amountCents) || expense.amountCents <= 0) continue;
      const category = categories.includes(expense.category) ? expense.category : 'أخرى';
      totals.set(category, (totals.get(category) || 0) + expense.amountCents);
    }
    const totalCents = [...totals.values()].reduce((sum, value) => sum + value, 0);
    return { totalCents, groups: categories.filter((name) => totals.has(name)).map((category) => ({
      category, amountCents: totals.get(category), ratio: totals.get(category) / totalCents,
      color: palette[categories.indexOf(category)],
    })) };
  }

  function render(expenses, { filtered = false } = {}) {
    const { totalCents, groups } = summarize(expenses);
    const donut = document.querySelector('#expense-chart');
    const legend = document.querySelector('#chart-legend');
    const empty = document.querySelector('#chart-empty');
    document.querySelector('#chart-scope').textContent = filtered ? 'النتائج المطابقة' : 'جميع المصروفات';
    document.querySelector('#chart-count').textContent = money.format(groups.length);
    legend.replaceChildren();
    empty.hidden = groups.length > 0;
    empty.textContent = filtered ? 'لا توجد بيانات للرسم ضمن التصفية الحالية.' : 'أضيفي أول مصروف ليظهر توزيع إنفاقك.';
    let position = 0;
    const segments = groups.map((group) => {
      const start = position;
      position += group.ratio * 100;
      const row = document.createElement('div');
      const dot = document.createElement('i');
      dot.className = 'dot';
      dot.style.backgroundColor = group.color;
      dot.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = group.category;
      const value = document.createElement('b');
      value.textContent = percentage.format(group.ratio);
      row.title = `${money.format(group.amountCents / 100)} ر.س`;
      row.append(dot, label, value);
      legend.append(row);
      return `${group.color} ${start}% ${position}%`;
    });
    donut.style.background = segments.length ? `conic-gradient(${segments.join(',')})` : '#e4ece5';
    donut.setAttribute('aria-label', groups.length
      ? `إجمالي ${money.format(totalCents / 100)} ريال. ${groups.map((group) => `${group.category}: ${money.format(group.amountCents / 100)} ريال، ${percentage.format(group.ratio)}`).join('؛ ')}`
      : 'لا توجد مصروفات لعرض توزيعها');
  }
  window.CashTrackChart = Object.freeze({ render, summarize });
})();
