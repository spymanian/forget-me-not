import { NextResponse } from "next/server";
import { z } from "zod";
import { inferMoodColorWithSource } from "@/lib/mood";

const payloadSchema = z.object({
  text: z.string().trim().min(1),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = payloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const mood = await inferMoodColorWithSource(parsed.data.text);
    return NextResponse.json(mood);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 },
    );
  }
}
