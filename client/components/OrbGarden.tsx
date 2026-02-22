// components/OrbGarden.tsx
"use client";

import React, { useMemo } from "react";

type CapsuleSummary = {
  id: string;
  title: string;
  createdAt: string;
  unlockAt: string;
  mood: string;
  moodColor: string; // "#06b6d4" or "rgb(6,182,212)" accepted
  unlocked: boolean;
};

function hexToRgb(hex: string) {
  const h = (hex || "#06b6d4").replace(/^#/, "");
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  if (h.length === 6) {
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  // fallback cyan
  return [6, 182, 212];
}

function ensureRgbString(color: string) {
  if (!color) return "6, 182, 212";
  if (/^rgb/.test(color)) {
    const inside = color.match(/\((.*)\)/)?.[1] ?? "6,182,212";
    const parts = inside.split(",").map((p) => p.trim());
    return `${parts[0]}, ${parts[1]}, ${parts[2]}`;
  }
  const [r, g, b] = hexToRgb(color);
  return `${r}, ${g}, ${b}`;
}

export default function OrbGarden({
  capsules,
  onSelect,
  width = 800,
  height = 420,
}: {
  capsules: CapsuleSummary[];
  onSelect: (id: string) => void;
  width?: number;
  height?: number;
}) {
  // deterministic hash -> number (FNV-ish)
  function hashToNum(s: string) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }

  const positions = useMemo(() => {
    return capsules.map((c) => {
      const n = hashToNum(c.id);
      const fx = ((n >>> 0) % 10000) / 10000;
      const fy = (((n >>> 16) % 10000) / 10000);
      const left = 6 + fx * 88; // percent
      const top = 6 + fy * 88;
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

            const rgb = ensureRgbString(capsule.moodColor || "#06b6d4");
            const glowStrong = `rgba(${rgb}, 0.92)`; // inner rim
            const glowMid = `rgba(${rgb}, 0.45)`; // mid glow
            const glowSoft = `rgba(${rgb}, 0.20)`; // outer soft glow
            const dim = capsule.unlocked ? 1 : 0.56;

            const inlineStyle: React.CSSProperties = {
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              transform: `translate(-50%, -50%) scale(${pos.scale})`,
              ["--phase" as any]: pos.phase,
              ["--orb-glow-strong" as any]: glowStrong,
              ["--orb-glow-mid" as any]: glowMid,
              ["--orb-glow-soft" as any]: glowSoft,
              ["--orb-rgb" as any]: rgb,
              ["--orb-dim" as any]: String(dim),
            };

            return (
              <button
                key={capsule.id}
                className={`orb ${capsule.unlocked ? "orb-unlocked" : "orb-locked"}`}
                title={capsule.title}
                onClick={() => onSelect(capsule.id)}
                style={inlineStyle}
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
        }

        .orb {
          --glow-strong: var(--orb-glow-strong, rgba(6,182,212,0.92));
          --glow-mid: var(--orb-glow-mid, rgba(6,182,212,0.45));
          --glow-soft: var(--orb-glow-soft, rgba(6,182,212,0.18));
          --rgb: var(--orb-rgb, 6, 182, 212);
          --dim: var(--orb-dim, 1);

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
          transform-origin: center center;
          user-select: none;
          outline: none;
          background: radial-gradient(circle at 40% 35%,
            rgba(0,0,0,0.45) 0%,
            rgba(0,0,0,0.72) 40%,
            rgba(0,0,0,0.94) 75%
          );
          box-shadow:
            inset 0 0 0 4px var(--glow-strong),
            0 8px 20px rgba(2, 6, 23, 0.6);
          overflow: visible;
          -webkit-tap-highlight-color: transparent;
          opacity: calc(var(--dim));
          transition: transform 220ms cubic-bezier(.2,.9,.2,1), box-shadow 220ms, opacity 220ms;
        }

        .orb::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 140%;
          height: 140%;
          transform: translate(-50%, -50%);
          border-radius: 9999px;
          z-index: -1;
          box-shadow:
            0 0 8px var(--glow-strong),
            0 0 28px var(--glow-mid),
            0 0 60px var(--glow-soft),
            0 18px 60px rgba(2,6,23,0.55);
          filter: blur(6px);
          pointer-events: none;
          transition: box-shadow 220ms ease, transform 220ms ease, opacity 220ms;
        }

        .orb::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 110%;
          height: 110%;
          transform: translate(-50%, -50%);
          border-radius: 9999px;
          z-index: 0;
          pointer-events: none;
          background: radial-gradient(circle,
            rgba(var(--rgb), 0.12) 0%,
            rgba(var(--rgb), 0.04) 30%,
            transparent 50%
          );
          mix-blend-mode: screen;
        }

        .orb {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
          0% {
            transform: translate(-50%, -50%) translateY(0) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) translateY(-10px) scale(1.02);
          }
          100% {
            transform: translate(-50%, -50%) translateY(0) scale(1);
          }
        }

        .orb:hover {
          transform: translate(-50%, -50%) scale(1.08);
          box-shadow:
            inset 0 0 0 4px var(--glow-strong),
            0 20px 40px rgba(2, 6, 23, 0.7);
        }

        .orb:active {
          transform: translate(-50%, -50%) scale(0.98);
        }

        .orb-mood {
          font-weight: 700;
          font-size: 13px;
          line-height: 1;
          z-index: 1;
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
          z-index: 1;
        }
        .orb-lock {
          margin-top: 6px;
          font-size: 11px;
          opacity: 0.9;
          z-index: 1;
        }

        .orb-locked {
          filter: grayscale(0.06) contrast(0.98);
        }
        .orb-unlocked {
          box-shadow:
            inset 0 0 0 4px rgba(255,255,255,0.02),
            0 12px 36px rgba(255,255,255,0.02);
        }

        @media (max-width: 640px) {
          .orb {
            width: 76px;
            height: 76px;
          }
          .orb::before {
            width: 170%;
            height: 170%;
            filter: blur(5px);
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
