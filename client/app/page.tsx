"use client";

import { useEffect, useState, useCallback } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import GoogleSignIn from "@/components/GoogleSignIn";


export default function Home() {
  const [engineReady, setEngineReady] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setEngineReady(true));

    const t1 = setTimeout(() => setTitleVisible(true), 300);
    const t2 = setTimeout(() => setSubtitleVisible(true), 900);
    const t3 = setTimeout(() => setActionsVisible(true), 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const particlesLoaded = useCallback(async () => {}, []);

  return (
    <div className="welcome-root">
      {engineReady && (
        <Particles
          id="tsparticles"
          particlesLoaded={particlesLoaded}
          options={{
            fullScreen: false,
            background: { color: { value: "transparent" } },
            fpsLimit: 60,
            interactivity: {
              events: {
                onHover: { enable: true, mode: "repulse" },
                resize: { enable: true },
              },
              modes: { repulse: { distance: 100, duration: 0.4 } },
            },
            particles: {
              color: { value: ["#ffffff", "#93c5fd", "#c4b5fd", "#bfdbfe"] },
              links: {
                enable: true,
                color: "#6366f1",
                distance: 130,
                opacity: 0.07,
                width: 0.8,
              },
              move: {
                enable: true,
                speed: { min: 0.3, max: 1.2 },
                random: true,
                direction: "none",
                outModes: { default: "out" },
              },
              number: { value: 160, density: { enable: true } },
              opacity: {
                value: { min: 0.05, max: 0.6 },
                animation: { enable: true, speed: 0.5, sync: false },
              },
              size: {
                value: { min: 0.5, max: 3.5 },
                animation: { enable: true, speed: 1.5, sync: false },
              },
              shape: { type: "circle" },
            },
            detectRetina: true,
          }}
          style={{ position: "absolute", inset: 0, zIndex: 0 }}
        />
      )}

      <div className="mist-1" />
      <div className="mist-2" />

      <main className="welcome-content">
        <div className={`logo-cluster ${titleVisible ? "fade-in" : "pre-anim"}`}>
          <svg width="140" height="90" viewBox="0 0 140 90" fill="none" xmlns="http://www.w3.org/2000/svg">
            {[0, 60, 120, 180, 240, 300].map((a, i) => {
              const x = (70 + 10 * Math.cos((a * Math.PI) / 180)).toFixed(6);
              const y = (40 + 10 * Math.sin((a * Math.PI) / 180)).toFixed(6);

              return (
                <ellipse
                  key={i}
                  cx={x}
                  cy={y}
                  rx="5.5"
                  ry="8"
                  transform={`rotate(${a} ${x} ${y})`}
                  fill="#93c5fd"
                  opacity="0.9"
                />
              );
            })}
            <circle cx="70" cy="40" r="5.5" fill="#bfdbfe" />
            <circle cx="70" cy="40" r="2.5" fill="#fef9c3" />
            {[0, 60, 120, 180, 240, 300].map((a, i) => {
              const x = (30 + 7 * Math.cos((a * Math.PI) / 180)).toFixed(6);
              const y = (54 + 7 * Math.sin((a * Math.PI) / 180)).toFixed(6);

              return (
                <ellipse
                  key={`l${i}`}
                  cx={x}
                  cy={y}
                  rx="4"
                  ry="6"
                  transform={`rotate(${a} ${x} ${y})`}
                  fill="#a78bfa"
                  opacity="0.75"
                />
              );
            })}
            <circle cx="30" cy="54" r="4" fill="#c4b5fd" />
            <circle cx="30" cy="54" r="2" fill="#fef9c3" />
            {[0, 60, 120, 180, 240, 300].map((a, i) => {
              const x = (110 + 7 * Math.cos((a * Math.PI) / 180)).toFixed(6);
              const y = (56 + 7 * Math.sin((a * Math.PI) / 180)).toFixed(6);

              return (
                <ellipse
                  key={`r${i}`}
                  cx={x}
                  cy={y}
                  rx="4"
                  ry="6"
                  transform={`rotate(${a} ${x} ${y})`}
                  fill="#60a5fa"
                  opacity="0.75"
                />
              );
            })}
            <circle cx="110" cy="56" r="4" fill="#93c5fd" />
            <circle cx="110" cy="56" r="2" fill="#fef9c3" />
            <path d="M70 50 Q68 66 65 76" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            <path d="M30 61 Q28 71 26 78" stroke="#4ade80" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
            <path d="M110 63 Q112 72 114 79" stroke="#4ade80" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
          </svg>
        </div>

        <div className={`title-wrap ${titleVisible ? "fade-in" : "pre-anim"}`}>
          <h1 className="aurora-title">
            Forget Me Not
            <span className="aurora" aria-hidden="true">
              <span className="aurora__item" />
              <span className="aurora__item" />
              <span className="aurora__item" />
              <span className="aurora__item" />
            </span>
          </h1>
        </div>

        <div className={`subtitle-wrap ${subtitleVisible ? "fade-in" : "pre-anim"}`}>
          <p className="typewriter-text">Plant a memory. Watch it bloom.</p>
        </div>

        <div className={`welcome-actions ${actionsVisible ? "fade-in" : "pre-anim"}`}>
          <p className="welcome-prompt">start your garden</p>
              {/* if the user is already signed in we redirect to dashboard, otherwise show button */}
          <div className="sign-in-wrapper">
            <GoogleSignIn />
          </div>
        </div>
      </main>


      <style jsx>{`
        .welcome-root {
          position: relative;
          width: 100vw;
          min-height: 100vh;
          background: #000;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mist-1 {
          position: absolute;
          width: 800px;
          height: 800px;
          border-radius: 30%;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 1;
          animation: pulse 9s ease-in-out infinite;
        }
        .mist-2 {
          position: absolute;
          width: 600px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(147, 197, 253, 0.05) 0%, transparent 70%);
          bottom: 10%;
          right: 5%;
          pointer-events: none;
          z-index: 1;
          animation: drift 14s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }
        @keyframes drift {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-24px);
          }
        }

        .welcome-content {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2rem;
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        .logo-cluster {
          margin-bottom: 1.2rem;
          filter: drop-shadow(0 0 18px rgba(147, 197, 253, 0.6));
        }

        .title-wrap {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .aurora-title {
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(2.8rem, 7vw, 6rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          position: relative;
          overflow: hidden;
          background: #000;
          margin: 0 0 0.6rem 0;
          color: #fff;
          display: inline-block;
          padding: 0 0.15em;
        }

        .aurora {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 2;
          mix-blend-mode: darken;
          pointer-events: none;
        }
        .aurora__item {
          overflow: hidden;
          position: absolute;
          width: 60vw;
          height: 60vw;
          border-radius: 37% 29% 27% 27% / 28% 25% 41% 37%;
          filter: blur(1rem);
          mix-blend-mode: overlay;
        }
        .aurora__item:nth-of-type(1) {
          background: #89cff0;
          top: -50%;
          animation:
            aurora-border 6s ease-in-out infinite,
            aurora-1 12s ease-in-out infinite alternate;
        }
        .aurora__item:nth-of-type(2) {
          background: #f4c2c2;
          right: 0;
          top: 0;
          animation:
            aurora-border 6s ease-in-out infinite,
            aurora-2 12s ease-in-out infinite alternate;
        }
        .aurora__item:nth-of-type(3) {
          background: #818cf8;
          left: 0;
          bottom: 0;
          animation:
            aurora-border 6s ease-in-out infinite,
            aurora-3 8s ease-in-out infinite alternate;
        }
        .aurora__item:nth-of-type(4) {
          background: #a78bfa;
          right: 0;
          bottom: -50%;
          animation:
            aurora-border 6s ease-in-out infinite,
            aurora-4 24s ease-in-out infinite alternate;
        }
        @keyframes aurora-1 {
          0% {
            top: 0;
            right: 0;
          }
          50% {
            top: 100%;
            right: 75%;
          }
          75% {
            top: 100%;
            right: 25%;
          }
          100% {
            top: 0;
            right: 0;
          }
        }
        @keyframes aurora-2 {
          0% {
            top: -50%;
            left: 0;
          }
          60% {
            top: 100%;
            left: 75%;
          }
          85% {
            top: 100%;
            left: 25%;
          }
          100% {
            top: -50%;
            left: 0;
          }
        }
        @keyframes aurora-3 {
          0% {
            bottom: 0;
            left: 0;
          }
          40% {
            bottom: 100%;
            left: 75%;
          }
          65% {
            bottom: 40%;
            left: 50%;
          }
          100% {
            bottom: 0;
            left: 0;
          }
        }
        @keyframes aurora-4 {
          0% {
            bottom: -50%;
            right: 0;
          }
          50% {
            bottom: 0;
            right: 40%;
          }
          90% {
            bottom: 50%;
            right: 25%;
          }
          100% {
            bottom: -50%;
            right: 0;
          }
        }
        @keyframes aurora-border {
          0% {
            border-radius: 37% 29% 27% 27% / 28% 25% 41% 37%;
          }
          25% {
            border-radius: 47% 29% 39% 49% / 61% 19% 66% 26%;
          }
          50% {
            border-radius: 57% 23% 47% 72% / 63% 17% 66% 33%;
          }
          75% {
            border-radius: 28% 49% 29% 100% / 93% 20% 64% 25%;
          }
          100% {
            border-radius: 37% 29% 27% 27% / 28% 25% 41% 37%;
          }
        }

        .subtitle-wrap {
          margin-bottom: 2.8rem;
        }

        .typewriter-text {
          font-family: var(--font-typewriter), "Courier New", monospace;
          font-size: clamp(0.85rem, 1.6vw, 1rem);
          color: rgba(196, 181, 253, 0.8);
          letter-spacing: 0.05em;
          white-space: nowrap;
          overflow: hidden;
          border-right: 2px solid rgba(196, 181, 253, 0.7);
          width: 0;
          margin: 0 auto;
          animation: typing 1.8s steps(31, end) 0.2s forwards, blink 0.75s step-end infinite;
        }
        @keyframes typing {
          from { width: 0; }
          to { width: 35ch; }
        }
        @keyframes blink {
          0%, 100% { border-color: rgba(196, 181, 253, 0.7); }
          50% { border-color: transparent; }
        }

        .welcome-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.2rem;
        }
        .welcome-prompt {
          font-family: var(--font-typewriter), "Courier New", monospace;
          font-size: clamp(0.8rem, 1.5vw, 0.95rem);
          color: rgba(255, 255, 255, 0.3);
          letter-spacing: 0.3em;
          margin: 0;
          transition:
            color 0.3s,
            text-shadow 0.3s;
        }
        .welcome-prompt:hover {
          color: rgba(255, 255, 255, 0.8);
          text-shadow: 0 0 20px rgba(147, 197, 253, 0.5);
        }
        .sign-in-wrapper {
          filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.2));
          transition: filter 0.3s;
        }
        .sign-in-wrapper:hover {
          filter: drop-shadow(0 0 22px rgba(147, 197, 253, 0.45));
        }

        .pre-anim {
          opacity: 0;
          transform: none;
        }
        .fade-in {
          animation: fadeIn 0.9s ease forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
