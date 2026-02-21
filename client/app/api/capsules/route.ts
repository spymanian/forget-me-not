import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAttachmentCountFromEncryptedBlob, packEncryptedCapsulePayload } from "@/lib/capsulePayload";
import { inferMoodColor } from "@/lib/mood";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import type { CapsuleFile, CapsulePayload } from "@/lib/types";

const metadataSchema = z.object({
  title: z.string().trim().max(120).default("Memory Capsule"),
  note: z.string().trim().default(""),
  unlockAt: z.string().trim().min(1),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function parseFiles(formData: FormData): Promise<CapsuleFile[]> {
  const uploads = formData.getAll("files").filter((value) => value instanceof File) as File[];

  const files = await Promise.all(
    uploads.map(async (file) => ({
      id: randomUUID(),
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      dataBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
    })),
  );

  return files;
}

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = supabaseAuth;
    const formData = await req.formData();
    const parsed = metadataSchema.safeParse({
      title: formData.get("title"),
      note: formData.get("note"),
      unlockAt: formData.get("unlockAt"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const files = await parseFiles(formData);

    if (!parsed.data.note && files.length === 0) {
      return NextResponse.json(
        { error: "Capsule must contain a note or at least one file" },
        { status: 400 },
      );
    }

    const unlockAtRaw = parsed.data.unlockAt;

    const hasTimezoneInfo =
      unlockAtRaw.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(unlockAtRaw);

    const normalizedUnlockAt = hasTimezoneInfo
      ? unlockAtRaw
      : unlockAtRaw.length === 16
        ? `${unlockAtRaw}:00`
        : unlockAtRaw;

    const unlockAt = new Date(normalizedUnlockAt);

    if (Number.isNaN(unlockAt.getTime())) {
      return NextResponse.json({ error: "Invalid unlockAt" }, { status: 400 });
    }

    const now = Date.now();
    if (unlockAt.getTime() <= now) {
      return NextResponse.json({ error: "unlockAt must be in the future" }, { status: 400 });
    }

    const capsuleId = randomUUID();
    const mood = await inferMoodColor(parsed.data.note || files.map((file) => file.name).join(" "));

    const payload: CapsulePayload = {
      note: parsed.data.note,
      files,
    };

    const encryptedNoteBlob = packEncryptedCapsulePayload(capsuleId, payload);

    const { error } = await supabase.from("capsules").insert({
      id: capsuleId,
      title: parsed.data.title || "Memory Capsule",
      note: encryptedNoteBlob,
      unlock_date: unlockAt.toISOString(),
      mood: mood.mood,
      mood_color: mood.color,
      is_locked: true,
      owner_id: user.id,
    });

    if (error) {
      return NextResponse.json(
        { error: "Failed to create capsule", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        id: capsuleId,
        title: parsed.data.title || "Memory Capsule",
        unlockAt: unlockAt.toISOString(),
        mood,
        fileCount: files.length,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const supabaseAuth = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = supabaseAuth;

    const capsuleSelect = "id,title,created_at,unlock_date,mood,mood_color,is_locked,owner_id,note";

    const { data: ownedCapsules, error: ownedError } = await supabase
      .from("capsules")
      .select(capsuleSelect)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (ownedError) {
      return NextResponse.json(
        { error: "Failed to fetch capsules", details: ownedError.message },
        { status: 500 },
      );
    }

    const { data: collaborations, error: collabError } = await supabase
      .from("capsule_collaborators")
      .select("capsule_id")
      .eq("user_id", user.id);

    if (collabError) {
      return NextResponse.json(
        { error: "Failed to fetch capsules", details: collabError.message },
        { status: 500 },
      );
    }

    const collaboratorCapsuleIds = (collaborations ?? []).map((row: { capsule_id: string }) => row.capsule_id);

    let sharedCapsules: Array<{
      id: string;
      title: string;
      created_at: string;
      unlock_date: string;
      mood: string | null;
      mood_color: string | null;
      is_locked: boolean | null;
      owner_id: string;
      note: string | null;
    }> = [];

    if (collaboratorCapsuleIds.length > 0) {
      const { data: sharedData, error: sharedError } = await supabase
        .from("capsules")
        .select(capsuleSelect)
        .in("id", collaboratorCapsuleIds)
        .order("created_at", { ascending: false });

      if (sharedError) {
        return NextResponse.json(
          { error: "Failed to fetch capsules", details: sharedError.message },
          { status: 500 },
        );
      }

      sharedCapsules = (sharedData ?? []) as typeof sharedCapsules;
    }

    const data = [...(ownedCapsules ?? []), ...sharedCapsules];

    const now = Date.now();

    const capsules = (data ?? []).map((capsule: {
      id: string;
      title: string;
      created_at: string;
      unlock_date: string;
      mood: string | null;
      mood_color: string | null;
      is_locked: boolean | null;
      owner_id: string;
      note: string | null;
    }) => {
      return {
      id: capsule.id,
      title: capsule.title,
      createdAt: capsule.created_at,
      unlockAt: capsule.unlock_date,
      mood: capsule.mood ?? "reflective",
      moodColor: capsule.mood_color ?? "#A78BFA",
      unlocked: new Date(capsule.unlock_date).getTime() <= now,
      accessRole: capsule.owner_id === user.id ? "owner" : "collaborator",
      canEdit: true,
      attachmentCount: getAttachmentCountFromEncryptedBlob(capsule.note),
      };
    });

    const uniqueCapsules = Array.from(new Map(capsules.map((capsule) => [capsule.id, capsule])).values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100);

    return NextResponse.json({ capsules: uniqueCapsules });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 },
    );
  }
}
