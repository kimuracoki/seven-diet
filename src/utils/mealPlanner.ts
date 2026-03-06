import type {
  Product,
  DailyPlan,
  NutritionTotals,
} from './types';
import { PFC_TARGETS, LUNCH_RATIO, DINNER_RATIO } from './types';
import productsData from '../data/products.json';

const products = productsData as Product[];

const MAIN_CATEGORIES = ['おにぎり', 'お弁当', 'サンドイッチ・ロールパン', 'パン', 'そば・うどん・中華麺', 'スパゲティ・パスタ'];
const SIDE_CATEGORIES = ['サラダ', '惣菜'];

function categorize(p: Product): 'main' | 'side' {
  if (MAIN_CATEGORIES.some((c) => p.category.includes(c))) return 'main';
  if (SIDE_CATEGORIES.some((c) => p.category.includes(c))) return 'side';
  return p.calories > 200 ? 'main' : 'side';
}

function proteinDensity(p: Product): number {
  return p.calories > 0 ? p.protein / p.calories : 0;
}

function weightedPickByProtein(arr: Product[]): Product {
  const weights = arr.map((p) => proteinDensity(p) + 0.05);
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

function weightedPickNByProtein(arr: Product[], n: number): Product[] {
  const remaining = [...arr];
  const result: Product[] = [];
  for (let i = 0; i < n && remaining.length > 0; i++) {
    const picked = weightedPickByProtein(remaining);
    result.push(picked);
    remaining.splice(remaining.indexOf(picked), 1);
  }
  return result;
}

function sumTotals(items: Product[]): NutritionTotals {
  return items.reduce(
    (acc, p) => ({
      calories: acc.calories + p.calories,
      protein: acc.protein + p.protein,
      fat: acc.fat + p.fat,
      carbs: acc.carbs + p.carbs,
      price: acc.price + p.price,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0, price: 0 },
  );
}

function hasDuplicateNames(items: Product[]): boolean {
  const names = items.map((p) => p.name);
  return new Set(names).size !== names.length;
}

function score(totals: NutritionTotals): number {
  const pUnder = totals.protein < PFC_TARGETS.protein
    ? ((PFC_TARGETS.protein - totals.protein) / PFC_TARGETS.protein) * 20
    : 0;
  const fErr = Math.abs(totals.fat - PFC_TARGETS.fat) / PFC_TARGETS.fat;
  const cErr = Math.abs(totals.carbs - PFC_TARGETS.carbs) / PFC_TARGETS.carbs;
  const calErr = Math.abs(totals.calories - PFC_TARGETS.calories) / PFC_TARGETS.calories;

  const fOver = totals.fat > PFC_TARGETS.fat
    ? ((totals.fat - PFC_TARGETS.fat) / PFC_TARGETS.fat) * 10
    : 0;
  const cOver = totals.carbs > PFC_TARGETS.carbs
    ? ((totals.carbs - PFC_TARGETS.carbs) / PFC_TARGETS.carbs) * 10
    : 0;

  return pUnder + fErr + cErr + calErr + fOver + cOver;
}

function generateLunch(mains: Product[], sides: Product[]): Product[] {
  const targetCal = PFC_TARGETS.calories * LUNCH_RATIO;
  const calFiltered = mains.filter((p) => p.calories < targetCal * 0.9);
  const mainItem = calFiltered.length > 0
    ? weightedPickByProtein(calFiltered)
    : (mains.length > 0 ? weightedPickByProtein(mains) : undefined);

  if (!mainItem) return [];

  const candidates = sides.filter((p) => p.calories < 300);
  const remaining = targetCal - mainItem.calories;
  if (remaining > 80 && candidates.length > 0) {
    const side = candidates.reduce((best, p) =>
      Math.abs(p.calories - remaining) < Math.abs(best.calories - remaining) ? p : best,
    );
    return [mainItem, side];
  }
  return [mainItem];
}

function generateDinner(mains: Product[], sides: Product[], excludeNames: Set<string> = new Set()): Product[] {
  const targetCal = PFC_TARGETS.calories * DINNER_RATIO;
  const availMains = mains.filter((p) => !excludeNames.has(p.name));
  const availSides = sides.filter((p) => !excludeNames.has(p.name));
  const items: Product[] = [];

  const mainItems = weightedPickNByProtein(availMains, 1 + Math.floor(Math.random() * 2));
  items.push(...mainItems);

  const remainingSides = availSides.filter((s) => !items.some((i) => i.name === s.name));
  const sideItems = weightedPickNByProtein(remainingSides, 1 + Math.floor(Math.random() * 2));
  items.push(...sideItems);

  const total = items.reduce((s, p) => s + p.calories, 0);
  if (total < targetCal * 0.5) {
    const extra = availSides.filter((s) => !items.some((i) => i.name === s.name));
    if (extra.length > 0) items.push(weightedPickByProtein(extra));
  }

  return items;
}

export interface PinnedConfig {
  lunch: Set<number>;
  dinner: Set<number>;
}

function pickForSlots(
  originalItems: Product[],
  pinnedIndices: Set<number>,
  mains: Product[],
  sides: Product[],
  excludeNames: Set<string> = new Set(),
): Product[] {
  const usedNames = new Set(excludeNames);
  for (let i = 0; i < originalItems.length; i++) {
    if (pinnedIndices.has(i)) usedNames.add(originalItems[i].name);
  }

  const items = [...originalItems];
  for (let i = 0; i < items.length; i++) {
    if (pinnedIndices.has(i)) continue;
    const cat = categorize(originalItems[i]);
    const pool = (cat === 'main' ? mains : sides).filter((p) => !usedNames.has(p.name));
    if (pool.length > 0) {
      items[i] = weightedPickByProtein(pool);
      usedNames.add(items[i].name);
    }
  }
  return items;
}

export function generateDailyPlanWithPinned(
  currentPlan: DailyPlan,
  pinned: PinnedConfig,
): DailyPlan {
  const allPinnedLunch = pinned.lunch.size >= currentPlan.lunch.items.length;
  const allPinnedDinner = pinned.dinner.size >= currentPlan.dinner.items.length;

  if (allPinnedLunch && allPinnedDinner) return currentPlan;

  const mains = products.filter((p) => categorize(p) === 'main');
  const sides = products.filter((p) => categorize(p) === 'side');

  let bestPlan: DailyPlan | null = null;
  let bestScore = Infinity;

  const iterations = products.length > 0 ? 1000 : 0;

  for (let i = 0; i < iterations; i++) {
    const lunchItems = allPinnedLunch
      ? currentPlan.lunch.items
      : pickForSlots(currentPlan.lunch.items, pinned.lunch, mains, sides);
    const lunchNames = new Set(lunchItems.map((p) => p.name));
    const dinnerItems = allPinnedDinner
      ? currentPlan.dinner.items
      : pickForSlots(currentPlan.dinner.items, pinned.dinner, mains, sides, lunchNames);

    const allItems = [...lunchItems, ...dinnerItems];
    if (hasDuplicateNames(allItems)) continue;

    const totals = sumTotals(allItems);

    if (totals.calories < 1700 || totals.calories > 2300) continue;
    if (totals.carbs > PFC_TARGETS.carbs || totals.fat > PFC_TARGETS.fat) continue;

    const s = score(totals);
    if (s < bestScore) {
      bestScore = s;
      bestPlan = {
        lunch: {
          type: 'lunch',
          label: '昼食（軽め）',
          items: lunchItems,
          totals: sumTotals(lunchItems),
        },
        dinner: {
          type: 'dinner',
          label: '夕食（しっかり）',
          items: dinnerItems,
          totals: sumTotals(dinnerItems),
        },
        totals,
      };
    }
  }

  if (!bestPlan) {
    const lunchItems = allPinnedLunch
      ? currentPlan.lunch.items
      : pickForSlots(currentPlan.lunch.items, pinned.lunch, mains, sides);
    const lunchNames = new Set(lunchItems.map((p) => p.name));
    const dinnerItems = allPinnedDinner
      ? currentPlan.dinner.items
      : pickForSlots(currentPlan.dinner.items, pinned.dinner, mains, sides, lunchNames);
    const allItems = [...lunchItems, ...dinnerItems];
    bestPlan = {
      lunch: { type: 'lunch', label: '昼食（軽め）', items: lunchItems, totals: sumTotals(lunchItems) },
      dinner: { type: 'dinner', label: '夕食（しっかり）', items: dinnerItems, totals: sumTotals(dinnerItems) },
      totals: sumTotals(allItems),
    };
  }

  return bestPlan;
}

export function generateDailyPlan(): DailyPlan {
  const mains = products.filter((p) => categorize(p) === 'main');
  const sides = products.filter((p) => categorize(p) === 'side');

  let bestPlan: DailyPlan | null = null;
  let bestScore = Infinity;

  const iterations = products.length > 0 ? 1000 : 0;

  for (let i = 0; i < iterations; i++) {
    const lunchItems = generateLunch(mains, sides);
    const lunchNames = new Set(lunchItems.map((p) => p.name));
    const dinnerItems = generateDinner(mains, sides, lunchNames);
    const allItems = [...lunchItems, ...dinnerItems];

    if (hasDuplicateNames(allItems)) continue;

    const totals = sumTotals(allItems);

    if (totals.calories < 1700 || totals.calories > 2300) continue;
    if (totals.carbs > PFC_TARGETS.carbs || totals.fat > PFC_TARGETS.fat) continue;

    const s = score(totals);
    if (s < bestScore) {
      bestScore = s;
      bestPlan = {
        lunch: {
          type: 'lunch',
          label: '昼食（軽め）',
          items: lunchItems,
          totals: sumTotals(lunchItems),
        },
        dinner: {
          type: 'dinner',
          label: '夕食（しっかり）',
          items: dinnerItems,
          totals: sumTotals(dinnerItems),
        },
        totals,
      };
    }
  }

  if (!bestPlan) {
    const fallbackLunch = mains.length > 0 ? [weightedPickByProtein(mains)] : [];
    const usedNames = new Set(fallbackLunch.map((p) => p.name));
    const remainingMains = mains.filter((p) => !usedNames.has(p.name));
    const fallbackDinner = remainingMains.length > 0 ? weightedPickNByProtein(remainingMains, 2) : [];
    const allItems = [...fallbackLunch, ...fallbackDinner];
    bestPlan = {
      lunch: {
        type: 'lunch',
        label: '昼食（軽め）',
        items: fallbackLunch,
        totals: sumTotals(fallbackLunch),
      },
      dinner: {
        type: 'dinner',
        label: '夕食（しっかり）',
        items: fallbackDinner,
        totals: sumTotals(fallbackDinner),
      },
      totals: sumTotals(allItems),
    };
  }

  return bestPlan;
}
