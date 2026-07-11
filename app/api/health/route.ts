import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "findit",
    timestamp: new Date().toISOString(),
  });
}
