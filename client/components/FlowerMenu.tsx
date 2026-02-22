"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import LogoFlower from "./LogoFlower";

export default function FlowerMenu() {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    router.replace("/");
  };

  return (
    <div className="flower-menu">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="User menu"
        className="flower-btn"
      >
        {/* flower icon matching title screen */}
        <LogoFlower width={120} height={80} />
      </button>
      {open && (
        <div className="menu">
          <button onClick={signOut} className="logout-btn">
            Log out
          </button>
        </div>
      )}
      <style jsx>{`
        .flower-menu {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 50;
        }
        .flower-btn {
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .flower-btn:hover {
          box-shadow:
            0 0 24px rgba(147, 197, 253, 0.3),
            0 0 48px rgba(59, 130, 246, 0.2),
            inset 0 0 16px rgba(147, 197, 253, 0.1);
        }
        .menu {
          position: absolute;
          top: calc(100% + 0.25rem);
          right: 0;
          background: #111;
          border: 1px solid #333;
          border-radius: 4px;
          min-width: 100px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.5);
        }
        .logout-btn {
          width: 100%;
          padding: 0.5rem 1rem;
          background: none;
          border: none;
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .logout-btn:hover {
          background: rgba(255,255,255,0.1);
          box-shadow:
            0 0 24px rgba(147, 197, 253, 0.3),
            0 0 48px rgba(59, 130, 246, 0.2),
            inset 0 0 16px rgba(147, 197, 253, 0.1);
        }
      `}</style>
    </div>
  );
}
