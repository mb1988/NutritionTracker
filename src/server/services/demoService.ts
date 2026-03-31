import { prisma } from "@/lib/prisma";
import { DEMO_USER_ID, DEMO_USER_EMAIL } from "@/lib/demo";

// ── Helpers ──────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type DemoMeal = {
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

type DemoDay = { daysAgo: number; steps: number; meals: DemoMeal[] };

// ── Realistic demo data ─────────────────────────────────────

const DEMO_DAYS: DemoDay[] = [
  // Day 0 — today (partial: just breakfast + lunch so far)
  {
    daysAgo: 0,
    steps: 3200,
    meals: [
      { name: "Porridge with blueberries & honey", category: "Breakfast", calories: 340, protein: 10, carbs: 52, fat: 8, satFat: 1.5, fibre: 5, addedSugar: 8, naturalSugar: 10, salt: 0.1, alcohol: 0, omega3: 0 },
      { name: "Chicken & avocado wrap", category: "Lunch", calories: 520, protein: 35, carbs: 42, fat: 22, satFat: 5, fibre: 6, addedSugar: 1, naturalSugar: 3, salt: 1.2, alcohol: 0, omega3: 0 },
    ],
  },
  // Day 1 — great day (high protein, low sugar, good fibre)
  {
    daysAgo: 1,
    steps: 9800,
    meals: [
      { name: "Greek yoghurt, granola & banana", category: "Breakfast", calories: 380, protein: 22, carbs: 48, fat: 10, satFat: 3, fibre: 4, addedSugar: 6, naturalSugar: 14, salt: 0.2, alcohol: 0, omega3: 0 },
      { name: "Grilled chicken salad with quinoa", category: "Lunch", calories: 550, protein: 42, carbs: 40, fat: 18, satFat: 3, fibre: 8, addedSugar: 0, naturalSugar: 5, salt: 0.9, alcohol: 0, omega3: 0 },
      { name: "Salmon fillet with roasted veg & sweet potato", category: "Dinner", calories: 620, protein: 38, carbs: 45, fat: 28, satFat: 5, fibre: 7, addedSugar: 0, naturalSugar: 8, salt: 1.0, alcohol: 0, omega3: 2200 },
      { name: "Apple & almond butter", category: "Snack", calories: 210, protein: 5, carbs: 22, fat: 12, satFat: 1, fibre: 4, addedSugar: 0, naturalSugar: 14, salt: 0.1, alcohol: 0, omega3: 0 },
    ],
  },
  // Day 2 — decent day
  {
    daysAgo: 2,
    steps: 6400,
    meals: [
      { name: "2 x oat milk lattes", category: "Breakfast", calories: 240, protein: 4, carbs: 28, fat: 10, satFat: 1.2, fibre: 1, addedSugar: 8, naturalSugar: 0, salt: 0.2, alcohol: 0, omega3: 0 },
      { name: "Turkey & pesto sandwich on sourdough", category: "Lunch", calories: 480, protein: 32, carbs: 44, fat: 18, satFat: 4, fibre: 3, addedSugar: 2, naturalSugar: 3, salt: 1.5, alcohol: 0, omega3: 0 },
      { name: "Spaghetti bolognese (lean beef)", category: "Dinner", calories: 680, protein: 38, carbs: 72, fat: 22, satFat: 8, fibre: 5, addedSugar: 3, naturalSugar: 8, salt: 1.8, alcohol: 0, omega3: 0 },
    ],
  },
  // Day 3 — needs work (high sugar, takeaway snack)
  {
    daysAgo: 3,
    steps: 4100,
    meals: [
      { name: "Croissant & orange juice", category: "Breakfast", calories: 420, protein: 8, carbs: 52, fat: 20, satFat: 11, fibre: 1, addedSugar: 6, naturalSugar: 14, salt: 0.8, alcohol: 0, omega3: 0 },
      { name: "Chicken Caesar wrap", category: "Lunch", calories: 560, protein: 28, carbs: 45, fat: 28, satFat: 6, fibre: 2, addedSugar: 3, naturalSugar: 2, salt: 1.8, alcohol: 0, omega3: 0 },
      { name: "Margherita pizza (2 slices) + garlic bread", category: "Dinner", calories: 780, protein: 24, carbs: 88, fat: 34, satFat: 14, fibre: 3, addedSugar: 4, naturalSugar: 6, salt: 2.5, alcohol: 0, omega3: 0 },
      { name: "KitKat Chunky + Diet Coke", category: "Snack", calories: 250, protein: 3, carbs: 32, fat: 13, satFat: 8, fibre: 0, addedSugar: 26, naturalSugar: 2, salt: 0.2, alcohol: 0, omega3: 0 },
    ],
  },
  // Day 4 — great day (fish day, high omega-3)
  {
    daysAgo: 4,
    steps: 11200,
    meals: [
      { name: "Scrambled eggs on wholemeal toast", category: "Breakfast", calories: 380, protein: 22, carbs: 30, fat: 18, satFat: 5, fibre: 4, addedSugar: 0, naturalSugar: 1, salt: 1.0, alcohol: 0, omega3: 0 },
      { name: "Tuna niçoise salad", category: "Lunch", calories: 450, protein: 34, carbs: 25, fat: 22, satFat: 4, fibre: 6, addedSugar: 0, naturalSugar: 4, salt: 1.2, alcohol: 0, omega3: 800 },
      { name: "Baked sea bass with lemon, asparagus & new potatoes", category: "Dinner", calories: 520, protein: 40, carbs: 38, fat: 20, satFat: 4, fibre: 5, addedSugar: 0, naturalSugar: 3, salt: 0.8, alcohol: 0, omega3: 1800 },
    ],
  },
  // Day 5 — decent day
  {
    daysAgo: 5,
    steps: 7300,
    meals: [
      { name: "Peanut butter on seed bread + banana", category: "Breakfast", calories: 420, protein: 14, carbs: 48, fat: 20, satFat: 3, fibre: 6, addedSugar: 2, naturalSugar: 14, salt: 0.4, alcohol: 0, omega3: 0 },
      { name: "Lentil & vegetable soup with sourdough", category: "Lunch", calories: 380, protein: 16, carbs: 52, fat: 10, satFat: 1.5, fibre: 12, addedSugar: 0, naturalSugar: 6, salt: 1.4, alcohol: 0, omega3: 0 },
      { name: "Chicken stir-fry with noodles", category: "Dinner", calories: 620, protein: 36, carbs: 68, fat: 20, satFat: 3, fibre: 5, addedSugar: 8, naturalSugar: 4, salt: 2.2, alcohol: 0, omega3: 0 },
    ],
  },
  // Day 6 — great day (active, balanced)
  {
    daysAgo: 6,
    steps: 14200,
    meals: [
      { name: "Overnight oats with chia & mixed berries", category: "Breakfast", calories: 360, protein: 14, carbs: 50, fat: 10, satFat: 2, fibre: 8, addedSugar: 4, naturalSugar: 12, salt: 0.1, alcohol: 0, omega3: 0 },
      { name: "Falafel wrap with hummus & tabbouleh", category: "Lunch", calories: 520, protein: 18, carbs: 60, fat: 22, satFat: 3, fibre: 10, addedSugar: 1, naturalSugar: 4, salt: 1.6, alcohol: 0, omega3: 0 },
      { name: "Grilled sirloin steak with roasted sweet potato & broccoli", category: "Dinner", calories: 650, protein: 48, carbs: 42, fat: 28, satFat: 10, fibre: 6, addedSugar: 0, naturalSugar: 8, salt: 1.0, alcohol: 0, omega3: 0 },
      { name: "Dark chocolate (3 squares) + herbal tea", category: "Snack", calories: 140, protein: 2, carbs: 14, fat: 9, satFat: 5, fibre: 2, addedSugar: 8, naturalSugar: 0, salt: 0, alcohol: 0, omega3: 0 },
    ],
  },
  // Day 7 — needs work (Friday night out)
  {
    daysAgo: 7,
    steps: 5600,
    meals: [
      { name: "Oat milk latte + banana", category: "Breakfast", calories: 240, protein: 5, carbs: 38, fat: 8, satFat: 1, fibre: 3, addedSugar: 4, naturalSugar: 14, salt: 0.1, alcohol: 0, omega3: 0 },
      { name: "BLT on white bread + crisps", category: "Lunch", calories: 520, protein: 18, carbs: 48, fat: 28, satFat: 8, fibre: 2, addedSugar: 3, naturalSugar: 4, salt: 2.0, alcohol: 0, omega3: 0 },
      { name: "Burger + chips (pub dinner)", category: "Dinner", calories: 980, protein: 38, carbs: 72, fat: 55, satFat: 18, fibre: 4, addedSugar: 6, naturalSugar: 5, salt: 3.2, alcohol: 0, omega3: 0 },
      { name: "3 x pints lager", category: "Other", calories: 540, protein: 3, carbs: 36, fat: 0, satFat: 0, fibre: 0, addedSugar: 0, naturalSugar: 0, salt: 0, alcohol: 6, omega3: 0 },
    ],
  },
  // Day 8 — decent day
  {
    daysAgo: 8,
    steps: 8100,
    meals: [
      { name: "Poached eggs & avocado on rye toast", category: "Breakfast", calories: 410, protein: 18, carbs: 30, fat: 24, satFat: 5, fibre: 7, addedSugar: 0, naturalSugar: 1, salt: 0.8, alcohol: 0, omega3: 0 },
      { name: "Chicken & roasted veg couscous", category: "Lunch", calories: 520, protein: 34, carbs: 55, fat: 16, satFat: 3, fibre: 6, addedSugar: 0, naturalSugar: 6, salt: 1.0, alcohol: 0, omega3: 0 },
      { name: "Prawn pad thai", category: "Dinner", calories: 580, protein: 28, carbs: 65, fat: 22, satFat: 4, fibre: 3, addedSugar: 10, naturalSugar: 4, salt: 2.4, alcohol: 0, omega3: 400 },
    ],
  },
  // Day 9 — great day
  {
    daysAgo: 9,
    steps: 10500,
    meals: [
      { name: "Smoked salmon & cream cheese bagel", category: "Breakfast", calories: 420, protein: 24, carbs: 40, fat: 18, satFat: 6, fibre: 2, addedSugar: 2, naturalSugar: 2, salt: 1.8, alcohol: 0, omega3: 1200 },
      { name: "Grilled halloumi & roasted veg salad", category: "Lunch", calories: 480, protein: 24, carbs: 28, fat: 30, satFat: 14, fibre: 6, addedSugar: 0, naturalSugar: 8, salt: 1.4, alcohol: 0, omega3: 0 },
      { name: "Turkey meatballs with wholemeal pasta & tomato sauce", category: "Dinner", calories: 580, protein: 40, carbs: 62, fat: 16, satFat: 4, fibre: 8, addedSugar: 3, naturalSugar: 8, salt: 1.2, alcohol: 0, omega3: 0 },
      { name: "Banana & handful of walnuts", category: "Snack", calories: 220, protein: 5, carbs: 28, fat: 12, satFat: 1, fibre: 3, addedSugar: 0, naturalSugar: 14, salt: 0, alcohol: 0, omega3: 500 },
    ],
  },
  // Day 10 — decent day
  {
    daysAgo: 10,
    steps: 6800,
    meals: [
      { name: "Muesli with oat milk & strawberries", category: "Breakfast", calories: 350, protein: 10, carbs: 55, fat: 10, satFat: 1.5, fibre: 6, addedSugar: 5, naturalSugar: 12, salt: 0.3, alcohol: 0, omega3: 0 },
      { name: "Ham & cheese toastie + side salad", category: "Lunch", calories: 460, protein: 24, carbs: 38, fat: 22, satFat: 10, fibre: 3, addedSugar: 1, naturalSugar: 3, salt: 1.8, alcohol: 0, omega3: 0 },
      { name: "Lamb chops with roasted Mediterranean veg & couscous", category: "Dinner", calories: 700, protein: 42, carbs: 48, fat: 34, satFat: 14, fibre: 5, addedSugar: 0, naturalSugar: 6, salt: 1.2, alcohol: 0, omega3: 0 },
    ],
  },
  // Day 11 — needs work (skipped lunch, compensated at night)
  {
    daysAgo: 11,
    steps: 3400,
    meals: [
      { name: "Toast with jam + coffee", category: "Breakfast", calories: 280, protein: 6, carbs: 48, fat: 6, satFat: 1, fibre: 2, addedSugar: 14, naturalSugar: 2, salt: 0.6, alcohol: 0, omega3: 0 },
      { name: "Large dominos pizza (half)", category: "Dinner", calories: 1100, protein: 38, carbs: 110, fat: 50, satFat: 22, fibre: 4, addedSugar: 8, naturalSugar: 8, salt: 4.2, alcohol: 0, omega3: 0 },
    ],
  },
];

const DEMO_SAVED_MEALS: DemoMeal[] = [
  { name: "Chicken & Rice Bowl", category: "Lunch", calories: 600, protein: 40, carbs: 50, fat: 20, satFat: 5, fibre: 3, addedSugar: 2, naturalSugar: 3, salt: 1.0, alcohol: 0, omega3: 0 },
  { name: "Overnight Oats", category: "Breakfast", calories: 380, protein: 14, carbs: 55, fat: 10, satFat: 2, fibre: 7, addedSugar: 6, naturalSugar: 12, salt: 0.1, alcohol: 0, omega3: 0 },
  { name: "Salmon & Roasted Veg", category: "Dinner", calories: 520, protein: 38, carbs: 25, fat: 28, satFat: 5, fibre: 6, addedSugar: 0, naturalSugar: 5, salt: 0.8, alcohol: 0, omega3: 2200 },
];

// ── Seed / reset ────────────────────────────────────────────

export async function resetDemoData(): Promise<void> {
  // 1. Ensure demo user exists
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: { id: DEMO_USER_ID, email: DEMO_USER_EMAIL, name: "Demo User" },
  });

  // 2. Wipe existing demo data
  await prisma.meal.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.day.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.savedMeal.deleteMany({ where: { userId: DEMO_USER_ID } });

  // 3. Create days + meals
  for (const dayData of DEMO_DAYS) {
    const date = daysAgo(dayData.daysAgo);

    const totals = dayData.meals.reduce(
      (acc, m) => ({
        totalCalories:     acc.totalCalories     + m.calories,
        totalProtein:      acc.totalProtein      + m.protein,
        totalCarbs:        acc.totalCarbs        + m.carbs,
        totalFat:          acc.totalFat          + m.fat,
        totalSatFat:       acc.totalSatFat       + m.satFat,
        totalFibre:        acc.totalFibre        + m.fibre,
        totalAddedSugar:   acc.totalAddedSugar   + m.addedSugar,
        totalNaturalSugar: acc.totalNaturalSugar + m.naturalSugar,
        totalSalt:         acc.totalSalt         + m.salt,
        totalAlcohol:      acc.totalAlcohol      + m.alcohol,
        totalOmega3:       acc.totalOmega3       + m.omega3,
      }),
      {
        totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0,
        totalSatFat: 0, totalFibre: 0, totalAddedSugar: 0, totalNaturalSugar: 0,
        totalSalt: 0, totalAlcohol: 0, totalOmega3: 0,
      },
    );

    const day = await prisma.day.create({
      data: {
        userId: DEMO_USER_ID,
        date,
        totalSteps: dayData.steps,
        ...totals,
      },
    });

    for (const meal of dayData.meals) {
      await prisma.meal.create({
        data: { userId: DEMO_USER_ID, dayId: day.id, ...meal },
      });
    }
  }

  // 4. Create saved meal templates
  for (const meal of DEMO_SAVED_MEALS) {
    await prisma.savedMeal.create({
      data: { userId: DEMO_USER_ID, ...meal },
    });
  }
}

