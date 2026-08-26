import { NextResponse } from "next/server";
import { getConfigStatus } from "@/lib/config";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "findit",
    timestamp: new Date().toISOString(),
    config: getConfigStatus(),
  });
}
