"use client";

import { useEffect, useState } from "react";

export default function TypewriterText({
  text,
  speed = 100,
  pauseAfter = 800,
  start = true,
}: {
  text: string;
  speed?: number;
  pauseAfter?: number;
  start?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [showCaret, setShowCaret] = useState(true);

  useEffect(() => {
    if (!text || !start) return;

    if (index >= text.length) {
      if (pauseAfter > 0) {
        const t = setTimeout(() => setShowCaret(false), pauseAfter);
        return () => clearTimeout(t);
      }
      return;
    }

    const id = window.setTimeout(() => setIndex((i) => i + 1), speed);
    return () => window.clearTimeout(id);
  }, [index, text, speed, pauseAfter, start]);

  return (
    <>
      <div className="typewriter-wrapper">
        <span className="typewriter-text">{text.slice(0, index)}</span>
        {showCaret && <span className="typewriter-caret" />}
      </div>

      <style jsx>{`
        .typewriter-wrapper {
          position: fixed;
          left: 20px;
          bottom: 20px;
          z-index: 100;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.6);
        }

        .typewriter-text {
          font-family: var(--font-typewriter), ui-monospace, monospace;
          font-size: 1.15rem;
          color: white;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .typewriter-caret {
          width: 2px;
          height: 1.2em;
          background: var(--accent, #68d1ff);
          display: inline-block;
          margin-left: 2px;
          animation: blink 1s steps(2, start) infinite;
        }

        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          50.01%,
          100% {
            opacity: 0;
          }
        }

        @media (max-width: 520px) {
          .typewriter-text {
            font-size: 1rem;
          }
          .typewriter-wrapper {
            left: 12px;
            bottom: 12px;
            padding: 6px 10px;
          }
        }
      `}</style>
    </>
  );
}