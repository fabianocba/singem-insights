export function setSelectOptions(select, options = [], includeBlank = false, blankLabel = 'Selecione...') {
  if (!select) {
    return;
  }

  const html = [];
  if (includeBlank) {
    html.push(`<option value="">${blankLabel}</option>`);
  }

  options.forEach((option) => {
    if (typeof option === 'object') {
      html.push(`<option value="${option.value}">${option.label}</option>`);
      return;
    }

    html.push(`<option value="${option}">${option}</option>`);
  });

  select.innerHTML = html.join('');
}
