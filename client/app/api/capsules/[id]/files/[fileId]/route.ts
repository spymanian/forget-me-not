import { NextResponse } from "next/server";
import { unpackDecryptedCapsulePayload } from "@/lib/capsulePayload";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import type { CapsulePayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
    fileId: string;
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

    const { id, fileId } = await context.params;
    const supabase = supabaseAuth;

    const { data, error } = await supabase
      .from("capsules")
      .select("id,unlock_date,note")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Capsule not found" }, { status: 404 });
    }

    if (new Date(data.unlock_date).getTime() > Date.now()) {
      return NextResponse.json({ error: "Capsule is locked" }, { status: 423 });
    }

    const { payload } = unpackDecryptedCapsulePayload(data.id, data.note) as {
      payload: CapsulePayload;
    };

    const file = payload.files.find((candidate) => candidate.id === fileId);

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const bytes = Buffer.from(file.dataBase64, "base64");

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to read capsule file",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
}
