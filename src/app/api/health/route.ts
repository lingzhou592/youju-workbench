import { NextResponse } from "next/server";
import { healthSnapshot } from "@/lib/llm/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(healthSnapshot(), {
    headers: { "Cache-Control": "no-store" },
  });
}
