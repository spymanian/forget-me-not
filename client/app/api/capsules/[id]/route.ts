import { NextResponse } from "next/server";
import { z } from "zod";
import { packEncryptedCapsulePayload, unpackDecryptedCapsulePayload } from "@/lib/capsulePayload";
import { inferMoodColor } from "@/lib/mood";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { CapsulePayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const updateSchema = z.object({
  title: z.string().trim().max(120).optional(),
  note: z.string().optional(),
  unlockAt: z.string().trim().min(1).optional(),
});

type CapsuleFullRow = {
  id: string;
  owner_id: string;
  title: string;
  created_at: string;
  unlock_date: string;
  mood: string | null;
  mood_color: string | null;
  is_locked: boolean;
  note: string;
};

type CapsuleOwnerRow = {
  id: string;
  owner_id: string;
};

async function canAccessCapsule(supabase: ReturnType<typeof getSupabaseAdmin>, capsuleId: string, userId: string) {
  const { data: capsuleData, error } = await supabase
    .from("capsules")
    .select("id,owner_id,title,created_at,unlock_date,mood,mood_color,is_locked,note")
    .eq("id", capsuleId)
    .single();
  const capsule = capsuleData as CapsuleFullRow | null;

  if (error || !capsule) {
    return { found: false as const };
  }

  const isOwner = capsule.owner_id === userId;

  if (isOwner) {
    return { found: true as const, capsule, isOwner, canEdit: true };
  }

  const { data: collaboration } = await supabase
    .from("capsule_collaborators")
    .select("id")
    .eq("capsule_id", capsuleId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!collaboration) {
    return { found: true as const, capsule, isOwner: false, canEdit: false };
  }

  return { found: true as const, capsule, isOwner: false, canEdit: true };
}

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
  const supabase = getSupabaseAdmin();

    const access = await canAccessCapsule(supabase, id, user.id);

    if (!access.found) {
      return NextResponse.json({ error: "Capsule not found" }, { status: 404 });
    }

    if (!access.canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = access.capsule;

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
          accessRole: access.isOwner ? "owner" : "collaborator",
          canEdit: access.canEdit,
          error: "Capsule is locked",
        },
        { status: 423 },
      );
    }

    if (data.is_locked) {
      await supabase
        .from("capsules")
        .update({ is_locked: false } as unknown as never)
        .eq("id", data.id);
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
      accessRole: access.isOwner ? "owner" : "collaborator",
      canEdit: access.canEdit,
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

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const supabaseAuth = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (
      parsed.data.title === undefined &&
      parsed.data.note === undefined &&
      parsed.data.unlockAt === undefined
    ) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const access = await canAccessCapsule(supabase, id, user.id);

    if (!access.found) {
      return NextResponse.json({ error: "Capsule not found" }, { status: 404 });
    }

    if (!access.canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = access.capsule;
    const unpacked = unpackDecryptedCapsulePayload(existing.id, existing.note);

    const nextPayload: CapsulePayload = {
      note: parsed.data.note ?? unpacked.payload.note,
      files: unpacked.payload.files,
    };

    const updates: Record<string, unknown> = {
      note: packEncryptedCapsulePayload(existing.id, nextPayload),
    };

    if (parsed.data.title !== undefined) {
      updates.title = parsed.data.title || "Memory Capsule";
    }

    if (parsed.data.unlockAt !== undefined) {
      const raw = parsed.data.unlockAt;
      const hasTimezoneInfo = raw.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(raw);
      const normalized = hasTimezoneInfo ? raw : raw.length === 16 ? `${raw}:00` : raw;
      const unlockDate = new Date(normalized);

      if (Number.isNaN(unlockDate.getTime())) {
        return NextResponse.json({ error: "Invalid unlockAt" }, { status: 400 });
      }

      updates.unlock_date = unlockDate.toISOString();
      updates.is_locked = unlockDate.getTime() > Date.now();
    }

    if (parsed.data.note !== undefined) {
      const mood = await inferMoodColor(parsed.data.note || nextPayload.files.map((f) => f.name).join(" "));
      updates.mood = mood.mood;
      updates.mood_color = mood.color;
    }

    const { error: updateError } = await supabase
      .from("capsules")
      .update(updates as unknown as never)
      .eq("id", existing.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update capsule", details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to update capsule",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const supabaseAuth = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data: capsuleData, error: capsuleError } = await supabase
      .from("capsules")
      .select("id,owner_id")
      .eq("id", id)
      .single();
    const capsule = capsuleData as CapsuleOwnerRow | null;

    if (capsuleError || !capsule) {
      return NextResponse.json({ error: "Capsule not found" }, { status: 404 });
    }

    if (capsule.owner_id !== user.id) {
      return NextResponse.json({ error: "Only owner can delete this capsule" }, { status: 403 });
    }

    const { error: deleteCollaboratorsError } = await supabase
      .from("capsule_collaborators")
      .delete()
      .eq("capsule_id", id);

    if (deleteCollaboratorsError) {
      return NextResponse.json(
        { error: "Failed to delete capsule", details: deleteCollaboratorsError.message },
        { status: 500 },
      );
    }

    const { error: deleteCapsuleError } = await supabase.from("capsules").delete().eq("id", id);

    if (deleteCapsuleError) {
      return NextResponse.json(
        { error: "Failed to delete capsule", details: deleteCapsuleError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to delete capsule",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
}
