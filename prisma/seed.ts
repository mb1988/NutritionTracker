import { PrismaClient } from "@prisma/client";
import {
  buildDemoDataset,
  demoDateForOffset,
  demoDayTotals,
  demoMealTimestamp,
} from "../src/lib/demoDataset";

const prisma = new PrismaClient();

/** Local seeding only writes recent days - the demo user gets the full range. */
const SEED_DAYS = 30;

/**
 * Local development seed.
 *
 * Reuses the same generator as the demo mode so the numbers people see locally
 * match the deployed demo, but only writes the most recent SEED_DAYS so local
 * runs stay quick.
 */
async function main() {
  console.log("Seeding database...");

  const user = await prisma.user.upsert({
    where: { email: "test@test.com" },
    update: {},
    create: { email: "test@test.com" },
  });
  console.log("User:", user.id);

  await prisma.meal.deleteMany({ where: { userId: user.id } });
  await prisma.day.deleteMany({ where: { userId: user.id } });

  const days = buildDemoDataset().filter(
    (day) => day.offset >= -SEED_DAYS && day.offset <= 0,
  );

  for (const day of days) {
    const date = demoDateForOffset(day.offset);

    const created = await prisma.day.create({
      data: {
        userId: user.id,
        date,
        totalSteps: day.steps,
        ...demoDayTotals(day.meals),
      },
    });

    await prisma.meal.createMany({
      data: day.meals.map((meal, index) => ({
        userId: user.id,
        dayId: created.id,
        ...meal,
        createdAt: demoMealTimestamp(date, index),
      })),
    });
  }

  console.log(`Seeded ${days.length} days for ${user.email ?? user.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
