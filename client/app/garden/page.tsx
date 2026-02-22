"use client";

import GoogleSignIn from "@/components/GoogleSignIn";
import TypewriterText from "@/components/TypewriterText";
import OrbGarden from "@/components/OrbGarden";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GardenView = "intro" | "create" | "garden";

type CapsuleSummary = {
  id: string;
  title: string;
  createdAt: string;
  unlockAt: string;
  mood: string;
  moodColor: string;
  unlocked: boolean;
  accessRole: "owner" | "collaborator";
  canEdit: boolean;
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
  accessRole?: "owner" | "collaborator";
  canEdit?: boolean;
};

type Collaborator = {
  id: string;
  userId: string;
  invitedAt: string;
  email: string | null;
  username: string | null;
};

function getErrorDetailsMessage(details: unknown) {
  if (!details) {
    return "";
  }

  if (typeof details === "string") {
    return details;
  }

  if (typeof details === "object") {
    const candidate = details as {
      fieldErrors?: Record<string, string[]>;
      formErrors?: string[];
    };

    const fieldMessages = Object.values(candidate.fieldErrors ?? {})
      .flat()
      .filter(Boolean);
    const formMessages = (candidate.formErrors ?? []).filter(Boolean);
    const combined = [...fieldMessages, ...formMessages];

    if (combined.length > 0) {
      return combined.join(", ");
    }
  }

  return "Please check the input fields.";
}

function CreateModal({
  onClose,
  onCreate,
  submitting,
}: {
  onClose: () => void;
  onCreate: (formData: FormData) => Promise<void>;
  submitting: boolean;
}) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await onCreate(formData);
    event.currentTarget.reset();
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3 className="text-lg font-semibold">Plant a memory</h3>
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <input name="title" required placeholder="Title" className="input" />
          <textarea name="note" placeholder="Write a note" rows={3} className="input" />
          <input name="unlockAt" type="datetime-local" required className="input" />
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

function IntroHotspot({
  onPlant,
  label,
}: {
  onPlant: () => void;
  label: string;
}) {
  return (
    <>
      <div
        className="hotspot"
        onClick={onPlant}
        role="button"
        aria-label={label}
      />

      <div className="hint">
        {label}
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

export default function GardenPage() {
  const router = useRouter();

  // if we land on the garden without a valid session, send the user back home
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        router.replace('/');
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) {
        router.replace('/');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  const [view, setView] = useState<GardenView>("intro");
  const [viewInitialized, setViewInitialized] = useState(false);
  const [capsules, setCapsules] = useState<CapsuleSummary[]>([]);
  const [selected, setSelected] = useState<CapsuleDetail | null>(null);
  const [status, setStatus] = useState<string>("Loading capsules...");
  const [submitting, setSubmitting] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");

  async function loadCapsules() {
    try {
      const response = await fetch("/api/capsules", { cache: "no-store" });
      const json = await response.json();

      if (!response.ok) {
        setStatus(json.error ?? "Failed to load capsules");
        setCapsules([]);
        return;
      }

      const nextCapsules = (json.capsules ?? []) as CapsuleSummary[];
      setCapsules(nextCapsules);
      setStatus("");

      setView((current) => {
        if (current === "create") {
          return current;
        }

        return nextCapsules.length > 0 ? "garden" : "intro";
      });
    } catch {
      setStatus("Network error loading capsules");
      setCapsules([]);
    } finally {
      setViewInitialized(true);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCapsules();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
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
      setView("garden");
    } catch {
      setStatus("Network error creating capsule");
      setSubmitting(false);
    }
  }

  async function onSelectCapsule(id: string) {
    const [response, collabResponse] = await Promise.all([
      fetch(`/api/capsules/${id}`, { cache: "no-store" }),
      fetch(`/api/capsules/${id}/collaborators`, { cache: "no-store" }),
    ]);
    const [json, collabJson] = await Promise.all([response.json(), collabResponse.json()]);

    if (!response.ok) {
      setSelected(null);
      setStatus((json as { error?: string }).error ?? "Failed to load capsule");
      setCollaborators([]);
      return;
    }

    setSelected(json as CapsuleDetail);
    setCollaborators(collabResponse.ok ? (collabJson.collaborators ?? []) : []);
  }

  async function onInviteCollaborator() {
    if (!selected || !inviteEmail.trim()) {
      return;
    }

    const response = await fetch(`/api/capsules/${selected.id}/collaborators`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    });

    const json = await response.json();

    if (!response.ok) {
      const detailsMessage = getErrorDetailsMessage(json.details);
      setStatus(
        detailsMessage
          ? `${json.error ?? "Failed to invite collaborator"}: ${detailsMessage}`
          : (json.error ?? "Failed to invite collaborator"),
      );
      return;
    }

    setInviteEmail("");
    setStatus("Collaborator invited successfully.");
    await onSelectCapsule(selected.id);
  }

  async function onDeleteCapsule() {
    if (!selected || selected.accessRole !== "owner") {
      return;
    }

    const response = await fetch(`/api/capsules/${selected.id}`, {
      method: "DELETE",
    });

    const json = (await response.json().catch(() => null)) as { error?: string; details?: string } | null;

    if (!response.ok) {
      setStatus(json?.details ?? json?.error ?? "Failed to delete capsule");
      return;
    }

    setSelected(null);
    setCollaborators([]);
    setStatus("Memory deleted successfully.");
    await loadCapsules();
  }

  async function onLeaveCapsule() {
    if (!selected || selected.accessRole !== "collaborator") {
      return;
    }

    const response = await fetch(`/api/capsules/${selected.id}/collaborators`, {
      method: "DELETE",
    });

    const json = (await response.json().catch(() => null)) as { error?: string; details?: string } | null;

    if (!response.ok) {
      setStatus(json?.details ?? json?.error ?? "Failed to leave capsule");
      return;
    }

    setSelected(null);
    setCollaborators([]);
    setStatus("You left the memory capsule.");
    await loadCapsules();
  }

  return (
    <main style={{ color: "white", background: "black", minHeight: "100vh", position: "relative" }}>
      {viewInitialized ? (
        <TypewriterText
          text={view === "intro" ? "Start your garden" : "Add more memories"}
          speed={90}
          pauseAfter={0}
          start={view === "intro" || view === "garden"}
        />
      ) : null}

      {viewInitialized && (view === "intro" || view === "garden") ? (
        <IntroHotspot
          onPlant={() => setView("create")}
          label={view === "intro" ? "plant a memory" : "add more memories"}
        />
      ) : null}
      {view === "create" ? (
        <CreateModal
          onClose={() => setView(capsules.length > 0 ? "garden" : "intro")}
          onCreate={onCreate}
          submitting={submitting}
        />
      ) : null}

      {view === "garden" ? (
        <div className="dashboard-wrap">
          {viewInitialized && view === "garden" ? (
        <OrbGarden capsules={capsules} onSelect={(id) => void onSelectCapsule(id)} />
      ) : null}
          <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-semibold">Memory Capsules</h1>
              <GoogleSignIn />
            </div>

            {status ? <p className="text-sm text-zinc-400">{status}</p> : null}

            <section>
              <h2 className="mb-3 mt-4 text-lg font-semibold">Mood Bubbles</h2>
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
                    <span className="mt-1">{capsule.accessRole}</span>
                  </button>
                ))}
              </div>
            </section>

            {selected ? (
              <section className="rounded-lg border border-zinc-700 p-4">
                <h3 className="text-lg font-semibold">{selected.title}</h3>
                <p className="text-sm text-zinc-400">Mood: {selected.mood}</p>
                <p className="text-sm text-zinc-400">Role: {selected.accessRole ?? "collaborator"}</p>
                <p className="text-sm text-zinc-400">Unlock at: {new Date(selected.unlockAt).toLocaleString()}</p>

                {selected.accessRole === "owner" ? (
                  <button
                    type="button"
                    onClick={() => void onDeleteCapsule()}
                    className="mt-3 rounded bg-red-600 px-3 py-2 text-sm text-white"
                  >
                    Delete Memory
                  </button>
                ) : null}

                {selected.accessRole === "collaborator" ? (
                  <button
                    type="button"
                    onClick={() => void onLeaveCapsule()}
                    className="mt-3 rounded bg-orange-500 px-3 py-2 text-sm text-white"
                  >
                    Leave Memory
                  </button>
                ) : null}

                {selected.accessRole === "owner" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="Invite collaborator by email"
                      className="rounded border border-zinc-600 bg-zinc-800 p-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void onInviteCollaborator()}
                      className="rounded border border-zinc-600 px-3 py-2 text-sm"
                    >
                      Invite
                    </button>
                  </div>
                ) : null}

                {collaborators.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-sm text-zinc-300">
                    {collaborators.map((collaborator) => (
                      <li key={collaborator.id}>
                        Collaborator: {collaborator.username ?? collaborator.email ?? collaborator.userId}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {selected.unlocked ? (
                  <>
                    <p className="mt-3 whitespace-pre-wrap">{selected.note || "(No note)"}</p>
                    <div className="mt-3 space-y-4">
                      {(selected.files ?? [])
                        .filter((file) => file.mimeType.startsWith("image/"))
                        .map((file) => (
                          <div key={file.id} className="overflow-hidden rounded-lg border border-zinc-700">
                            <Image
                              src={`/api/capsules/${selected.id}/files/${file.id}`}
                              alt={file.name}
                              width={1200}
                              height={800}
                              unoptimized
                              className="h-auto w-full object-contain"
                            />
                            <p className="truncate p-2 text-xs text-zinc-300">{file.name}</p>
                          </div>
                        ))}
                    </div>
                    <ul className="mt-3 space-y-1 text-sm">
                      {(selected.files ?? [])
                        .filter((file) => !file.mimeType.startsWith("image/"))
                        .map((file) => (
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
      ) : null}

      <style jsx>{`
        .dashboard-wrap {
          z-index: 20;
        }
      `}</style>
    </main>
  );
}
