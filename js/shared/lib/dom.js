export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function setHTML(el, html) {
  if (!el) {
    return;
  }
  el.innerHTML = html;
}

export function on(el, event, handler, options) {
  if (!el) {
    return () => {};
  }
  el.addEventListener(event, handler, options);
  return () => el.removeEventListener(event, handler, options);
}
