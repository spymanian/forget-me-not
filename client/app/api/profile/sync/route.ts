import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProfileForUser } from "@/lib/profileSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await ensureProfileForUser(supabase, user);
    return NextResponse.json({ ok: true, ...profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown";
    const isPolicyError = message.toLowerCase().includes("rls policy") || message.toLowerCase().includes("permission");

    return NextResponse.json(
      {
        error: isPolicyError ? "Failed to sync profile" : "Internal error",
        details: message,
      },
      { status: isPolicyError ? 403 : 500 },
    );
  }
}
