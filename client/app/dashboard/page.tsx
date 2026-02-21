// app/garden/page.tsx
"use client";

import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import TypewriterText from "@/components/TypewriterText";

type GardenView = "intro" | "create" | "garden";

type CapsuleSummary = {
  id: string;
  title: string;
  createdAt: string;
  unlockAt: string;
  mood: string;
  moodColor: string;
  unlocked: boolean;
};

type CapsuleDetail = {
  id: string;
  title: string;
  createdAt: string;
  unlockAt: string;
  mood: string;
  moodColor: string;
  unlocked: boolean;
  note?: string;
  files?: Array<{
    id: string;
    name: string;
    mimeType: string;
    size: number;
  }>;
  error?: string;
};

export default function GardenPage() {
  const [view, setView] = useState<GardenView>("intro");
  const [initializedView, setInitializedView] = useState(false);
  
  <TypewriterText
  text="Start your garden"
  speed={90}
  pauseAfter={0}
  start= {view === "intro"}
  />

  const [capsules, setCapsules] = useState<CapsuleSummary[]>([]);
  const [selected, setSelected] = useState<CapsuleDetail | null>(null);
  const [status, setStatus] = useState<string>("Loading capsules...");
  const [submitting, setSubmitting] = useState(false);

  const defaultUnlockAt = useMemo(() => {
    const date = new Date(Date.now() + 60 * 60 * 1000);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
  }, []);

  async function loadCapsules() {
    try {
      const response = await fetch("/api/capsules", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) {
        setStatus(json.error ?? "Failed to load capsules");
        setCapsules([]);
        return;
      }
      setCapsules(json.capsules ?? []);
      setStatus("");
    } catch (err) {
      setStatus("Network error loading capsules");
      setCapsules([]);
    }
  }

  useEffect(() => {
    void loadCapsules();
  }, []);

  async function onCreate(formData: FormData) {
    setSubmitting(true);
    setStatus("");
    try {
      const response = await fetch("/api/capsules", {
        method: "POST",
        body: formData,
      });
      const json = await response.json();
      if (!response.ok) {
        setStatus(json.error ?? "Failed to create capsule");
        setSubmitting(false);
        return;
      }
      setStatus("Capsule created and encrypted successfully.");
      setSubmitting(false);
      await loadCapsules();
      // show the garden world after creating a capsule
      setView("garden");
    } catch (err) {
      setStatus("Network error creating capsule");
      setSubmitting(false);
    }
  }

  async function onSelectCapsule(id: string) {
    try {
      const response = await fetch(`/api/capsules/${id}`, { cache: "no-store" });
      const json = await response.json();
      setSelected(json as CapsuleDetail);
    } catch {
      setStatus("Network error loading capsule details");
    }
  }

  function CreateModal({ onClose }: { onClose: () => void }) {
    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      await onCreate(fd);
      e.currentTarget.reset();
    }

    return (
      <div className="modal-backdrop">
        <div className="modal">
          <h3 className="text-lg font-semibold">Plant a memory</h3>
          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <input name="title" required placeholder="Title" className="input" />
            <textarea name="note" placeholder="Write a note" rows={3} className="input" />
            <input name="unlockAt" type="datetime-local" defaultValue={defaultUnlockAt} required className="input" />
            <input name="files" type="file" multiple accept="image/*,audio/*" className="input" />
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? "Creating..." : "Plant"}
              </button>
              <button type="button" onClick={onClose} className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>

        <style jsx>{`
          .modal-backdrop {
            position: fixed;
            inset: 0;
            display: grid;
            place-items: center;
            background: rgba(0, 0, 0, 0.5);
            z-index: 60;
          }
          .modal {
            width: 96%;
            max-width: 520px;
            background: rgba(10, 10, 10, 0.98);
            border: 1px solid rgba(255, 255, 255, 0.06);
            padding: 18px;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
            color: white;
          }
          .input {
            width: 100%;
            padding: 10px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(255, 255, 255, 0.02);
            color: white;
          }
          .btn-primary {
            background: #0f172a;
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            border: none;
          }
          .btn-ghost {
            background: transparent;
            color: #cbd5e1;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.04);
          }
        `}</style>
      </div>
    );
  }

  function IntroHotspot({ onPlant }: { onPlant: () => void }) {
  return (
    <>
      <div
        className="hotspot"
        onClick={onPlant}
        role="button"
        aria-label="Plant a memory"
      />

      <div className="hint">
        plant a memory
      </div>

      <style jsx>{`
        .hotspot {
          position: absolute;
          left: 20px;
          bottom: 70px;
          width: 220px;
          height: 60px;
          cursor: pointer;
          z-index: 10;
        }

        .hint {
          position: absolute;
          left: 20px;
          bottom: 70px;
          z-index: 11;
          font-family: var(--font-typewriter), ui-monospace, monospace;
          color: rgba(125, 211, 252, 0);
          transition: color 0.16s ease, text-shadow 0.16s ease, transform 0.12s ease;
          padding: 6px 10px;
          border-radius: 8px;
          pointer-events: none;
          user-select: none;
        }

        .hotspot:hover + .hint {
          color: #7dd3fc;
          text-shadow: 0 0 6px #7dd3fc, 0 0 12px rgba(125, 211, 252, 0.12);
          transform: translateY(-1.5px);
        }
      `}</style>
    </>
  );
}

  return (
    <main style={{ color: "white", background: "black", minHeight: "100vh", position: "relative" }}>
      <TypewriterText text="Start your garden" speed={90} pauseAfter={0} start={view === "intro"} />
      {view === "intro" && <IntroHotspot onPlant={() => setView("create")} />}

      {view === "create" && <CreateModal onClose={() => setView("intro")} />}

      {view === "garden" && (
        <div className="dashboard-wrap">
          <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 p-8">
            <h1 className="text-2xl font-semibold">Memory Capsules</h1>

            <section>
              {status ? <p className="text-sm text-zinc-400">{status}</p> : null}

              <h2 className="mb-3 text-lg font-semibold mt-4">Mood Bubbles</h2>
              <div className="flex flex-wrap gap-4">
                {capsules.map((capsule) => (
                  <button
                    key={capsule.id}
                    type="button"
                    onClick={() => void onSelectCapsule(capsule.id)}
                    className="flex h-32 w-32 flex-col items-center justify-center rounded-full p-2 text-center text-xs text-white shadow"
                    style={{ backgroundColor: capsule.moodColor }}
                    title={capsule.title}
                  >
                    <span className="font-semibold">{capsule.mood}</span>
                    <span className="mt-1">{capsule.title.slice(0, 24)}</span>
                    <span className="mt-1">{capsule.unlocked ? "Unlocked" : "Locked"}</span>
                  </button>
                ))}
              </div>
            </section>

            {selected ? (
              <section className="rounded-lg border border-zinc-700 p-4">
                <h3 className="text-lg font-semibold">{selected.title}</h3>
                <p className="text-sm text-zinc-400">Mood: {selected.mood}</p>
                <p className="text-sm text-zinc-400">Unlock at: {new Date(selected.unlockAt).toLocaleString()}</p>
                {selected.unlocked ? (
                  <>
                    <p className="mt-3 whitespace-pre-wrap">{selected.note || "(No note)"}</p>
                    <ul className="mt-3 space-y-1 text-sm">
                      {(selected.files ?? []).map((file) => (
                        <li key={file.id}>
                          <a className="underline" href={`/api/capsules/${selected.id}/files/${file.id}`}>
                            {file.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-zinc-400">{selected.error ?? "Capsule is locked"}</p>
                )}
              </section>
            ) : null}
          </main>
        </div>
      )}
      <style jsx>{`
        .dashboard-wrap {
          z-index: 20;
        }
      `}</style>
    </main>
  );
}
