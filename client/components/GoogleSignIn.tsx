"use client";

import { createClient } from "@/lib/supabase/client";

export default function GoogleSignIn() {
  const supabase = createClient();

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return <button onClick={signIn}>Sign in with Google</button>;
}
