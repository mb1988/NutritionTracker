/**
 * One-time script: reassigns all data from the old hardcoded dev user
 * to the real GitHub-authenticated user.
 *
 * Run once:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/migrate-user-data.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OLD_USER_ID = "cmn7km9hs0000cad8s6kslzcp";

async function main() {
  // 1. Find the GitHub user (newest user, not the old hardcoded one)
  const newUser = await prisma.user.findFirst({
    where:   { id: { not: OLD_USER_ID } },
    orderBy: { createdAt: "desc" },
  });

  if (!newUser) {
    console.error("❌ No GitHub user found. Make sure you have logged in once first.");
    process.exit(1);
  }

  console.log(`\n✅ Found GitHub user:`);
  console.log(`   ID:    ${newUser.id}`);
  console.log(`   Email: ${newUser.email}`);
  console.log(`   Name:  ${newUser.name}`);
  console.log(`\n📦 Migrating data from ${OLD_USER_ID} → ${newUser.id}...\n`);

  // 2. Count what we're about to migrate
  const [days, meals, savedMeals] = await Promise.all([
    prisma.day.count({ where: { userId: OLD_USER_ID } }),
    prisma.meal.count({ where: { userId: OLD_USER_ID } }),
    prisma.savedMeal.count({ where: { userId: OLD_USER_ID } }),
  ]);

  console.log(`   Days:        ${days}`);
  console.log(`   Meals:       ${meals}`);
  console.log(`   SavedMeals:  ${savedMeals}`);

  if (days + meals + savedMeals === 0) {
    console.log("\n⚠️  Nothing to migrate — old user has no data.");
    return;
  }

  // 3. Reassign everything in a transaction
  await prisma.$transaction([
    prisma.meal.updateMany({
      where: { userId: OLD_USER_ID },
      data:  { userId: newUser.id },
    }),
    prisma.day.updateMany({
      where: { userId: OLD_USER_ID },
      data:  { userId: newUser.id },
    }),
    prisma.savedMeal.updateMany({
      where: { userId: OLD_USER_ID },
      data:  { userId: newUser.id },
    }),
  ]);

  console.log("\n✅ Migration complete! All data now belongs to your GitHub account.");
  console.log("   Refresh the app — your data will appear.\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

