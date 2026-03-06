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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
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

function score(totals: NutritionTotals): number {
  const pErr = Math.abs(totals.protein - PFC_TARGETS.protein) / PFC_TARGETS.protein;
  const fErr = Math.abs(totals.fat - PFC_TARGETS.fat) / PFC_TARGETS.fat;
  const cErr = Math.abs(totals.carbs - PFC_TARGETS.carbs) / PFC_TARGETS.carbs;
  const calErr = Math.abs(totals.calories - PFC_TARGETS.calories) / PFC_TARGETS.calories;

  const fOver = totals.fat > PFC_TARGETS.fat ? (totals.fat - PFC_TARGETS.fat) / PFC_TARGETS.fat * 10 : 0;
  const cOver = totals.carbs > PFC_TARGETS.carbs ? (totals.carbs - PFC_TARGETS.carbs) / PFC_TARGETS.carbs * 10 : 0;

  return pErr * 2 + fErr + cErr + calErr + fOver + cOver;
}

function generateLunch(mains: Product[], sides: Product[]): Product[] {
  const targetCal = PFC_TARGETS.calories * LUNCH_RATIO;
  const mainItem = pick(mains.filter((p) => p.calories < targetCal * 0.9));
  const candidates = sides.filter((p) => p.calories < 300);

  if (!mainItem) return [pick(mains)];

  const remaining = targetCal - mainItem.calories;
  if (remaining > 80 && candidates.length > 0) {
    const side = candidates.reduce((best, p) =>
      Math.abs(p.calories - remaining) < Math.abs(best.calories - remaining) ? p : best,
    );
    return [mainItem, side];
  }
  return [mainItem];
}

function generateDinner(mains: Product[], sides: Product[]): Product[] {
  const targetCal = PFC_TARGETS.calories * DINNER_RATIO;
  const items: Product[] = [];

  const mainItems = pickN(mains, 1 + Math.floor(Math.random() * 2));
  items.push(...mainItems);

  const sideItems = pickN(
    sides.filter((s) => !items.includes(s)),
    1 + Math.floor(Math.random() * 2),
  );
  items.push(...sideItems);

  const total = items.reduce((s, p) => s + p.calories, 0);
  if (total < targetCal * 0.5 && sides.length > 0) {
    items.push(pick(sides.filter((s) => !items.includes(s))));
  }

  return items;
}

export function generateDailyPlan(): DailyPlan {
  const mains = products.filter((p) => categorize(p) === 'main');
  const sides = products.filter((p) => categorize(p) === 'side');

  let bestPlan: DailyPlan | null = null;
  let bestScore = Infinity;

  const iterations = products.length > 0 ? 1000 : 0;

  for (let i = 0; i < iterations; i++) {
    const lunchItems = generateLunch(mains, sides);
    const dinnerItems = generateDinner(mains, sides);
    const allItems = [...lunchItems, ...dinnerItems];
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
    const fallbackLunch = mains.length > 0 ? [pick(mains)] : [];
    const fallbackDinner = mains.length > 1 ? pickN(mains, 2) : mains;
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
