import { prisma } from "@/lib/prisma";

export const EXPORT_COLUMNS = [
  "date", "name", "category", "calories", "protein", "carbs", "fat", "satFat",
  "fibre", "addedSugar", "naturalSugar", "salt", "alcohol", "omega3",
] as const;

export type ExportRow = Record<(typeof EXPORT_COLUMNS)[number], string | number | null>;

/** Quotes a CSV field when it contains a delimiter, quote or newline. */
export function escapeCsvField(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  // A leading =, +, - or @ makes spreadsheets evaluate the cell as a formula.
  const safe = /^[=+\-@]/.test(text) && typeof value === "string" ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function buildMealsCsv(rows: ExportRow[]): string {
  const lines = [EXPORT_COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(EXPORT_COLUMNS.map((column) => escapeCsvField(row[column])).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

/** Every meal the user has logged, oldest day first. */
export async function exportMealsCsv(userId: string): Promise<string> {
  const meals = await prisma.meal.findMany({
    where: { userId },
    orderBy: [{ day: { date: "asc" } }, { createdAt: "asc" }],
    include: { day: { select: { date: true } } },
  });

  return buildMealsCsv(meals.map((meal) => ({
    date:         meal.day.date,
    name:         meal.name,
    category:     meal.category,
    calories:     meal.calories,
    protein:      meal.protein,
    carbs:        meal.carbs,
    fat:          meal.fat,
    satFat:       meal.satFat,
    fibre:        meal.fibre,
    addedSugar:   meal.addedSugar,
    naturalSugar: meal.naturalSugar,
    salt:         meal.salt,
    alcohol:      meal.alcohol,
    omega3:       meal.omega3,
  })));
}
