import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const inviteSchema = z.object({
  email: z.string().trim().email(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, context: RouteContext) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const { data: capsule, error: capsuleError } = await supabase
      .from("capsules")
      .select("id,owner_id")
      .eq("id", id)
      .single();

    if (capsuleError || !capsule) {
      return NextResponse.json({ error: "Capsule not found" }, { status: 404 });
    }

    const isOwner = capsule.owner_id === user.id;

    if (!isOwner) {
      const { data: collaboration } = await supabase
        .from("capsule_collaborators")
        .select("id")
        .eq("capsule_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!collaboration) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data: collaborators, error } = await supabase
      .from("capsule_collaborators")
      .select("id,user_id,invited_at")
      .eq("capsule_id", id)
      .order("invited_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch collaborators", details: error.message },
        { status: 500 },
      );
    }

    const userIds = (collaborators ?? []).map((row: { user_id: string }) => row.user_id);

    let profilesById = new Map<string, { email: string | null; username: string | null }>();

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,email,username")
        .in("id", userIds);

      profilesById = new Map(
        (profiles ?? []).map((profile: { id: string; email: string | null; username: string | null }) => [
          profile.id,
          { email: profile.email, username: profile.username },
        ]),
      );
    }

    return NextResponse.json({
      collaborators: (collaborators ?? []).map((row: { id: string; user_id: string; invited_at: string }) => ({
        id: row.id,
        userId: row.user_id,
        invitedAt: row.invited_at,
        email: profilesById.get(row.user_id)?.email ?? null,
        username: profilesById.get(row.user_id)?.username ?? null,
      })),
      isOwner,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal error",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const { data: capsule, error: capsuleError } = await supabase
      .from("capsules")
      .select("id,owner_id")
      .eq("id", id)
      .single();

    if (capsuleError || !capsule) {
      return NextResponse.json({ error: "Capsule not found" }, { status: 404 });
    }

    if (capsule.owner_id !== user.id) {
      return NextResponse.json({ error: "Only owner can invite collaborators" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,email")
      .ilike("email", parsed.data.email)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to resolve user profile", details: profileError.message },
        { status: 500 },
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          error: "User with that email not found",
          details: "Ask them to sign in once so their profile is created.",
        },
        { status: 404 },
      );
    }

    if (profile.id === user.id) {
      return NextResponse.json({ error: "Owner is already a collaborator" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("capsule_collaborators")
      .select("id")
      .eq("capsule_id", id)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, alreadyInvited: true });
    }

    const { error: insertError } = await supabase.from("capsule_collaborators").insert({
      capsule_id: id,
      user_id: profile.id,
    });

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to invite collaborator", details: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, invitedEmail: profile.email });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal error",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
}
