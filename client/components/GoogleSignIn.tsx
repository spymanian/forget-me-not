"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function GoogleSignIn() {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [profileSynced, setProfileSynced] = useState(false);

  const syncProfile = useCallback(async () => {
    if (profileSynced) {
      return;
    }

    const response = await fetch("/api/profile/sync", {
      method: "POST",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      console.error("Profile sync failed", body ?? { status: response.status });
      return;
    }

    setProfileSynced(true);
  }, [profileSynced]);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (mounted) {
        setEmail(user?.email ?? null);
      }

      if (user?.email) {
        void syncProfile();
      }
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);

      if (session?.user?.email) {
        void syncProfile();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth, syncProfile]);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (email) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-700 dark:text-zinc-200">Logged in as {email}</span>
        <button
          type="button"
          onClick={signOut}
          className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-600"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={signIn} className="rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-200 dark:text-black">
      Sign in with Google
    </button>
  );
}
