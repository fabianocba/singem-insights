export function confirmAction(message) {
  return window.confirm(message);
}

export function alertInfo(message) {
  window.alert(message);
}

export function closeById(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('hidden');
  }
}
