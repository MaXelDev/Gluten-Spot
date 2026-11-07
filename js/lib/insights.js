// Statistiques du journal. Module pur : testé par test/insights.test.js.
import { normalize } from './gluten.js';

const HOUR = 3600000;
export const SYMPTOM_WINDOW_HOURS = 48;
const MIN_OCCURRENCES = 3;
const NOTABLE_GAP = 0.2;

const time = (entry) => new Date(entry.at).getTime();
const ofType = (entries, type) => entries.filter((e) => e.type === type);

/** Découpe « pâtes de riz, tomate et basilic » en aliments comparables. */
export const mealFoods = (text) =>
  [...new Set(
    normalize(text)
      .split(/[,;+\n/]|\s(?:et|avec)\s/)
      .map((f) => f.trim().replace(/^(?:de l'|d'|l'|(?:du|de la|des|de|le|la|les|un|une)\s+)/, '').trim())
      .filter((f) => f.length > 1),
  )];

/**
 * Compare chaque aliment à la fréquence générale des symptômes dans les 48 h suivant un repas.
 * Ce n'est qu'une piste de discussion : une association n'est pas une cause.
 */
export function foodInsights(entries) {
  const meals = ofType(entries, 'meal');
  const symptomTimes = ofType(entries, 'symptom').map(time);
  if (!meals.length || !symptomTimes.length) return { foods: [], baseline: 0, mealCount: meals.length };

  const isFollowed = (meal) => {
    const start = time(meal);
    return symptomTimes.some((t) => t > start && t - start <= SYMPTOM_WINDOW_HOURS * HOUR);
  };

  const stats = new Map();
  let followedMeals = 0;
  for (const meal of meals) {
    const followed = isFollowed(meal);
    if (followed) followedMeals += 1;
    for (const food of mealFoods(meal.text ?? '')) {
      const stat = stats.get(food) ?? { food, count: 0, followed: 0 };
      stat.count += 1;
      if (followed) stat.followed += 1;
      stats.set(food, stat);
    }
  }

  const baseline = followedMeals / meals.length;
  const foods = [...stats.values()]
    .filter((s) => s.count >= MIN_OCCURRENCES)
    .map((s) => {
      const rate = s.followed / s.count;
      return { ...s, rate, notable: s.followed >= 2 && rate >= baseline + NOTABLE_GAP };
    })
    .sort((a, b) => b.rate - a.rate || b.count - a.count);

  return { foods, baseline, mealCount: meals.length };
}

const localDay = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Intensité maximale par jour sur les `days` derniers jours, du plus ancien au plus récent. */
export function dailySeverity(entries, days, now = new Date()) {
  const byDay = new Map();
  for (const entry of ofType(entries, 'symptom')) {
    const key = localDay(entry.at);
    const current = byDay.get(key) ?? { max: 0, symptoms: new Set() };
    current.max = Math.max(current.max, entry.intensity ?? 1);
    (entry.symptoms ?? []).forEach((s) => current.symptoms.add(s));
    byDay.set(key, current);
  }
  const result = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const key = localDay(date);
    const day = byDay.get(key);
    result.push({ key, date, value: day?.max ?? 0, symptoms: day ? [...day.symptoms] : [] });
  }
  return result;
}

export function summarize(entries, days, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1).getTime();
  const inRange = entries.filter((e) => time(e) >= start && time(e) <= now.getTime());
  const symptoms = ofType(inRange, 'symptom');

  const counts = new Map();
  for (const entry of symptoms) {
    for (const name of entry.symptoms ?? []) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const topSymptoms = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  const daysWithSymptoms = new Set(symptoms.map((e) => localDay(e.at))).size;

  return {
    entries: inRange.sort((a, b) => time(b) - time(a)),
    meals: ofType(inRange, 'meal').length,
    symptomCount: symptoms.length,
    exposures: ofType(inRange, 'exposure').length,
    daysWithSymptoms,
    daysWithoutSymptoms: days - daysWithSymptoms,
    topSymptoms,
  };
}

/** Nombre de jours depuis la dernière exposition notée, ou null s'il n'y en a aucune. */
export function daysSinceExposure(entries, now = new Date()) {
  const times = ofType(entries, 'exposure').map(time).filter((t) => t <= now.getTime());
  if (!times.length) return null;
  const last = new Date(Math.max(...times));
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOf(now) - startOf(last)) / 86400000);
}
