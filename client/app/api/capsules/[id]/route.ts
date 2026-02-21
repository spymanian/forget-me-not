import { NextResponse } from "next/server";
import { unpackDecryptedCapsulePayload } from "@/lib/capsulePayload";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import type { CapsulePayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const supabaseAuth = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = supabaseAuth;

    const { data, error } = await supabase
      .from("capsules")
      .select("id,title,created_at,unlock_date,mood,mood_color,is_locked,note")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Capsule not found" }, { status: 404 });
    }

    const isUnlocked = new Date(data.unlock_date).getTime() <= Date.now();

    if (!isUnlocked) {
      return NextResponse.json(
        {
          id: data.id,
          title: data.title,
          createdAt: data.created_at,
          unlockAt: data.unlock_date,
          mood: data.mood ?? "reflective",
          moodColor: data.mood_color ?? "#A78BFA",
          unlocked: false,
          error: "Capsule is locked",
        },
        { status: 423 },
      );
    }

    if (data.is_locked) {
      await supabase.from("capsules").update({ is_locked: false }).eq("id", data.id);
    }

    const { payload } = unpackDecryptedCapsulePayload(data.id, data.note) as {
      payload: CapsulePayload;
    };

    return NextResponse.json({
      id: data.id,
      title: data.title,
      createdAt: data.created_at,
      unlockAt: data.unlock_date,
      mood: data.mood ?? "reflective",
      moodColor: data.mood_color ?? "#A78BFA",
      unlocked: true,
      note: payload.note,
      files: payload.files.map((file) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to read capsule",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
}
