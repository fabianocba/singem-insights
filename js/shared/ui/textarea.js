export function bindMaxLengthCounter(textarea, counterEl, maxLength) {
  if (!textarea || !counterEl || !maxLength) {
    return;
  }

  const update = () => {
    const current = String(textarea.value || '').length;
    counterEl.textContent = `${current}/${maxLength}`;
  };

  textarea.addEventListener('input', update);
  update();
}
