// Moteur d'analyse du gluten. Module pur (sans DOM) : testé par test/gluten.test.js.
// Principe : en cas de doute, on n'affiche jamais « sans gluten ».

const LEVEL = { DANGER: 'danger', CAUTION: 'caution' };

/** Normalise un texte caractère par caractère et garde la position d'origine, pour surligner. */
export function normalizeWithMap(text) {
  let out = '';
  const map = [];
  [...String(text ?? '')].reduce((offset, ch) => {
    const folded = ch
      .replace(/œ/gi, 'oe')
      .replace(/æ/gi, 'ae')
      .replace(/ß/g, 'ss')
      .replace(/[’`´]/g, "'")
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase();
    for (const c of folded) {
      out += c;
      map.push(offset);
    }
    return offset + ch.length;
  }, 0);
  return { text: out, map };
}

export const normalize = (text) => normalizeWithMap(text).text;

const L = '\\p{L}\\p{N}';
const word = (source) => new RegExp(`(?<![${L}])(?:${source})(?![${L}])`, 'gu');

const SAFE_GRAINS =
  "riz|mais|sarrasin|ble noir|pois chiches?|pois|lentilles?|coco|noix de coco|amandes?|chataignes?|soja|quinoa|tapioca|manioc|millet|teff|sorgho|pommes? de terre|lupin|noisettes?|fonio|amarante|caroube|haricots?|souchet|banane";

// Expressions retirées avant la recherche : elles contiennent un mot à risque mais sont sûres.
const SAFE_MASKS = [
  "sans (?:gluten|ble|froment)",
  "(?:exempte?s?|depourvue?s?) de gluten",
  'gluten[- ]?free|glutenfrei|sin gluten|senza glutine|glutenvrij|sem gluten|free from gluten|no gluten',
  `farines? (?:de |d'|du )(?:${SAFE_GRAINS})`,
  `semoules? (?:de |d'|du )(?:${SAFE_GRAINS})`,
  `amidons? (?:de |d'|du )(?:${SAFE_GRAINS})`,
  `(?:nouilles?|pates?|vermicelles?) (?:de |d'|du )(?:${SAFE_GRAINS})`,
  `(?:rice|corn|maize|potato|tapioca|buckwheat|chickpea|almond|coconut|soy|soya|millet|sorghum) (?:flour|starch)`,
  'ble noir',
];

// Dérivés exemptés d'étiquetage allergène par le règlement UE 1169/2011 (annexe II).
const EXEMPT_DERIVATIVES = [
  "(?:sirops? de glucose|dextrose|maltodextrines?|glucose)\\s*(?:\\(|de |d'|a base de |a base d')\\s*(?:ble|froment|orge)\\)?",
  "alcool\\s*(?:\\(|de |d')\\s*(?:ble|froment|orge|seigle)\\)?",
];

const TERMS = [
  // Expressions complètes d'abord : le mot entier est surligné, sans doublon avec « farine ».
  [LEVEL.DANGER, "(?:farines?|semoules?|amidons?|flocons?|sons?|germes?|proteines?) (?:de |d'|du )(?:ble|froment|seigle|orge|petit epeautre|epeautre|kamut|khorasan|triticale)", 'Céréale à gluten', 'Ingrédient issu d’une céréale contenant du gluten.'],
  [LEVEL.CAUTION, "(?:farines?|flocons?|sons?|lait|boisson) (?:de |d'|a l')avoine", 'Avoine', 'Souvent contaminée par le blé : à choisir uniquement certifiée sans gluten.'],
  // Céréales et produits qui contiennent du gluten.
  [LEVEL.DANGER, 'gluten|glutine|glutene', 'Gluten', 'Mention directe du gluten.'],
  [LEVEL.DANGER, 'bles?|froments?|wheat|weizen|trigo|frumento|grano duro|tarwe', 'Blé', 'Céréale contenant du gluten.'],
  [LEVEL.DANGER, 'petit epeautre|epeautres?|spelt|spelta|dinkel|espelta|farro', 'Épeautre', "Variété de blé, elle contient du gluten."],
  [LEVEL.DANGER, 'orges?|barley|gerste|cebada|orzo|gerst', 'Orge', 'Céréale contenant du gluten.'],
  [LEVEL.DANGER, 'seigles?|rye|roggen|centeno|segale|rogge', 'Seigle', 'Céréale contenant du gluten.'],
  [LEVEL.DANGER, 'kamut|khorasan|triticale|engrain|amidonnier', 'Céréale ancienne', 'Céréale de la famille du blé, elle contient du gluten.'],
  [LEVEL.DANGER, 'malte?s?|maltee?s?|extraits? de malt', 'Malt', "Généralement issu de l'orge : à éviter sauf mention « sans gluten »."],
  [LEVEL.DANGER, 'seitan|chapelures?|panures?|boulgour|boulghour|bulgur|couscous|breadcrumbs?', 'Produit à base de blé', 'Préparation généralement faite avec du blé.'],
  [LEVEL.DANGER, 'bieres?|beer', 'Bière', "Généralement brassée à partir d'orge ou de blé."],
  [LEVEL.DANGER, 'pains?|bread', 'Pain', 'Contient du gluten, sauf mention « sans gluten ».'],
  // Termes à vérifier.
  [LEVEL.CAUTION, 'avoines?|oats?|hafer|avena|haver', 'Avoine', "Souvent contaminée par le blé : à choisir uniquement certifiée sans gluten."],
  [LEVEL.CAUTION, 'farines?|flours?|harina|mehl', 'Farine non précisée', "L'origine de la farine doit être vérifiée."],
  [LEVEL.CAUTION, 'semoules?', 'Semoule non précisée', "La semoule est souvent faite avec du blé."],
  [LEVEL.CAUTION, 'amidons? modifies?|amidons?|starch', 'Amidon non précisé', "Vérifie la céréale d'origine : dans l'UE, l'amidon de blé doit être signalé."],
  [LEVEL.CAUTION, 'sauces? (?:de )?soja|soy sauce', 'Sauce soja', 'Elle contient souvent du blé. Le tamari sans gluten est une alternative.'],
  [LEVEL.CAUTION, 'levures? de biere|brewers? yeast', 'Levure de bière', "Peut contenir des résidus d'orge."],
  [LEVEL.CAUTION, 'levain', 'Levain', 'Souvent préparé avec du blé ou du seigle.'],
  [LEVEL.CAUTION, 'proteines? vegetales?', 'Protéines végétales', "Elles peuvent provenir du blé : vérifie l'origine."],
  [LEVEL.CAUTION, "pates? (?:alimentaires?|brisees?|feuilletees?|sablees?|a pizza)|pasta|nouilles?|noodles?", 'Pâtes ou nouilles', 'Souvent faites avec du blé, sauf mention contraire.'],
  [LEVEL.CAUTION, 'miso', 'Miso', "Il peut être fermenté avec de l'orge."],
].map(([level, source, label, why]) => ({ level, re: word(source), label, why }));

const TRACE_TRIGGER =
  /peut contenir|peuvent contenir|peut presenter|traces?(?![\p{L}])|may contain|can contain|kann .{0,30}enthalten|spuren|puede contener|trazas|puo contenere|tracce|fabrique dans un atelier|fabrique dans une usine|atelier qui utilise|produced in a facility|made in a facility/gu;

function maskRanges(text, sources) {
  const ranges = [];
  let masked = text;
  for (const source of sources) {
    masked = masked.replace(word(source), (m, ...rest) => {
      const index = rest.find((v) => typeof v === 'number');
      ranges.push([index, index + m.length]);
      return ' '.repeat(m.length);
    });
  }
  return { masked, ranges };
}

function traceClauses(text) {
  // Une mention de traces s'applique jusqu'à la fin de sa phrase.
  const zones = [];
  for (const m of text.matchAll(TRACE_TRIGGER)) {
    const rest = text.slice(m.index);
    const end = rest.search(/[.;\n]/);
    zones.push([m.index, end === -1 ? text.length : m.index + end]);
  }
  return zones;
}

/** Analyse une liste d'ingrédients en texte libre. */
export function analyzeIngredients(raw) {
  const { text, map } = normalizeWithMap(raw);
  const exempt = maskRanges(text, EXEMPT_DERIVATIVES);
  const safe = maskRanges(exempt.masked, SAFE_MASKS);
  const zones = traceClauses(safe.masked);

  const claimed = new Set();
  const findings = [];
  for (const term of TERMS) {
    for (const m of safe.masked.matchAll(term.re)) {
      const start = m.index;
      const end = start + m[0].length;
      let overlaps = false;
      for (let i = start; i < end; i++) {
        if (claimed.has(i)) overlaps = true;
      }
      if (overlaps) continue;
      for (let i = start; i < end; i++) claimed.add(i);

      const inTraces = zones.some(([a, b]) => start >= a && start < b);
      findings.push({
        level: term.level,
        label: term.label,
        why: term.why,
        inTraces,
        start: map[start],
        end: map[end - 1] + 1,
        text: String(raw).slice(map[start], map[end - 1] + 1),
      });
    }
  }
  findings.sort((a, b) => a.start - b.start);

  const exempted = exempt.ranges
    .sort((a, b) => a[0] - b[0])
    .map(([a, b]) => ({ start: map[a], end: map[b - 1] + 1, text: String(raw).slice(map[a], map[b - 1] + 1) }));

  return {
    findings,
    exempted,
    hasContent: text.trim().length > 0,
    contains: findings.some((f) => f.level === LEVEL.DANGER && !f.inTraces),
    traces: findings.some((f) => f.inTraces),
    caution: findings.some((f) => f.level === LEVEL.CAUTION && !f.inTraces),
  };
}

/** Découpe le texte en morceaux à afficher, avec le niveau de risque de chaque morceau. */
export function highlightSegments(raw, analysis) {
  const text = String(raw ?? '');
  const parts = [];
  let cursor = 0;
  for (const f of analysis.findings) {
    if (f.start < cursor) continue;
    if (f.start > cursor) parts.push({ text: text.slice(cursor, f.start) });
    parts.push({ text: text.slice(f.start, f.end), level: f.inTraces ? 'traces' : f.level, why: f.why });
    cursor = f.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}

const tagName = (tag) => normalize(String(tag).split(':').pop());
const GLUTEN_TAG = /(^|-)(gluten|wheat|ble|froment|barley|orge|rye|seigle|oats?|avoine|spelt|epeautre|kamut)(-|$)/;
const NO_GLUTEN_LABEL = /(^|-)(no-gluten|gluten-free|sans-gluten|crossed-grain|epi-barre)(-|$)/;

export const isGlutenTag = (tag) => GLUTEN_TAG.test(tagName(tag));
export const isNoGlutenLabel = (tag) => NO_GLUTEN_LABEL.test(tagName(tag));

export const STATUS = {
  contains: { tone: 'bad', icon: 'x', title: 'Contient du gluten', short: 'Gluten' },
  conflict: { tone: 'warn', icon: 'triangle-alert', title: 'Informations contradictoires', short: 'À vérifier' },
  traces: { tone: 'warn', icon: 'triangle-alert', title: 'Traces possibles de gluten', short: 'Traces' },
  check: { tone: 'warn', icon: 'triangle-alert', title: 'À vérifier', short: 'À vérifier' },
  labelled: { tone: 'good', icon: 'shield-check', title: 'Indiqué sans gluten', short: 'Sans gluten' },
  nodetect: { tone: 'soft', icon: 'check', title: 'Aucun gluten détecté', short: 'Rien détecté' },
  unknown: { tone: 'none', icon: 'circle-help', title: 'Information insuffisante', short: 'Inconnu' },
};

/**
 * Verdict pour une fiche Open Food Facts.
 * @param product champs : allergens_tags, traces_tags, labels_tags, ingredients_text(_fr)
 * @param profile { strictness: 'strict' | 'moderate', allergies: string[] }
 */
export function productVerdict(product, profile = {}) {
  const strict = profile.strictness !== 'moderate';
  const text = product.ingredients_text_fr || product.ingredients_text || '';
  const analysis = analyzeIngredients(text);

  const allergens = product.allergens_tags ?? [];
  const tracesTags = product.traces_tags ?? [];
  const labelled = (product.labels_tags ?? []).some(isNoGlutenLabel);
  const declaresGluten = allergens.some(isGlutenTag);
  const declaresTraces = tracesTags.some(isGlutenTag);

  const contains = declaresGluten || analysis.contains;
  const traces = declaresTraces || analysis.traces;

  let key;
  let advice;
  if (labelled && (contains || traces)) {
    key = 'conflict';
    advice =
      'La fiche indique « sans gluten », mais signale aussi du gluten ou des traces. Fie-toi à l’emballage ; en cas de doute, ne le consomme pas.';
  } else if (contains) {
    key = 'contains';
    advice = 'À éviter : ce produit contient du gluten d’après sa fiche.';
  } else if (traces) {
    key = 'traces';
    advice = strict
      ? 'À éviter avec ton profil strict : une contamination est possible.'
      : 'Risque de contamination : à toi de voir selon ta tolérance.';
  } else if (labelled) {
    key = 'labelled';
    advice = 'La fiche porte une mention « sans gluten ». Vérifie qu’elle figure bien sur l’emballage.';
  } else if (analysis.caution) {
    key = 'check';
    advice = 'Certains ingrédients ne permettent pas de conclure. Vérifie l’emballage ou contacte la marque.';
  } else if (analysis.hasContent) {
    key = 'nodetect';
    advice = 'Pas de gluten repéré dans la fiche, mais ce n’est pas une garantie : les traces ne sont pas toujours indiquées. Vérifie l’emballage.';
  } else {
    key = 'unknown';
    advice = 'La liste d’ingrédients manque sur cette fiche : impossible de se prononcer. Vérifie l’emballage.';
  }

  const allergies = profile.allergies ?? [];
  const otherAllergens = allergies
    .map((id) => ({
      id,
      contains: allergens.some((t) => t === `en:${id}`),
      traces: tracesTags.some((t) => t === `en:${id}`),
    }))
    .filter((a) => a.contains || a.traces);

  return { key, ...STATUS[key], advice, analysis, text, labelled, declaresGluten, declaresTraces, otherAllergens };
}

/** Vérifie la clé de contrôle d'un code EAN-8, UPC-A, EAN-13 ou GTIN-14. */
export function isValidBarcode(code) {
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((total, d, i) => total + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
