import { NextResponse } from "next/server";

export const runtime = "nodejs";

const keys = [
  "DEEPSEEK_API_KEY",
  "DEEPSEEK_BASE_URL",
  "DEEPSEEK_MODEL",
  "MANTLE_RPC_URL",
  "MANTLE_EXPLORER_URL"
] as const;

export function GET() {
  return NextResponse.json(
    Object.fromEntries(
      keys.map((key) => [
        key,
        {
          status: process.env[key] ? "present" : "missing",
          length: process.env[key]?.length ?? 0
        }
      ])
    )
  );
}
