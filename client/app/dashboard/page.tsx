//this is the garden
"use client";

import GoogleSignIn from "@/components/GoogleSignIn";
import { useEffect, useMemo, useState } from "react";

type GardenView =
  | "intro"        // empty garden
  | "create"       // popup open
  | "garden";      // capsules visible

const [view, setView] = useState<GardenView>("intro");

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

export default function DashboardPage() {
  const [capsules, setCapsules] = useState<CapsuleSummary[]>([]);
  const [selected, setSelected] = useState<CapsuleDetail | null>(null);
  const [status, setStatus] = useState<string>("Loading capsules...");
  const [submitting, setSubmitting] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");

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

  const defaultUnlockAt = useMemo(() => {
    const date = new Date(Date.now() + 60 * 60 * 1000);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
  }, []);

  async function loadCapsules() {
    const response = await fetch("/api/capsules", { cache: "no-store" });
    const json = await response.json();

    if (!response.ok) {
      setStatus(json.error ?? "Failed to load capsules");
      setCapsules([]);
      return;
    }

    setCapsules(json.capsules ?? []);
    setStatus("");
  }

  useEffect(() => {
    void loadCapsules();
  }, []);

  async function onCreate(formData: FormData) {
    setSubmitting(true);
    setStatus("");

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
  }

  async function onSelectCapsule(id: string) {
    const [response, collabResponse] = await Promise.all([
      fetch(`/api/capsules/${id}`, { cache: "no-store" }),
      fetch(`/api/capsules/${id}/collaborators`, { cache: "no-store" }),
    ]);
    const [json, collabJson] = await Promise.all([response.json(), collabResponse.json()]);

    setSelected(json as CapsuleDetail);
    setCollaborators(collabJson.collaborators ?? []);
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Memory Capsules</h1>
        <GoogleSignIn />
      </div>

      <form
        className="grid gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const formData = new FormData(form);
          await onCreate(formData);
          form.reset();
        }}
      >
        <input
          name="title"
          type="text"
          placeholder="Capsule title"
          className="rounded border border-zinc-300 p-2 dark:border-zinc-600 dark:bg-zinc-800"
          required
        />
        <textarea
          name="note"
          placeholder="Write your memory note"
          rows={4}
          className="rounded border border-zinc-300 p-2 dark:border-zinc-600 dark:bg-zinc-800"
        />
        <input
          name="unlockAt"
          type="datetime-local"
          defaultValue={defaultUnlockAt}
          className="rounded border border-zinc-300 p-2 dark:border-zinc-600 dark:bg-zinc-800"
          required
        />
        <input
          name="files"
          type="file"
          multiple
          accept="image/*,audio/*"
          className="rounded border border-zinc-300 p-2 dark:border-zinc-600 dark:bg-zinc-800"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-fit rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-200 dark:text-black"
        >
          {submitting ? "Creating..." : "Create Capsule"}
        </button>
      </form>

      {status ? <p className="text-sm text-zinc-600 dark:text-zinc-300">{status}</p> : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Mood Bubbles</h2>
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
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <h3 className="text-lg font-semibold">{selected.title}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Mood: {selected.mood}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Role: {selected.accessRole ?? "collaborator"}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Unlock at: {new Date(selected.unlockAt).toLocaleString()}
          </p>

          {selected.accessRole === "owner" ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="Invite collaborator by email"
                className="rounded border border-zinc-300 p-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              />
              <button
                type="button"
                onClick={() => void onInviteCollaborator()}
                className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
              >
                Invite
              </button>
            </div>
          ) : null}

          {collaborators.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
              {collaborators.map((collaborator) => (
                <li key={collaborator.id}>
                  Collaborator: {collaborator.email ?? collaborator.username ?? collaborator.userId}
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
                    <div key={file.id} className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <img
                        src={`/api/capsules/${selected.id}/files/${file.id}`}
                        alt={file.name}
                        className="w-full object-contain"
                      />
                      <p className="truncate p-2 text-xs text-zinc-600 dark:text-zinc-300">{file.name}</p>
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
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{selected.error ?? "Capsule is locked"}</p>
          )}
        </section>
      ) : null}
    </main>
  );
}
