import { emptyState, html, icon, on, toast } from '../lib/dom.js';
import { GUIDES } from '../data/guides.js';

export const title = (params) => GUIDES.find((g) => g.id === params[0])?.t ?? 'Guides';

export function render({ params }) {
  if (!params[0]) return listView();
  const guide = GUIDES.find((g) => g.id === params[0]);
  if (!guide) return emptyState('circle-help', 'Guide introuvable', null, html`<a class="btn" href="#/guides">Tous les guides</a>`);
  return html`
    <a class="back" href="#/guides">${icon('arrow-left', 18)} Guides</a>
    <h1 class="page-title">${guide.t}</h1>
    ${guide.shareable ? html`<div class="button-row"><button class="btn btn-primary" id="guide-share" type="button">${icon('share-2', 18)}Partager ce guide</button></div>` : ''}
    <article class="prose">
      ${guide.s.map((section) => html`<section class="card">
        <h2>${section.h}</h2>
        ${section.p ? html`<p>${section.p}</p>` : ''}
        ${section.l ? html`<ul>${section.l.map((item) => html`<li>${item}</li>`)}</ul>` : ''}
      </section>`)}
    </article>
    <p class="muted small">Informations générales, à compléter par l’avis de ton médecin ou de ton diététicien.</p>`;
}

const listView = () => html`
  <h1 class="page-title">Guides</h1>
  <p class="muted">L’essentiel pour vivre sans gluten au quotidien.</p>
  <div class="guide-grid">
    ${GUIDES.map((g) => html`<a class="row-card" href="#/guides/${g.id}">
      <span class="tile-icon">${icon(g.icon, 22)}</span>
      <span class="row-main"><strong>${g.t}</strong><small>${g.d}</small></span>
      ${icon('chevron-right', 18)}
    </a>`)}
  </div>`;

const guideText = (guide) =>
  [guide.t, ...guide.s.flatMap((s) => [`\n${s.h}`, ...(s.p ? [s.p] : []), ...(s.l ?? []).map((item) => `- ${item}`)])].join('\n');

export function mount(page, { params }) {
  const guide = GUIDES.find((g) => g.id === params[0]);
  if (!guide?.shareable) return;
  on(page, 'click', '#guide-share', async () => {
    const text = guideText(guide);
    if (navigator.share) {
      try {
        await navigator.share({ title: guide.t, text });
      } catch {
        // Partage annulé par l'utilisateur.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast('Guide copié : tu peux le coller dans un message.');
    } catch {
      toast('Copie impossible sur cet appareil.');
    }
  });
}
