import { NextResponse } from "next/server";
import { resetDemoData } from "@/server/services/demoService";

export async function POST() {
  try {
    await resetDemoData();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[demo/reset]", error);
    return NextResponse.json({ error: "Failed to reset demo data" }, { status: 500 });
  }
}

