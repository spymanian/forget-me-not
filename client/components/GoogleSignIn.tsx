"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function GoogleSignIn() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [checked, setChecked] = useState(false); // have we finished initial session load?
  const router = useRouter();

  // track auth state
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setUser(data.session?.user ?? null);
        setChecked(true);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setChecked(true);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signOut = async () => {
    // navigate away immediately so the old page unmounts before the
    // auth state change can toggle the button
    router.replace('/');
    await supabase.auth.signOut();
  };

  // if we haven't checked the initial session yet, render nothing
  if (!checked) {
    return null;
  }

  // show logout when we have a user
  if (user) {
    return (
      <button onClick={signOut} className="google-signin-btn">
        <span>Log out</span>
        <style jsx>{`
          .google-signin-btn {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem 2rem;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(147, 197, 253, 0.2);
            border-radius: 2px;
            color: rgba(255, 255, 255, 0.75);
            font-family: var(--font-typewriter), 'Courier New', monospace;
            font-size: 1rem;
            letter-spacing: 0.1em;
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(8px);
          }
          .google-signin-btn:hover {
            background: rgba(147, 197, 253, 0.08);
            border-color: rgba(147, 197, 253, 0.5);
            color: rgba(255, 255, 255, 0.95);
            box-shadow:
              0 0 16px rgba(147, 197, 253, 0.2),
              0 0 32px rgba(59, 130, 246, 0.1),
              inset 0 0 12px rgba(147, 197, 253, 0.05);
          }
          .google-signin-btn:active {
            transform: scale(0.98);
          }
        `}</style>
      </button>
    );
  }

  return (
    <button onClick={signIn} className="google-signin-btn">
      <svg
        className="google-icon"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.0 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      <span>Sign in with Google</span>

      <style jsx>{`
        .google-signin-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(147, 197, 253, 0.2);
          border-radius: 2px;
          color: rgba(255, 255, 255, 0.75);
          font-family: var(--font-typewriter), 'Courier New', monospace;
          font-size: 1rem;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(8px);
        }
        .google-signin-btn:hover {
          background: rgba(147, 197, 253, 0.08);
          border-color: rgba(147, 197, 253, 0.5);
          color: rgba(255, 255, 255, 0.95);
          box-shadow:
            0 0 16px rgba(147, 197, 253, 0.2),
            0 0 32px rgba(59, 130, 246, 0.1),
            inset 0 0 12px rgba(147, 197, 253, 0.05);
        }
        .google-signin-btn:active {
          transform: scale(0.98);
        }
        .google-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }
      `}</style>
    </button>
  );
}
