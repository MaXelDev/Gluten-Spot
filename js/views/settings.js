import { applyTheme, formatDate, html, icon, on, toast } from '../lib/dom.js';
import { ALLERGIES } from '../data/guides.js';
import { clearAll, exportAll, getProfile, importAll, lastBackupAt, markBackedUp, protectStorage, saveProfile } from '../lib/store.js';

export const title = () => 'Réglages';

const backupName = (extension) => `gluten-spot-sauvegarde-${new Date().toISOString().slice(0, 10)}.${extension}`;

// Android refuse en général de partager un .json : le .txt prend le relais, avec le même contenu.
function shareableFile(content) {
  if (!navigator.canShare) return null;
  return [['json', 'application/json'], ['txt', 'text/plain']]
    .map(([extension, type]) => new File([content], backupName(extension), { type }))
    .find((file) => navigator.canShare({ files: [file] })) ?? null;
}

export const canShareBackup = () => Boolean(shareableFile(''));

export function downloadBackup() {
  const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = backupName('json');
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  markBackedUp();
  toast('Sauvegarde exportée.');
  return true;
}

/** Ouvre le partage du téléphone. Renvoie false si la personne annule. */
export async function shareBackup() {
  const file = shareableFile(JSON.stringify(exportAll(), null, 2));
  if (!file) return downloadBackup();
  try {
    await navigator.share({ files: [file], title: 'Sauvegarde Gluten Spot' });
  } catch (error) {
    if (error.name === 'AbortError') return false;
    return downloadBackup();
  }
  markBackedUp();
  toast('Sauvegarde envoyée.');
  return true;
}

const backupStatus = () => {
  const at = lastBackupAt();
  return at ? `Dernière sauvegarde : ${formatDate(new Date(at))}.` : 'Aucune sauvegarde pour l’instant.';
};

export function render() {
  const profile = getProfile();
  return html`
    <h1 class="page-title">Réglages</h1>

    <section class="card">
      <h2>Niveau de précaution</h2>
      <label class="check-line"><input type="radio" name="strictness" value="strict" ${profile.strictness !== 'moderate' ? 'checked' : ''}><span><strong>Strict</strong> : maladie cœliaque ou forte réaction, éviter les traces.</span></label>
      <label class="check-line"><input type="radio" name="strictness" value="moderate" ${profile.strictness === 'moderate' ? 'checked' : ''}><span><strong>Modéré</strong> : sensibilité plus légère, les traces sont signalées.</span></label>
    </section>

    <section class="card">
      <h2>Mes autres allergies</h2>
      <p class="muted small">Signalées sur les fiches produits et les recettes, quand l’information est disponible.</p>
      <div class="chips">
        ${ALLERGIES.map((a) => html`<label class="chip chip-check"><input type="checkbox" name="allergy" value="${a.id}" ${profile.allergies.includes(a.id) ? 'checked' : ''}><span>${a.label}</span></label>`)}
      </div>
    </section>

    <section class="card">
      <h2>Apparence</h2>
      <label for="theme">Thème</label>
      <select id="theme">
        ${[['auto', 'Comme mon appareil'], ['light', 'Clair'], ['dark', 'Sombre']].map(([value, label]) => html`<option value="${value}" ${profile.theme === value ? 'selected' : ''}>${label}</option>`)}
      </select>
    </section>

    <section class="card">
      <h2>Mes données</h2>
      <p>Tes données restent sur cet appareil : ni compte, ni envoi vers un serveur Gluten Spot. Elles n’existent donc nulle part ailleurs : si tu perds ton téléphone sans sauvegarde, elles sont perdues.</p>
      <p class="small"><strong id="backup-status">${backupStatus()}</strong> <span id="storage-status"></span></p>
      <div class="button-row">
        ${canShareBackup() ? html`<button class="btn btn-primary" id="share-backup" type="button">${icon('share-2', 18)}Envoyer une sauvegarde</button>` : ''}
        <button class="btn" id="export" type="button">${icon('download', 18)}Télécharger une sauvegarde</button>
        <label class="btn">${icon('upload', 18)}Importer une sauvegarde<input id="import" class="visually-hidden" type="file" accept="application/json,text/plain,.json,.txt"></label>
      </div>
      <p class="muted small">Garde le fichier dans ton Drive ou ton iCloud, ou envoie-le-toi par mail. Il n’est pas chiffré et contient ton journal de santé : ne le partage pas avec n’importe qui.</p>
      <p class="muted small">Importer ajoute le contenu du fichier à ce qui se trouve sur cet appareil, sans rien écraser. Une entrée supprimée après la sauvegarde réapparaît si tu réimportes ce fichier.</p>
      <div class="danger-zone">
        <button class="btn btn-danger" id="clear" type="button">${icon('trash-2', 18)}Effacer toutes mes données</button>
        <div id="clear-confirm" hidden>
          <p><strong>Effacer définitivement le journal, les favoris, les listes et les réglages ?</strong></p>
          <div class="button-row">
            <button class="btn btn-danger" id="clear-yes" type="button">Oui, tout effacer</button>
            <button class="btn" id="clear-no" type="button">Annuler</button>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Installer l’application</h2>
      <p class="small">C’est conseillé, surtout sur iPhone : sans installation, Safari peut effacer tes données après 7 jours sans visite.</p>
      <ul>
        <li><strong>Android (Chrome) :</strong> menu ⋮, puis « Installer l’application ».</li>
        <li><strong>iPhone (Safari) :</strong> bouton Partager, puis « Sur l’écran d’accueil ».</li>
        <li><strong>Ordinateur (Chrome ou Edge) :</strong> icône d’installation dans la barre d’adresse.</li>
      </ul>
    </section>

    <section class="card">
      <h2>À propos et sources</h2>
      <ul class="small">
        <li>Produits : <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a> (ODbL), base collaborative.</li>
        <li>Rappels : <a href="https://rappel.conso.gouv.fr" target="_blank" rel="noopener">RappelConso</a>, service public français.</li>
        <li>Lieux et carte : <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> (ODbL).</li>
        <li>Quand tu utilises ces fonctions, ta recherche, le code-barres ou la position choisie sont envoyés au service concerné.</li>
      </ul>
      <p class="muted small">Gluten Spot aide à repérer les risques, mais peut se tromper. L’étiquette du produit fait foi, et l’application ne remplace pas un avis médical.</p>
    </section>`;
}

export function mount(page, { refresh }) {
  on(page, 'change', 'input[name="strictness"]', (_e, radio) => {
    saveProfile({ strictness: radio.value, onboarded: true });
    toast('Niveau de précaution enregistré.');
  });

  on(page, 'change', 'input[name="allergy"]', () => {
    const allergies = [...page.querySelectorAll('input[name="allergy"]:checked')].map((c) => c.value);
    saveProfile({ allergies });
  });

  on(page, 'change', '#theme', (_e, select) => {
    saveProfile({ theme: select.value });
    applyTheme(select.value);
  });

  const showBackupStatus = () => {
    page.querySelector('#backup-status').textContent = backupStatus();
  };

  on(page, 'click', '#export', () => {
    downloadBackup();
    showBackupStatus();
  });

  on(page, 'click', '#share-backup', async () => {
    if (await shareBackup()) showBackupStatus();
  });

  protectStorage().then((granted) => {
    const status = page.querySelector('#storage-status');
    if (status) status.textContent = granted ? 'Stockage protégé par le navigateur.' : 'Le navigateur ne garantit pas la conservation de tes données : sauvegarde-les régulièrement.';
  });

  on(page, 'change', '#import', async (_e, input) => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const { saved, journalAdded } = importAll(JSON.parse(await file.text()));
      applyTheme(getProfile().theme);
      refresh();
      if (!saved) {
        toast('Import non enregistré : le stockage du navigateur est plein ou bloqué.');
      } else if (journalAdded) {
        toast(`Sauvegarde importée : ${journalAdded} ${journalAdded > 1 ? 'entrées ajoutées' : 'entrée ajoutée'} au journal.`);
      } else {
        toast('Sauvegarde importée.');
      }
    } catch (error) {
      toast(error instanceof SyntaxError ? 'Ce fichier est illisible.' : error.message);
    }
  });

  on(page, 'click', '#clear', () => {
    page.querySelector('#clear-confirm').hidden = false;
    page.querySelector('#clear').hidden = true;
  });

  on(page, 'click', '#clear-no', () => {
    page.querySelector('#clear-confirm').hidden = true;
    page.querySelector('#clear').hidden = false;
  });

  on(page, 'click', '#clear-yes', () => {
    clearAll();
    applyTheme('auto');
    refresh();
    toast('Toutes tes données ont été effacées.');
  });
}
