import { iconSvg } from './icons.js';

class SafeHtml {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

const render = (value) => {
  if (value === null || value === undefined || value === false || value === true) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  return escapeHtml(value);
};

/** Gabarit HTML : toute valeur est échappée, sauf le HTML déjà construit avec ce gabarit. */
export function html(strings, ...values) {
  return new SafeHtml(strings.reduce((out, part, i) => out + part + (i < values.length ? render(values[i]) : ''), ''));
}

export const icon = (name, size) => new SafeHtml(iconSvg(name, size));

/** N'accepte que les liens web, pour éviter des schémas dangereux issus de données externes. */
export function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export function setHtml(element, content) {
  if (element) element.innerHTML = render(content);
}

/** Délégation d'événements : les éléments peuvent être remplacés sans réattacher les écouteurs. */
export function on(root, type, selector, handler) {
  root.addEventListener(type, (event) => {
    const target = event.target.closest?.(selector);
    if (target && root.contains(target)) handler(event, target);
  });
}

export function tabs(items, active) {
  return html`<nav class="tabs" aria-label="Sections">
    ${items.map(
      (t) => html`<a class="tab" href="${t.href}" ${t.id === active ? html`aria-current="page"` : ''}>${icon(t.icon, 16)}<span>${t.label}</span></a>`,
    )}
  </nav>`;
}

export function applyTheme(theme) {
  if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme;
  else document.documentElement.removeAttribute('data-theme');
}

let toastTimer;
/** Message temporaire, avec une action facultative comme « Annuler ». */
export function toast(message, action) {
  const box = document.getElementById('toast');
  clearTimeout(toastTimer);
  box.replaceChildren();
  const text = document.createElement('span');
  text.textContent = message;
  box.append(text);
  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      box.hidden = true;
      action.run();
    });
    box.append(button);
  }
  box.hidden = false;
  toastTimer = setTimeout(() => (box.hidden = true), action ? 7000 : 3500);
}

export const emptyState = (iconName, title, text, extra) => html`
  <div class="empty">
    <span class="empty-icon">${icon(iconName, 28)}</span>
    <strong>${title}</strong>
    ${text ? html`<p>${text}</p>` : ''}
    ${extra ?? ''}
  </div>`;

export const errorState = (message) => html`
  <div class="notice notice-warn" role="alert">
    ${icon('triangle-alert')}
    <div><strong>${message}</strong></div>
  </div>`;

export const loading = (label = 'Chargement…') =>
  html`<div class="loading" role="status"><span class="spinner"></span>${label}</div>`;

export const dateTimeLocal = (date = new Date()) => {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
};

export const dayKey = (date = new Date()) => dateTimeLocal(new Date(date)).slice(0, 10);

export const formatDate = (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Date(value).toLocaleDateString('fr-FR', options);

export const formatDateTime = (value) =>
  new Date(value).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
