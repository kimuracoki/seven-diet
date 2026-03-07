import type {
  Product,
  DailyPlan,
  NutritionTotals,
} from './types';
import { PFC_TARGETS, PROTEIN_MIN, LUNCH_RATIO, DINNER_RATIO } from './types';
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

/** 既に使っているカテゴリの商品は重みを下げて、同じものばかり選ばないようにする */
function weightedPickByProteinWithVariety(arr: Product[], usedCategories: Set<string>): Product {
  const categoryPenalty = 0.2;
  const weights = arr.map((p) => {
    const base = proteinDensity(p) + 0.05;
    return usedCategories.has(p.category) ? base * categoryPenalty : base;
  });
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return arr[Math.floor(Math.random() * arr.length)];
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

function weightedPickNByProtein(arr: Product[], n: number, usedCategories: Set<string> = new Set()): Product[] {
  const remaining = [...arr];
  const result: Product[] = [];
  const categories = new Set(usedCategories);
  for (let i = 0; i < n && remaining.length > 0; i++) {
    const picked = weightedPickByProteinWithVariety(remaining, categories);
    result.push(picked);
    remaining.splice(remaining.indexOf(picked), 1);
    categories.add(picked.category);
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

/** 同じカテゴリが重複するとペナルティ（サラダチキンばかりを避ける） */
function categoryDiversityPenalty(items: Product[]): number {
  const countByCat = new Map<string, number>();
  for (const p of items) {
    countByCat.set(p.category, (countByCat.get(p.category) ?? 0) + 1);
  }
  let penalty = 0;
  for (const n of countByCat.values()) {
    if (n > 1) penalty += (n - 1) * 3;
  }
  return penalty;
}

function generateLunch(mains: Product[], sides: Product[]): Product[] {
  const targetCal = PFC_TARGETS.calories * LUNCH_RATIO;
  const calFiltered = mains.filter((p) => p.calories < targetCal * 0.9);
  const mainItem = calFiltered.length > 0
    ? weightedPickByProtein(calFiltered)
    : (mains.length > 0 ? weightedPickByProtein(mains) : undefined);

  if (!mainItem) return [];

  const usedCategories = new Set([mainItem.category]);
  const candidates = sides.filter((p) => p.calories < 300);
  const remaining = targetCal - mainItem.calories;
  if (remaining > 80 && candidates.length > 0) {
    const side = weightedPickByProteinWithVariety(candidates, usedCategories);
    const sideByCal = candidates.reduce((best, p) =>
      Math.abs(p.calories - remaining) < Math.abs(best.calories - remaining) ? p : best,
    );
    return [mainItem, Math.random() < 0.6 ? side : sideByCal];
  }
  return [mainItem];
}

function generateDinner(mains: Product[], sides: Product[], excludeNames: Set<string> = new Set()): Product[] {
  const targetCal = PFC_TARGETS.calories * DINNER_RATIO;
  const availMains = mains.filter((p) => !excludeNames.has(p.name));
  const availSides = sides.filter((p) => !excludeNames.has(p.name));
  const items: Product[] = [];
  const usedCategories = new Set<string>();

  const mainItems = weightedPickNByProtein(availMains, 1 + Math.floor(Math.random() * 2), usedCategories);
  items.push(...mainItems);
  mainItems.forEach((p) => usedCategories.add(p.category));

  const remainingSides = availSides.filter((s) => !items.some((i) => i.name === s.name));
  const sideItems = weightedPickNByProtein(remainingSides, 1 + Math.floor(Math.random() * 2), usedCategories);
  items.push(...sideItems);
  sideItems.forEach((p) => usedCategories.add(p.category));

  const total = items.reduce((s, p) => s + p.calories, 0);
  if (total < targetCal * 0.5) {
    const extra = availSides.filter((s) => !items.some((i) => i.name === s.name));
    if (extra.length > 0) items.push(weightedPickByProteinWithVariety(extra, usedCategories));
  }

  return items;
}

export interface PinnedConfig {
  lunch: Set<number>;
  dinner: Set<number>;
}

/** 一日合計の要件（メイン・フォールバック共通） */
const CAL_MIN = 1700;
const CAL_MAX = 2000;
const FAT_MAX = PFC_TARGETS.fat;
const CARBS_MAX = PFC_TARGETS.carbs;

function satisfiesTotalsRequirements(totals: NutritionTotals): boolean {
  return (
    totals.calories >= CAL_MIN &&
    totals.calories <= CAL_MAX &&
    totals.protein >= PROTEIN_MIN &&
    totals.fat <= FAT_MAX &&
    totals.carbs <= CARBS_MAX
  );
}

/** タンパク質が不足している場合、PFC上限を超えない範囲で高タンパクの商品を追加する（候補の順序をランダム化して同じ商品ばかりにならないようにする） */
function addItemsUntilMinProtein(
  items: Product[],
  pool: Product[],
  usedNames: Set<string>,
  minProtein: number,
): Product[] {
  const result = [...items];
  const used = new Set(usedNames);
  let totals = sumTotals(result);

  const filtered = pool.filter((p) => !used.has(p.name));
  const sorted = filtered.sort((a, b) => proteinDensity(b) - proteinDensity(a));
  const topN = 30;
  const head = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  for (let i = head.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [head[i], head[j]] = [head[j], head[i]];
  }
  const available = [...head, ...rest];

  for (const p of available) {
    if (totals.protein >= minProtein) break;
    const nextCal = totals.calories + p.calories;
    const nextFat = totals.fat + p.fat;
    const nextCarbs = totals.carbs + p.carbs;
    if (nextCal > CAL_MAX || nextFat > FAT_MAX || nextCarbs > CARBS_MAX) continue;
    result.push(p);
    used.add(p.name);
    totals = {
      calories: nextCal,
      protein: totals.protein + p.protein,
      fat: nextFat,
      carbs: nextCarbs,
      price: totals.price + p.price,
    };
  }
  return result;
}

/** カロリーが不足している場合、脂質・炭水化物上限を超えない範囲で商品を追加する */
function addItemsUntilMinCalories(
  items: Product[],
  pool: Product[],
  usedNames: Set<string>,
  minCalories: number,
): Product[] {
  const result = [...items];
  const used = new Set(usedNames);
  let totals = sumTotals(result);

  const available = pool
    .filter((p) => !used.has(p.name))
    .sort((a, b) => a.fat + a.carbs - (b.fat + b.carbs)); // 脂質・炭水化物が少ない順

  for (const p of available) {
    if (totals.calories >= minCalories) break;
    const nextCal = totals.calories + p.calories;
    const nextFat = totals.fat + p.fat;
    const nextCarbs = totals.carbs + p.carbs;
    if (nextCal > CAL_MAX || nextFat > FAT_MAX || nextCarbs > CARBS_MAX) continue;
    result.push(p);
    used.add(p.name);
    totals = {
      calories: nextCal,
      protein: totals.protein + p.protein,
      fat: nextFat,
      carbs: nextCarbs,
      price: totals.price + p.price,
    };
  }
  return result;
}

function pickForSlots(
  originalItems: Product[],
  pinnedIndices: Set<number>,
  mains: Product[],
  sides: Product[],
  excludeNames: Set<string> = new Set(),
): Product[] {
  const usedNames = new Set(excludeNames);
  const usedCategories = new Set<string>();
  for (let i = 0; i < originalItems.length; i++) {
    if (pinnedIndices.has(i)) {
      usedNames.add(originalItems[i].name);
      usedCategories.add(originalItems[i].category);
    }
  }

  const items = [...originalItems];
  for (let i = 0; i < items.length; i++) {
    if (pinnedIndices.has(i)) continue;
    const cat = categorize(originalItems[i]);
    const pool = (cat === 'main' ? mains : sides).filter((p) => !usedNames.has(p.name));
    if (pool.length > 0) {
      items[i] = weightedPickByProteinWithVariety(pool, usedCategories);
      usedNames.add(items[i].name);
      usedCategories.add(items[i].category);
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

    if (!satisfiesTotalsRequirements(totals)) continue;

    const s = score(totals) + categoryDiversityPenalty(allItems);
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
    let bestFallback: DailyPlan | null = null;
    let bestFallbackProtein = 0;
    const fallbackAttempts = 100;
    for (let attempt = 0; attempt < fallbackAttempts; attempt++) {
      const lunchItems = allPinnedLunch
        ? currentPlan.lunch.items
        : pickForSlots(currentPlan.lunch.items, pinned.lunch, mains, sides);
      const lunchNames = new Set(lunchItems.map((p) => p.name));
      let dinnerItems = allPinnedDinner
        ? currentPlan.dinner.items
        : pickForSlots(currentPlan.dinner.items, pinned.dinner, mains, sides, lunchNames);
      let allItems = [...lunchItems, ...dinnerItems];
      const usedNames = new Set(allItems.map((p) => p.name));
      const pool = [...mains, ...sides];
      allItems = addItemsUntilMinProtein(allItems, pool, usedNames, PROTEIN_MIN);
      if (sumTotals(allItems).calories < CAL_MIN) {
        allItems = addItemsUntilMinCalories(allItems, pool, usedNames, CAL_MIN);
      }
      const totals = sumTotals(allItems);
      if (totals.protein >= PROTEIN_MIN) {
        dinnerItems = allItems.slice(lunchItems.length);
        bestPlan = {
          lunch: { type: 'lunch', label: '昼食（軽め）', items: lunchItems, totals: sumTotals(lunchItems) },
          dinner: { type: 'dinner', label: '夕食（しっかり）', items: dinnerItems, totals: sumTotals(dinnerItems) },
          totals,
        };
        break;
      }
      if (totals.protein > bestFallbackProtein) {
        bestFallbackProtein = totals.protein;
        dinnerItems = allItems.slice(lunchItems.length);
        bestFallback = {
          lunch: { type: 'lunch', label: '昼食（軽め）', items: lunchItems, totals: sumTotals(lunchItems) },
          dinner: { type: 'dinner', label: '夕食（しっかり）', items: dinnerItems, totals: sumTotals(dinnerItems) },
          totals,
        };
      }
    }
    if (!bestPlan && bestFallback) bestPlan = bestFallback;
  }

  if (!bestPlan) {
    const emptyTotals: NutritionTotals = { calories: 0, protein: 0, fat: 0, carbs: 0, price: 0 };
    bestPlan = {
      lunch: { type: 'lunch', label: '昼食（軽め）', items: [], totals: emptyTotals },
      dinner: { type: 'dinner', label: '夕食（しっかり）', items: [], totals: emptyTotals },
      totals: emptyTotals,
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

    if (!satisfiesTotalsRequirements(totals)) continue;

    const s = score(totals) + categoryDiversityPenalty(allItems);
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
    let bestFallback: DailyPlan | null = null;
    let bestFallbackProtein = 0;
    const pool = [...mains, ...sides];
    const fallbackAttempts = 100;
    for (let attempt = 0; attempt < fallbackAttempts; attempt++) {
      const fallbackLunch = mains.length > 0 ? [weightedPickByProtein(mains)] : [];
      const usedNames = new Set(fallbackLunch.map((p) => p.name));
      const lunchCats = new Set(fallbackLunch.map((p) => p.category));
      const remainingMains = mains.filter((p) => !usedNames.has(p.name));
      let fallbackDinner = remainingMains.length > 0 ? weightedPickNByProtein(remainingMains, 2, lunchCats) : [];
      let allItems = [...fallbackLunch, ...fallbackDinner];
      for (const p of allItems) usedNames.add(p.name);
      allItems = addItemsUntilMinProtein(allItems, pool, usedNames, PROTEIN_MIN);
      if (sumTotals(allItems).calories < CAL_MIN) {
        allItems = addItemsUntilMinCalories(allItems, pool, usedNames, CAL_MIN);
      }
      const totals = sumTotals(allItems);
      if (totals.protein >= PROTEIN_MIN) {
        fallbackDinner = allItems.slice(fallbackLunch.length);
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
          totals,
        };
        break;
      }
      if (totals.protein > bestFallbackProtein) {
        bestFallbackProtein = totals.protein;
        fallbackDinner = allItems.slice(fallbackLunch.length);
        bestFallback = {
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
          totals,
        };
      }
    }
    if (!bestPlan && bestFallback) bestPlan = bestFallback;
  }

  if (!bestPlan) {
    const emptyTotals: NutritionTotals = { calories: 0, protein: 0, fat: 0, carbs: 0, price: 0 };
    bestPlan = {
      lunch: { type: 'lunch', label: '昼食（軽め）', items: [], totals: emptyTotals },
      dinner: { type: 'dinner', label: '夕食（しっかり）', items: [], totals: emptyTotals },
      totals: emptyTotals,
    };
  }
  return bestPlan;
}
