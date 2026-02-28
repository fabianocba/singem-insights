export function attachDigitsOnly(input) {
  if (!input) {
    return;
  }

  input.addEventListener('input', () => {
    input.value = String(input.value || '').replace(/\D/g, '');
  });
}
