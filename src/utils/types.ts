export interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  category: string;
}

export type MealType = 'lunch' | 'dinner';

export interface Meal {
  type: MealType;
  label: string;
  items: Product[];
  totals: NutritionTotals;
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  price: number;
}

export interface DailyPlan {
  lunch: Meal;
  dinner: Meal;
  totals: NutritionTotals;
}

export const PFC_TARGETS = {
  calories: 2000,
  protein: 145,
  fat: 55,
  carbs: 230,
} as const;

/** 一日のタンパク質の下限（これ未満のプランは採用しない） */
export const PROTEIN_MIN = 120;

export const LUNCH_RATIO = 0.32;
export const DINNER_RATIO = 0.68;
