import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { buildMealsCsv, escapeCsvField, type ExportRow } from "@/server/services/exportService";

function row(overrides: Partial<ExportRow> = {}): ExportRow {
  return {
    date: "2026-10-01", name: "Porridge", category: "Breakfast",
    calories: 340, protein: 10, carbs: 52, fat: 8, satFat: 1.5, fibre: 6,
    addedSugar: 0, naturalSugar: 9, salt: 0.1, alcohol: 0, omega3: 0,
    ...overrides,
  };
}

describe("exportService", () => {
  it("writes a header row and one line per meal", () => {
    const csv = buildMealsCsv([row(), row({ date: "2026-10-02", name: "Toast" })]);
    const lines = csv.trimEnd().split("\r\n");

    expect(lines[0]).toBe("date,name,category,calories,protein,carbs,fat,satFat,fibre,addedSugar,naturalSugar,salt,alcohol,omega3");
    expect(lines[1]).toBe("2026-10-01,Porridge,Breakfast,340,10,52,8,1.5,6,0,9,0.1,0,0");
    expect(lines).toHaveLength(3);
  });

  it("quotes names with commas, quotes and newlines", () => {
    expect(escapeCsvField('Fish, chips & "mushy" peas')).toBe('"Fish, chips & ""mushy"" peas"');
    expect(escapeCsvField("line\nbreak")).toBe('"line\nbreak"');
  });

  it("leaves empty categories blank", () => {
    expect(escapeCsvField(null)).toBe("");
  });

  it("neutralises spreadsheet formulas in text fields", () => {
    expect(escapeCsvField("=HYPERLINK(\"x\")")).toBe('"\'=HYPERLINK(""x"")"');
    expect(escapeCsvField("@cmd")).toBe("'@cmd");
  });

  it("does not alter negative numbers", () => {
    expect(escapeCsvField(-1)).toBe("-1");
  });
});
