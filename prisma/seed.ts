import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: "test@test.com" },
    update: {},
    create: { email: "test@test.com" },
  });
  console.log("✅ User:", user.id);

  // Create day for today
  const today = "2026-03-26";
  const day = await prisma.day.upsert({
    where: { userId_date: { userId: user.id, date: today } },
    update: {},
    create: {
      userId: user.id,
      date: today,
    },
  });
  console.log("✅ Day:", day.id);

  // Create sample meals
  const meals = [
    {
      name: "Chicken & Rice",
      calories: 600,
      protein: 40,
      carbs: 50,
      fat: 20,
      satFat: 5,
      fibre: 3,
      addedSugar: 2,
      naturalSugar: 3,
      salt: 1,
    },
    {
      name: "Greek Yogurt",
      calories: 150,
      protein: 15,
      carbs: 12,
      fat: 3,
      satFat: 1.5,
      fibre: 0,
      addedSugar: 5,
      naturalSugar: 7,
      salt: 0.2,
    },
    {
      name: "Salmon & Veg",
      calories: 480,
      protein: 35,
      carbs: 20,
      fat: 25,
      satFat: 4,
      fibre: 5,
      addedSugar: 0,
      naturalSugar: 6,
      salt: 0.8,
    },
  ];

  for (const meal of meals) {
    await prisma.meal.create({
      data: {
        userId: user.id,
        dayId: day.id,
        ...meal,
      },
    });
  }
  console.log("✅ Created", meals.length, "meals");

  // Recalculate day totals
  const allMeals = await prisma.meal.findMany({ where: { dayId: day.id } });
  const totals = allMeals.reduce(
    (acc, m) => ({
      totalCalories: acc.totalCalories + m.calories,
      totalProtein: acc.totalProtein + m.protein,
      totalCarbs: acc.totalCarbs + m.carbs,
      totalFat: acc.totalFat + m.fat,
      totalSatFat: acc.totalSatFat + m.satFat,
      totalFibre: acc.totalFibre + m.fibre,
      totalAddedSugar: acc.totalAddedSugar + m.addedSugar,
      totalNaturalSugar: acc.totalNaturalSugar + m.naturalSugar,
      totalSalt: acc.totalSalt + m.salt,
    }),
    {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalSatFat: 0,
      totalFibre: 0,
      totalAddedSugar: 0,
      totalNaturalSugar: 0,
      totalSalt: 0,
    }
  );

  await prisma.day.update({ where: { id: day.id }, data: totals });
  console.log("✅ Day totals updated:", totals);

  // Add a saved meal template
  await prisma.savedMeal.upsert({
    where: { id: "seed-saved-meal-1" },
    update: {},
    create: {
      id: "seed-saved-meal-1",
      userId: user.id,
      name: "Chicken & Rice",
      calories: 600,
      protein: 40,
      carbs: 50,
      fat: 20,
      satFat: 5,
      fibre: 3,
      addedSugar: 2,
      naturalSugar: 3,
      salt: 1,
    },
  });
  console.log("✅ Saved meal created");

  console.log("\n🎉 Seed complete!");
  console.log("   User ID:", user.id);
  console.log("   Day ID:", day.id);
  console.log("   Date:", today);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

