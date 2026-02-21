import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileForUser } from "@/lib/profileSync";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    const user = data.session?.user;

    if (user?.email) {
      try {
        await ensureProfileForUser(supabase, user);
      } catch {
        // do not block auth callback redirect when profile sync fails
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
