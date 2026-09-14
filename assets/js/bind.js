/* =========================================================
   bind.js — tiny declarative template engine
   ---------------------------------------------------------
   Attributes understood inside a section fragment:

     data-list="key"          repeat the child <template> once per array item
     data-bind="path"         set textContent ("." = the item itself)
     data-bind-<attr>="path"  set any attribute  (data-bind-href, data-bind-src,
                              data-bind-aria-label, data-bind-data-cats, …)
     data-icon="path"         inject an inline SVG by icon name
     data-show="path"         drop the element when the value is falsy
     data-toggle-class="f:cls" add class `cls` when field `f` is truthy
     data-counter="path"      mark a number for the count-up animation
                              (optional companion: data-suffix="path")
   ========================================================= */

import { icon } from './icons.js';

/** Resolve "a.b.c" against a scope. "." returns the scope itself. */
export function get(scope, path) {
  if (path === '.' || path === '') return scope;
  return path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), scope);
}

function applyBindings(el, scope) {
  // conditional removal
  if (el.hasAttribute('data-show')) {
    if (!get(scope, el.getAttribute('data-show'))) return false;
    el.removeAttribute('data-show');
  }

  // conditional class
  if (el.hasAttribute('data-toggle-class')) {
    const [field, cls] = el.getAttribute('data-toggle-class').split(':');
    if (get(scope, field)) el.classList.add(cls || 'is-on');
    el.removeAttribute('data-toggle-class');
  }

  // attribute bindings: data-bind-<attr>
  for (const attr of Array.from(el.attributes)) {
    if (!attr.name.startsWith('data-bind-')) continue;
    const target = attr.name.slice('data-bind-'.length);
    const value = get(scope, attr.value);
    el.removeAttribute(attr.name);
    if (value === undefined || value === null || value === '') continue;
    el.setAttribute(target, String(value));
  }

  // inline icon
  if (el.hasAttribute('data-icon')) {
    el.innerHTML = icon(get(scope, el.getAttribute('data-icon')));
    el.removeAttribute('data-icon');
    return true;
  }

  // count-up number
  if (el.hasAttribute('data-counter')) {
    const value = Number(get(scope, el.getAttribute('data-counter'))) || 0;
    const suffixPath = el.getAttribute('data-suffix');
    const suffix = suffixPath ? (get(scope, suffixPath) ?? '') : '';
    el.dataset.target = String(value);
    el.dataset.suffixText = String(suffix);
    el.textContent = '0' + suffix;
    el.removeAttribute('data-counter');
    el.removeAttribute('data-suffix');
    return true;
  }

  // text binding (last, because it overwrites children)
  if (el.hasAttribute('data-bind')) {
    const value = get(scope, el.getAttribute('data-bind'));
    el.removeAttribute('data-bind');
    el.textContent = value === undefined || value === null ? '' : String(value);
    return true;
  }

  return true;
}

function renderList(host, scope) {
  const tpl = host.querySelector(':scope > template');
  const items = get(scope, host.getAttribute('data-list'));
  host.removeAttribute('data-list');

  if (!tpl) return;
  tpl.remove();
  host.textContent = '';

  if (!Array.isArray(items) || items.length === 0) return;

  const frag = document.createDocumentFragment();
  items.forEach((item, index) => {
    const clone = tpl.content.cloneNode(true);
    const roots = Array.from(clone.children);
    roots.forEach((node) => {
      // stagger reveal animations down a list
      if (node.classList.contains('reveal') && !node.hasAttribute('data-delay')) {
        node.setAttribute('data-delay', String(index % 4));
      }
      if (renderEl(node, item)) frag.appendChild(node);
    });
  });
  host.appendChild(frag);
}

function renderEl(el, scope) {
  if (!applyBindings(el, scope)) return false;

  if (el.hasAttribute('data-list')) {
    renderList(el, scope);
    return true;
  }
  renderChildren(el, scope);
  return true;
}

function renderChildren(container, scope) {
  Array.from(container.children).forEach((child) => {
    // <template> elements are left untouched — they are either consumed by
    // data-list above, or cloned later by the filter builder in ui.js.
    if (child.tagName === 'TEMPLATE') return;
    if (!renderEl(child, scope)) child.remove();
  });
}

/** Render a fragment root against a data scope. */
export function render(root, scope) {
  renderChildren(root, scope);
  return root;
}
