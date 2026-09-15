/**
 * Pure, deterministic generator for the shared demo dataset.
 *
 * Deliberately free of Prisma/DB imports so it can be unit tested directly.
 *
 * The demo user gets one long, continuous run of realistic days:
 *   - DEMO_HISTORY_DAYS days of history, so every trend period (1 week ...
 *     6 months) is fully populated
 *   - DEMO_FUTURE_DAYS days into the future, so browsing forward with the date
 *     picker always lands on data no matter when a visitor opens the demo
 *
 * Dates are resolved relative to "today" at seed time, and the per-day
 * randomness is seeded from the calendar date, so a given date always produces
 * the same meals.
 */

/** Days of history generated before today. */
export const DEMO_HISTORY_DAYS = 365;

/** Days generated after today so the demo never runs out of data. */
export const DEMO_FUTURE_DAYS = 730;

export type DemoMeal = {
  name: string;
  category: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  satFat: number;
  fibre: number;
  addedSugar: number;
  naturalSugar: number;
  salt: number;
  alcohol: number;
  omega3: number;
};

export type DemoDay = {
  /** Days from today: negative = past, 0 = today, positive = future. */
  offset: number;
  steps: number;
  meals: DemoMeal[];
};

export type DemoDayTotals = {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalSatFat: number;
  totalFibre: number;
  totalAddedSugar: number;
  totalNaturalSugar: number;
  totalSalt: number;
  totalAlcohol: number;
  totalOmega3: number;
};

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** YYYY-MM-DD for `offset` days from today (negative = past, positive = future). */
export function demoDateForOffset(offset: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0); // midday keeps DST transitions from shifting the day
  date.setDate(date.getDate() + offset);
  return isoDate(date);
}

/**
 * Timestamp for the nth meal of a demo day, spread across normal meal times so
 * the app's "ordered by createdAt" meal lists read breakfast -> dinner.
 */
const MEAL_HOURS = [8, 13, 19, 16, 21, 22];

export function demoMealTimestamp(date: string, index: number): Date {
  const hour = MEAL_HOURS[index] ?? 12 + index;
  return new Date(`${date}T${String(hour).padStart(2, "0")}:00:00Z`);
}

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------

/** Small, fast, seeded PRNG so generated days are stable across reseeds. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// ---------------------------------------------------------------------------
// Meal library
// ---------------------------------------------------------------------------

type Template = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  satFat: number;
  fibre: number;
  addedSugar: number;
  naturalSugar: number;
  salt: number;
  alcohol?: number;
  omega3?: number;
};

const BREAKFASTS: readonly Template[] = [
  { name: "Porridge with blueberries & honey", calories: 340, protein: 10, carbs: 52, fat: 8, satFat: 1.5, fibre: 5, addedSugar: 8, naturalSugar: 10, salt: 0.1 },
  { name: "Greek yoghurt, granola & banana", calories: 380, protein: 22, carbs: 48, fat: 10, satFat: 3, fibre: 4, addedSugar: 6, naturalSugar: 14, salt: 0.2 },
  { name: "Scrambled eggs on wholemeal toast", calories: 380, protein: 22, carbs: 30, fat: 18, satFat: 5, fibre: 4, addedSugar: 0, naturalSugar: 1, salt: 1.0 },
  { name: "Overnight oats with chia & mixed berries", calories: 360, protein: 14, carbs: 50, fat: 10, satFat: 2, fibre: 8, addedSugar: 4, naturalSugar: 12, salt: 0.1 },
  { name: "Peanut butter on seed bread + banana", calories: 420, protein: 14, carbs: 48, fat: 20, satFat: 3, fibre: 6, addedSugar: 2, naturalSugar: 14, salt: 0.4 },
  { name: "Smoked salmon & cream cheese bagel", calories: 420, protein: 24, carbs: 40, fat: 18, satFat: 6, fibre: 2, addedSugar: 2, naturalSugar: 2, salt: 1.8, omega3: 1200 },
  { name: "Poached eggs & avocado on rye toast", calories: 410, protein: 18, carbs: 30, fat: 24, satFat: 5, fibre: 7, addedSugar: 0, naturalSugar: 1, salt: 0.8 },
  { name: "Muesli with oat milk & strawberries", calories: 350, protein: 10, carbs: 55, fat: 10, satFat: 1.5, fibre: 6, addedSugar: 5, naturalSugar: 12, salt: 0.3 },
  { name: "Veggie omelette with feta & spinach", calories: 400, protein: 24, carbs: 8, fat: 30, satFat: 9, fibre: 3, addedSugar: 0, naturalSugar: 3, salt: 1.6 },
  { name: "Protein smoothie with berries & oats", calories: 330, protein: 26, carbs: 42, fat: 6, satFat: 1, fibre: 6, addedSugar: 4, naturalSugar: 16, salt: 0.3 },
];

const TREAT_BREAKFASTS: readonly Template[] = [
  { name: "2 x oat milk lattes", calories: 240, protein: 4, carbs: 28, fat: 10, satFat: 1.2, fibre: 1, addedSugar: 8, naturalSugar: 0, salt: 0.2 },
  { name: "Croissant & orange juice", calories: 420, protein: 8, carbs: 52, fat: 20, satFat: 11, fibre: 1, addedSugar: 6, naturalSugar: 14, salt: 0.8 },
  { name: "Toast with jam + coffee", calories: 280, protein: 6, carbs: 48, fat: 6, satFat: 1, fibre: 2, addedSugar: 14, naturalSugar: 2, salt: 0.6 },
  { name: "Full English breakfast", calories: 720, protein: 34, carbs: 38, fat: 44, satFat: 16, fibre: 5, addedSugar: 2, naturalSugar: 4, salt: 3.2 },
  { name: "Bacon roll & flat white", calories: 520, protein: 22, carbs: 42, fat: 28, satFat: 11, fibre: 2, addedSugar: 5, naturalSugar: 4, salt: 2.4 },
];

const LUNCHES: readonly Template[] = [
  { name: "Chicken & avocado wrap", calories: 520, protein: 35, carbs: 42, fat: 22, satFat: 5, fibre: 6, addedSugar: 1, naturalSugar: 3, salt: 1.2 },
  { name: "Grilled chicken salad with quinoa", calories: 550, protein: 42, carbs: 40, fat: 18, satFat: 3, fibre: 8, addedSugar: 0, naturalSugar: 5, salt: 0.9 },
  { name: "Turkey & pesto sandwich on sourdough", calories: 480, protein: 32, carbs: 44, fat: 18, satFat: 4, fibre: 3, addedSugar: 2, naturalSugar: 3, salt: 1.5 },
  { name: "Tuna nicoise salad", calories: 450, protein: 34, carbs: 25, fat: 22, satFat: 4, fibre: 6, addedSugar: 0, naturalSugar: 4, salt: 1.2, omega3: 800 },
  { name: "Chicken Caesar wrap", calories: 560, protein: 28, carbs: 45, fat: 28, satFat: 6, fibre: 2, addedSugar: 3, naturalSugar: 2, salt: 1.8 },
  { name: "Lentil & vegetable soup with sourdough", calories: 380, protein: 16, carbs: 52, fat: 10, satFat: 1.5, fibre: 12, addedSugar: 0, naturalSugar: 6, salt: 1.4 },
  { name: "Falafel wrap with hummus & tabbouleh", calories: 520, protein: 18, carbs: 60, fat: 22, satFat: 3, fibre: 10, addedSugar: 1, naturalSugar: 4, salt: 1.6 },
  { name: "Chicken & roasted veg couscous", calories: 520, protein: 34, carbs: 55, fat: 16, satFat: 3, fibre: 6, addedSugar: 0, naturalSugar: 6, salt: 1.0 },
  { name: "Ham & cheese toastie + side salad", calories: 460, protein: 24, carbs: 38, fat: 22, satFat: 10, fibre: 3, addedSugar: 1, naturalSugar: 3, salt: 1.8 },
  { name: "Chicken & rice bowl", calories: 600, protein: 40, carbs: 50, fat: 20, satFat: 5, fibre: 3, addedSugar: 2, naturalSugar: 3, salt: 1.0 },
  { name: "Sushi selection + miso soup", calories: 520, protein: 26, carbs: 62, fat: 14, satFat: 2, fibre: 4, addedSugar: 4, naturalSugar: 6, salt: 2.0 },
  { name: "Jacket potato with tuna & sweetcorn", calories: 480, protein: 30, carbs: 58, fat: 12, satFat: 3, fibre: 7, addedSugar: 0, naturalSugar: 7, salt: 1.3, omega3: 500 },
  { name: "Grilled halloumi & roasted veg salad", calories: 480, protein: 24, carbs: 28, fat: 30, satFat: 14, fibre: 6, addedSugar: 0, naturalSugar: 8, salt: 1.4 },
  { name: "Chicken pesto pasta salad", calories: 560, protein: 34, carbs: 58, fat: 18, satFat: 4, fibre: 5, addedSugar: 2, naturalSugar: 4, salt: 1.5 },
  { name: "BLT on white bread + crisps", calories: 520, protein: 18, carbs: 48, fat: 28, satFat: 8, fibre: 2, addedSugar: 3, naturalSugar: 4, salt: 2.0 },
];

const DINNERS: readonly Template[] = [
  { name: "Salmon fillet with roasted veg & sweet potato", calories: 620, protein: 38, carbs: 45, fat: 28, satFat: 5, fibre: 7, addedSugar: 0, naturalSugar: 8, salt: 1.0, omega3: 2200 },
  { name: "Spaghetti bolognese (lean beef)", calories: 680, protein: 38, carbs: 72, fat: 22, satFat: 8, fibre: 5, addedSugar: 3, naturalSugar: 8, salt: 1.8 },
  { name: "Baked sea bass with lemon, asparagus & new potatoes", calories: 520, protein: 40, carbs: 38, fat: 20, satFat: 4, fibre: 5, addedSugar: 0, naturalSugar: 3, salt: 0.8, omega3: 1800 },
  { name: "Chicken stir-fry with noodles", calories: 620, protein: 36, carbs: 68, fat: 20, satFat: 3, fibre: 5, addedSugar: 8, naturalSugar: 4, salt: 2.2 },
  { name: "Grilled sirloin steak with roasted sweet potato & broccoli", calories: 650, protein: 48, carbs: 42, fat: 28, satFat: 10, fibre: 6, addedSugar: 0, naturalSugar: 8, salt: 1.0 },
  { name: "Turkey meatballs with wholemeal pasta & tomato sauce", calories: 580, protein: 40, carbs: 62, fat: 16, satFat: 4, fibre: 8, addedSugar: 3, naturalSugar: 8, salt: 1.2 },
  { name: "Prawn pad thai", calories: 580, protein: 28, carbs: 65, fat: 22, satFat: 4, fibre: 3, addedSugar: 10, naturalSugar: 4, salt: 2.4, omega3: 400 },
  { name: "Lamb chops with roasted Mediterranean veg & couscous", calories: 700, protein: 42, carbs: 48, fat: 34, satFat: 14, fibre: 5, addedSugar: 0, naturalSugar: 6, salt: 1.2 },
  { name: "Cod fillet with crushed potatoes & greens", calories: 520, protein: 38, carbs: 42, fat: 18, satFat: 3, fibre: 6, addedSugar: 1, naturalSugar: 3, salt: 0.9, omega3: 1200 },
  { name: "Chicken curry with basmati rice", calories: 700, protein: 38, carbs: 78, fat: 24, satFat: 8, fibre: 6, addedSugar: 6, naturalSugar: 6, salt: 2.0 },
  { name: "Homemade beef chilli with rice", calories: 660, protein: 38, carbs: 68, fat: 22, satFat: 7, fibre: 8, addedSugar: 4, naturalSugar: 7, salt: 1.9 },
  { name: "Veggie bean chilli with brown rice", calories: 560, protein: 22, carbs: 82, fat: 14, satFat: 2, fibre: 14, addedSugar: 3, naturalSugar: 8, salt: 1.6 },
  { name: "Roast chicken with potatoes, carrots & gravy", calories: 720, protein: 46, carbs: 60, fat: 30, satFat: 8, fibre: 7, addedSugar: 2, naturalSugar: 7, salt: 1.8 },
  { name: "Mushroom & spinach risotto", calories: 600, protein: 18, carbs: 78, fat: 22, satFat: 9, fibre: 5, addedSugar: 2, naturalSugar: 5, salt: 1.7 },
  { name: "Turkey burger with sweet potato wedges", calories: 620, protein: 38, carbs: 52, fat: 26, satFat: 6, fibre: 7, addedSugar: 5, naturalSugar: 9, salt: 1.9 },
];

const TREAT_DINNERS: readonly Template[] = [
  { name: "Margherita pizza (2 slices) + garlic bread", calories: 780, protein: 24, carbs: 88, fat: 34, satFat: 14, fibre: 3, addedSugar: 4, naturalSugar: 6, salt: 2.5 },
  { name: "Burger + chips (pub dinner)", calories: 980, protein: 38, carbs: 72, fat: 55, satFat: 18, fibre: 4, addedSugar: 6, naturalSugar: 5, salt: 3.2 },
  { name: "Large domino's pizza (half)", calories: 1100, protein: 38, carbs: 110, fat: 50, satFat: 22, fibre: 4, addedSugar: 8, naturalSugar: 8, salt: 4.2 },
  { name: "Fish & chips with mushy peas", calories: 900, protein: 35, carbs: 90, fat: 42, satFat: 7, fibre: 6, addedSugar: 2, naturalSugar: 4, salt: 2.8 },
  { name: "Chicken tikka masala + naan & rice", calories: 950, protein: 42, carbs: 90, fat: 45, satFat: 18, fibre: 5, addedSugar: 8, naturalSugar: 8, salt: 3.4 },
  { name: "Chinese takeaway: sweet & sour chicken + egg fried rice", calories: 1020, protein: 36, carbs: 118, fat: 40, satFat: 8, fibre: 4, addedSugar: 24, naturalSugar: 10, salt: 3.8 },
];

const SNACKS: readonly Template[] = [
  { name: "Apple & almond butter", calories: 210, protein: 5, carbs: 22, fat: 12, satFat: 1, fibre: 4, addedSugar: 0, naturalSugar: 14, salt: 0.1 },
  { name: "Dark chocolate (3 squares) + herbal tea", calories: 140, protein: 2, carbs: 14, fat: 9, satFat: 5, fibre: 2, addedSugar: 8, naturalSugar: 0, salt: 0 },
  { name: "Banana & handful of walnuts", calories: 220, protein: 5, carbs: 28, fat: 12, satFat: 1, fibre: 3, addedSugar: 0, naturalSugar: 14, salt: 0, omega3: 500 },
  { name: "Greek yoghurt with honey", calories: 180, protein: 14, carbs: 20, fat: 5, satFat: 3, fibre: 0, addedSugar: 9, naturalSugar: 10, salt: 0.1 },
  { name: "KitKat Chunky + Diet Coke", calories: 250, protein: 3, carbs: 32, fat: 13, satFat: 8, fibre: 0, addedSugar: 26, naturalSugar: 2, salt: 0.2 },
  { name: "Crisps (ready salted, sharing bag)", calories: 300, protein: 3, carbs: 30, fat: 18, satFat: 2, fibre: 2, addedSugar: 1, naturalSugar: 1, salt: 0.9 },
  { name: "Protein shake with milk", calories: 220, protein: 30, carbs: 12, fat: 6, satFat: 4, fibre: 0, addedSugar: 4, naturalSugar: 8, salt: 0.3 },
  { name: "Cheese & crackers", calories: 320, protein: 10, carbs: 26, fat: 20, satFat: 11, fibre: 1, addedSugar: 1, naturalSugar: 2, salt: 1.2 },
  { name: "Mixed nuts & dried fruit", calories: 260, protein: 7, carbs: 24, fat: 16, satFat: 2, fibre: 4, addedSugar: 3, naturalSugar: 14, salt: 0.2 },
];

const DRINKS: readonly Template[] = [
  { name: "3 x pints lager", calories: 540, protein: 3, carbs: 36, fat: 0, satFat: 0, fibre: 0, addedSugar: 0, naturalSugar: 0, salt: 0, alcohol: 6 },
  { name: "Large glass of red wine", calories: 200, protein: 0, carbs: 3, fat: 0, satFat: 0, fibre: 0, addedSugar: 0, naturalSugar: 2, salt: 0, alcohol: 2.5 },
  { name: "2 x gin & tonic", calories: 280, protein: 0, carbs: 20, fat: 0, satFat: 0, fibre: 0, addedSugar: 20, naturalSugar: 0, salt: 0, alcohol: 3 },
  { name: "Pint of craft IPA", calories: 240, protein: 2, carbs: 18, fat: 0, satFat: 0, fibre: 0, addedSugar: 0, naturalSugar: 0, salt: 0, alcohol: 2.6 },
];

// ---------------------------------------------------------------------------
// Recent days kept hand-written so the "today/last two weeks" view reads like a
// real, curated diary.
// ---------------------------------------------------------------------------

type CuratedDay = { daysAgo: number; steps: number; meals: DemoMeal[] };

function curatedMeal(
  name: string,
  category: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  satFat: number,
  fibre: number,
  addedSugar: number,
  naturalSugar: number,
  salt: number,
  alcohol = 0,
  omega3 = 0,
): DemoMeal {
  return { name, category, calories, protein, carbs, fat, satFat, fibre, addedSugar, naturalSugar, salt, alcohol, omega3 };
}

const CURATED_RECENT_DAYS: readonly CuratedDay[] = [
  // Today is deliberately partial: breakfast + lunch logged so far.
  {
    daysAgo: 0,
    steps: 3200,
    meals: [
      curatedMeal("Porridge with blueberries & honey", "Breakfast", 340, 10, 52, 8, 1.5, 5, 8, 10, 0.1),
      curatedMeal("Chicken & avocado wrap", "Lunch", 520, 35, 42, 22, 5, 6, 1, 3, 1.2),
    ],
  },
  {
    daysAgo: 1,
    steps: 9800,
    meals: [
      curatedMeal("Greek yoghurt, granola & banana", "Breakfast", 380, 22, 48, 10, 3, 4, 6, 14, 0.2),
      curatedMeal("Grilled chicken salad with quinoa", "Lunch", 550, 42, 40, 18, 3, 8, 0, 5, 0.9),
      curatedMeal("Salmon fillet with roasted veg & sweet potato", "Dinner", 620, 38, 45, 28, 5, 7, 0, 8, 1.0, 0, 2200),
      curatedMeal("Apple & almond butter", "Snack", 210, 5, 22, 12, 1, 4, 0, 14, 0.1),
    ],
  },
  {
    daysAgo: 2,
    steps: 6400,
    meals: [
      curatedMeal("2 x oat milk lattes", "Breakfast", 240, 4, 28, 10, 1.2, 1, 8, 0, 0.2),
      curatedMeal("Turkey & pesto sandwich on sourdough", "Lunch", 480, 32, 44, 18, 4, 3, 2, 3, 1.5),
      curatedMeal("Spaghetti bolognese (lean beef)", "Dinner", 680, 38, 72, 22, 8, 5, 3, 8, 1.8),
    ],
  },
  {
    daysAgo: 3,
    steps: 4100,
    meals: [
      curatedMeal("Croissant & orange juice", "Breakfast", 420, 8, 52, 20, 11, 1, 6, 14, 0.8),
      curatedMeal("Chicken Caesar wrap", "Lunch", 560, 28, 45, 28, 6, 2, 3, 2, 1.8),
      curatedMeal("Margherita pizza (2 slices) + garlic bread", "Dinner", 780, 24, 88, 34, 14, 3, 4, 6, 2.5),
      curatedMeal("KitKat Chunky + Diet Coke", "Snack", 250, 3, 32, 13, 8, 0, 26, 2, 0.2),
    ],
  },
  {
    daysAgo: 4,
    steps: 11200,
    meals: [
      curatedMeal("Scrambled eggs on wholemeal toast", "Breakfast", 380, 22, 30, 18, 5, 4, 0, 1, 1.0),
      curatedMeal("Tuna nicoise salad", "Lunch", 450, 34, 25, 22, 4, 6, 0, 4, 1.2, 0, 800),
      curatedMeal("Baked sea bass with lemon, asparagus & new potatoes", "Dinner", 520, 40, 38, 20, 4, 5, 0, 3, 0.8, 0, 1800),
    ],
  },
  {
    daysAgo: 5,
    steps: 7300,
    meals: [
      curatedMeal("Peanut butter on seed bread + banana", "Breakfast", 420, 14, 48, 20, 3, 6, 2, 14, 0.4),
      curatedMeal("Lentil & vegetable soup with sourdough", "Lunch", 380, 16, 52, 10, 1.5, 12, 0, 6, 1.4),
      curatedMeal("Chicken stir-fry with noodles", "Dinner", 620, 36, 68, 20, 3, 5, 8, 4, 2.2),
    ],
  },
  {
    daysAgo: 6,
    steps: 14200,
    meals: [
      curatedMeal("Overnight oats with chia & mixed berries", "Breakfast", 360, 14, 50, 10, 2, 8, 4, 12, 0.1),
      curatedMeal("Falafel wrap with hummus & tabbouleh", "Lunch", 520, 18, 60, 22, 3, 10, 1, 4, 1.6),
      curatedMeal("Grilled sirloin steak with roasted sweet potato & broccoli", "Dinner", 650, 48, 42, 28, 10, 6, 0, 8, 1.0),
      curatedMeal("Dark chocolate (3 squares) + herbal tea", "Snack", 140, 2, 14, 9, 5, 2, 8, 0, 0),
    ],
  },
  {
    daysAgo: 7,
    steps: 5600,
    meals: [
      curatedMeal("Oat milk latte + banana", "Breakfast", 240, 5, 38, 8, 1, 3, 4, 14, 0.1),
      curatedMeal("BLT on white bread + crisps", "Lunch", 520, 18, 48, 28, 8, 2, 3, 4, 2.0),
      curatedMeal("Burger + chips (pub dinner)", "Dinner", 980, 38, 72, 55, 18, 4, 6, 5, 3.2),
      curatedMeal("3 x pints lager", "Other", 540, 3, 36, 0, 0, 0, 0, 0, 0, 6),
    ],
  },
  {
    daysAgo: 8,
    steps: 8100,
    meals: [
      curatedMeal("Poached eggs & avocado on rye toast", "Breakfast", 410, 18, 30, 24, 5, 7, 0, 1, 0.8),
      curatedMeal("Chicken & roasted veg couscous", "Lunch", 520, 34, 55, 16, 3, 6, 0, 6, 1.0),
      curatedMeal("Prawn pad thai", "Dinner", 580, 28, 65, 22, 4, 3, 10, 4, 2.4, 0, 400),
    ],
  },
  {
    daysAgo: 9,
    steps: 10500,
    meals: [
      curatedMeal("Smoked salmon & cream cheese bagel", "Breakfast", 420, 24, 40, 18, 6, 2, 2, 2, 1.8, 0, 1200),
      curatedMeal("Grilled halloumi & roasted veg salad", "Lunch", 480, 24, 28, 30, 14, 6, 0, 8, 1.4),
      curatedMeal("Turkey meatballs with wholemeal pasta & tomato sauce", "Dinner", 580, 40, 62, 16, 4, 8, 3, 8, 1.2),
      curatedMeal("Banana & handful of walnuts", "Snack", 220, 5, 28, 12, 1, 3, 0, 14, 0, 0, 500),
    ],
  },
  {
    daysAgo: 10,
    steps: 6800,
    meals: [
      curatedMeal("Muesli with oat milk & strawberries", "Breakfast", 350, 10, 55, 10, 1.5, 6, 5, 12, 0.3),
      curatedMeal("Ham & cheese toastie + side salad", "Lunch", 460, 24, 38, 22, 10, 3, 1, 3, 1.8),
      curatedMeal("Lamb chops with roasted Mediterranean veg & couscous", "Dinner", 700, 42, 48, 34, 14, 5, 0, 6, 1.2),
    ],
  },
  {
    daysAgo: 11,
    steps: 3400,
    meals: [
      curatedMeal("Toast with jam + coffee", "Breakfast", 280, 6, 48, 6, 1, 2, 14, 2, 0.6),
      curatedMeal("Large domino's pizza (half)", "Dinner", 1100, 38, 110, 50, 22, 4, 8, 8, 4.2),
    ],
  },
];

/** Offsets covered by CURATED_RECENT_DAYS (0 back to -11). */
const CURATED_SPAN_DAYS = CURATED_RECENT_DAYS.length - 1;

type SavedMealTemplate = Template & { category: string };

const SAVED_MEAL_TEMPLATES: readonly SavedMealTemplate[] = [
  { name: "Chicken & Rice Bowl", category: "Lunch", calories: 600, protein: 40, carbs: 50, fat: 20, satFat: 5, fibre: 3, addedSugar: 2, naturalSugar: 3, salt: 1.0 },
  { name: "Overnight Oats", category: "Breakfast", calories: 380, protein: 14, carbs: 55, fat: 10, satFat: 2, fibre: 7, addedSugar: 6, naturalSugar: 12, salt: 0.1 },
  { name: "Salmon & Roasted Veg", category: "Dinner", calories: 520, protein: 38, carbs: 25, fat: 28, satFat: 5, fibre: 6, addedSugar: 0, naturalSugar: 5, salt: 0.8, omega3: 2200 },
  { name: "Greek Yoghurt & Berries", category: "Snack", calories: 190, protein: 15, carbs: 22, fat: 4, satFat: 2.5, fibre: 2, addedSugar: 6, naturalSugar: 14, salt: 0.1 },
  { name: "Chicken Stir-fry", category: "Dinner", calories: 620, protein: 36, carbs: 68, fat: 20, satFat: 3, fibre: 5, addedSugar: 8, naturalSugar: 4, salt: 2.2 },
];

export const DEMO_SAVED_MEALS: readonly DemoMeal[] = SAVED_MEAL_TEMPLATES.map((template) => ({
  name: template.name,
  category: template.category,
  calories: template.calories,
  protein: template.protein,
  carbs: template.carbs,
  fat: template.fat,
  satFat: template.satFat,
  fibre: template.fibre,
  addedSugar: template.addedSugar,
  naturalSugar: template.naturalSugar,
  salt: template.salt,
  alcohol: template.alcohol ?? 0,
  omega3: template.omega3 ?? 0,
}));

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/** Scales a template by a small, seeded portion-size variation. */
function materialise(template: Template, category: string, rng: () => number): DemoMeal {
  const portion = 0.9 + rng() * 0.2; // +/- 10%

  return {
    name: template.name,
    category,
    calories: Math.round(template.calories * portion),
    protein: round(template.protein * portion, 1),
    carbs: round(template.carbs * portion, 1),
    fat: round(template.fat * portion, 1),
    satFat: round(template.satFat * portion, 1),
    fibre: round(template.fibre * portion, 1),
    addedSugar: round(template.addedSugar * portion, 1),
    naturalSugar: round(template.naturalSugar * portion, 1),
    salt: round(template.salt * portion, 2),
    alcohol: round((template.alcohol ?? 0) * portion, 1),
    omega3: Math.round((template.omega3 ?? 0) * portion),
  };
}

function generateDay(offset: number): DemoDay {
  const date = demoDateForOffset(offset);
  const rng = mulberry32(seedFromString(date));

  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const isWeekend = weekday === 0 || weekday === 6;
  const isFriday = weekday === 5;

  const meals: DemoMeal[] = [
    materialise(
      pick(rng, isWeekend || rng() < 0.22 ? TREAT_BREAKFASTS : BREAKFASTS),
      "Breakfast",
      rng,
    ),
    materialise(pick(rng, LUNCHES), "Lunch", rng),
  ];

  const treatDinnerChance = isWeekend ? 0.45 : isFriday ? 0.3 : 0.12;
  meals.push(
    materialise(pick(rng, rng() < treatDinnerChance ? TREAT_DINNERS : DINNERS), "Dinner", rng),
  );

  if (rng() < 0.82) {
    meals.push(materialise(pick(rng, SNACKS), "Snack", rng));
  }

  if ((isWeekend || isFriday) && rng() < 0.5) {
    meals.push(materialise(pick(rng, DRINKS), "Other", rng));
  }

  const baseSteps = isWeekend ? 5400 : isFriday ? 6900 : 8400;
  const newShoesDay = rng() < 0.14 ? 4200 : 0;
  const steps = Math.max(1100, Math.round((baseSteps + newShoesDay) * (0.55 + rng() * 0.9)));

  return { offset, steps, meals };
}

/**
 * The full demo dataset: hand-written recent days plus generated days covering
 * DEMO_HISTORY_DAYS back and DEMO_FUTURE_DAYS forward, in date order.
 */
export function buildDemoDataset(): DemoDay[] {
  const days: DemoDay[] = CURATED_RECENT_DAYS.map((day) => ({
    offset: -day.daysAgo,
    steps: day.steps,
    meals: day.meals.map((meal) => ({ ...meal })),
  }));

  for (let offset = -DEMO_HISTORY_DAYS; offset <= DEMO_FUTURE_DAYS; offset++) {
    if (offset >= -CURATED_SPAN_DAYS && offset <= 0) continue;
    days.push(generateDay(offset));
  }

  return days.sort((a, b) => a.offset - b.offset);
}

/** Day-level snapshot totals for a demo day (matches the Day model columns). */
export function demoDayTotals(meals: readonly DemoMeal[]): DemoDayTotals {
  const sum = (key: keyof Omit<DemoMeal, "name" | "category">) =>
    round(meals.reduce((total, meal) => total + meal[key], 0), 1);

  return {
    totalCalories: Math.round(sum("calories")),
    totalProtein: sum("protein"),
    totalCarbs: sum("carbs"),
    totalFat: sum("fat"),
    totalSatFat: sum("satFat"),
    totalFibre: sum("fibre"),
    totalAddedSugar: sum("addedSugar"),
    totalNaturalSugar: sum("naturalSugar"),
    totalSalt: sum("salt"),
    totalAlcohol: sum("alcohol"),
    totalOmega3: sum("omega3"),
  };
}
