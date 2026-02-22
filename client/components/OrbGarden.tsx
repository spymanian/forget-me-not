// components/OrbGarden.tsx
"use client";

import React, { useMemo } from "react";

type CapsuleSummary = {
  id: string;
  title: string;
  createdAt: string;
  unlockAt: string;
  mood: string;
  moodColor: string;
  unlocked: boolean;
};

export default function OrbGarden({
  capsules,
  onSelect,
  width = 800,
  height = 420,
}: {
  capsules: CapsuleSummary[];
  onSelect: (id: string) => void;
  // optional layout size — the container will be responsive but these are the design defaults
  width?: number;
  height?: number;
}) {
  // create stable pseudo-random positions per capsule based on id
  const positions = useMemo(() => {
    // deterministic hash -> number
    function hashToNum(s: string) {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }
      return h;
    }

    return capsules.map((c) => {
      const n = hashToNum(c.id);
      // fraction values 0..1
      const fx = ((n >>> 0) % 10000) / 10000;
      const fy = (((n >>> 16) % 10000) / 10000);
      // keep some margin so orbs don't touch edges
      const left = 6 + fx * 88; // perc (6%..94%)
      const top = 6 + fy * 88;
      // subtle animation phase and scale
      const phase = (n % 360) / 360;
      const scale = 0.9 + ((n % 100) / 500); // 0.9 - 1.1
      return { id: c.id, left, top, phase, scale };
    });
  }, [capsules]);

  return (
    <>
      <div
        className="orbgarden-wrap"
        role="region"
        aria-label="Memory garden"
        style={{ width: "100%", maxWidth: width, height }}
      >
        <div className="orbgarden-inner">
          {capsules.map((capsule, idx) => {
            const pos = positions[idx];
            return (
              <button
                key={capsule.id}
                className={`orb ${capsule.unlocked ? "orb-unlocked" : "orb-locked"}`}
                title={capsule.title}
                onClick={() => onSelect(capsule.id)}
                style={
                  {
                    // positions in percent
                    left: `${pos.left}%`,
                    top: `${pos.top}%`,
                    background: capsule.moodColor,
                    transform: `translate(-50%, -50%) scale(${pos.scale})`,
                    // CSS variable for animation phase
                    ["--phase" as any]: pos.phase,
                  } as React.CSSProperties
                }
                aria-pressed={false}
              >
                <span className="orb-mood">{capsule.mood}</span>
                <span className="orb-title">{capsule.title.slice(0, 18)}</span>
                <span className="orb-lock">{capsule.unlocked ? "Unlocked" : "Locked"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .orbgarden-wrap {
          margin: 8px 0 28px;
          width: 100%;
          display: block;
          position: relative;
          overflow: visible;
        }

        .orbgarden-inner {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 240px;
          /* preserve space — or you can make height dynamic */
        }

        .orb {
          position: absolute;
          width: 96px;
          height: 96px;
          border-radius: 9999px;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 8px;
          color: white;
          text-align: center;
          font-size: 12px;
          border: none;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(2, 6, 23, 0.6);
          transition: transform 220ms cubic-bezier(.2,.9,.2,1), box-shadow 220ms;
          transform-origin: center center;
          user-select: none;
          outline: none;
        }

        /* subtle floating animation using the phase variable */
        .orb {
          animation: float 6s ease-in-out infinite;
          animation-delay: calc(var(--phase) * -2s);
        }

        @keyframes float {
          0% {
            transform: translate(-50%, -50%) translateY(0) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) translateY(-8px) scale(1.02);
          }
          100% {
            transform: translate(-50%, -50%) translateY(0) scale(1);
          }
        }

        .orb:hover {
          transform: translate(-50%, -50%) scale(1.08);
          box-shadow: 0 18px 40px rgba(2, 6, 23, 0.7);
        }

        .orb:active {
          transform: translate(-50%, -50%) scale(0.98);
        }

        .orb-mood {
          font-weight: 700;
          font-size: 13px;
          line-height: 1;
        }
        .orb-title {
          margin-top: 6px;
          font-size: 11px;
          opacity: 0.95;
          display: block;
          max-width: 70%;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        .orb-lock {
          margin-top: 6px;
          font-size: 11px;
          opacity: 0.9;
        }

        .orb-locked {
          filter: grayscale(0.04) contrast(0.98);
        }
        .orb-unlocked {
          box-shadow: 0 12px 36px rgba(34, 197, 94, 0.16), 0 6px 16px rgba(34, 197, 94, 0.06);
          /* optionally add a glowing ring */
        }

        @media (max-width: 640px) {
          .orb {
            width: 76px;
            height: 76px;
          }
          .orb-title {
            max-width: 58%;
            font-size: 10px;
          }
        }
      `}</style>
    </>
  );
}