export function getFieldValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

export function focusField(id) {
  const el = document.getElementById(id);
  if (el) {
    el.focus();
  }
}
