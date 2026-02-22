"use client";

import FlowerMenu from "@/components/FlowerMenu";
import TypewriterText from "@/components/TypewriterText";
import OrbGarden from "@/components/OrbGarden";
import TypewriterText from "@/components/TypewriterText";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type ArchivedMemory = CapsuleDetail & {
  archivedAt: string;
};

type Collaborator = {
  id: string;
  userId: string;
  invitedAt: string;
  email: string | null;
  username: string | null;
};

type CurrentUserProfile = {
  username: string | null;
  email: string | null;
};

type FriendRecord = {
  userId: string;
  username: string | null;
  email: string | null;
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
  onCancel,
  onPlantSuccess,
  onCreate,
  submitting,
}: {
  onCancel: () => void;
  onPlantSuccess: () => void;
  onCreate: (formData: FormData) => Promise<boolean>;
  submitting: boolean;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [isPlantingAnimation, setIsPlantingAnimation] = useState(false);

  const hasAtLeastOneFile = files.length > 0;
  const sortedDisplayFiles = useMemo(
    () => files.map((file, index) => ({ file, order: index + 1 })),
    [files],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasAtLeastOneFile) {
      setError("Attach at least 1 file (photo, video, or audio).");
      return;
    }

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    setError("");
    const created = await onCreate(formData);

    if (created) {
      setIsPlantingAnimation(true);
      window.setTimeout(() => {
        onPlantSuccess();
      }, 520);
      formElement.reset();
      setFiles([]);
    }
  }

  return (
    <div className={`modal-backdrop ${isPlantingAnimation ? "modal-backdrop-launching" : ""}`}>
      <div className={`modal ${isPlantingAnimation ? "modal-launching" : ""}`}>
        <h3 className="text-lg font-semibold">Make a memory</h3>
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <label className="field">
            Memory name
            <input
              name="title"
              required
              placeholder="Name this memory"
              className="input"
              disabled={submitting || isPlantingAnimation}
            />
          </label>
          <label className="field">
            Description
            <textarea
              name="note"
              placeholder="Write a description"
              rows={3}
              className="input"
              disabled={submitting || isPlantingAnimation}
            />
          </label>
          <label className="field">
            Attachments (required)
            <input
              name="files"
              type="file"
              multiple
              required
              accept="image/*,video/*,audio/*"
              className="input"
              disabled={submitting || isPlantingAnimation}
              onChange={(event) => {
                const selectedFiles = event.currentTarget.files
                  ? Array.from(event.currentTarget.files)
                  : [];
                setFiles(selectedFiles);
                if (selectedFiles.length > 0) {
                  setError("");
                }
              }}
            />
          </label>

          {sortedDisplayFiles.length > 0 ? (
            <ol className="attachment-list">
              {sortedDisplayFiles.map(({ file, order }) => (
                <li key={`${file.name}-${order}`} className="attachment-item">
                  {order}. {file.name}
                </li>
              ))}
            </ol>
          ) : null}

          <label className="field">
            Orb unlock date
            <input
              name="unlockAt"
              type="datetime-local"
              required
              className="input"
              disabled={submitting || isPlantingAnimation}
            />
          </label>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting || isPlantingAnimation} className="btn-primary">
              {submitting ? "Planting..." : "Plant memory"}
            </button>
            <button type="button" onClick={onCancel} className="btn-ghost" disabled={submitting || isPlantingAnimation}>
              Cancel (Esc)
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
          background: rgba(2, 3, 7, 0.72);
          z-index: 100;
        }
        .modal {
          width: 96%;
          max-width: 640px;
          background: rgba(10, 13, 20, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.09);
          padding: 18px;
          border-radius: 14px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
          color: white;
          font-family: var(--font-typewriter), ui-monospace, monospace;
          transform-origin: left bottom;
          will-change: transform, opacity, border-radius;
        }
        .modal-backdrop-launching {
          pointer-events: none;
        }
        .modal-launching {
          animation: plant-to-orb 520ms cubic-bezier(0.24, 1, 0.34, 1) forwards;
        }
        .field {
          display: grid;
          gap: 6px;
          font-size: 0.88rem;
          letter-spacing: 0.03em;
        }
        .input {
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.03);
          color: white;
        }
        .btn-primary {
          background: linear-gradient(150deg, #334155, #0f172a);
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
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .attachment-list {
          margin-top: 2px;
          margin-bottom: 4px;
          display: grid;
          gap: 4px;
          max-height: 132px;
          overflow: auto;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.02);
          padding: 8px;
          font-size: 12px;
        }
        .attachment-item {
          color: #cce8ff;
          opacity: 0.95;
        }
        @keyframes plant-to-orb {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            border-radius: 14px;
            opacity: 1;
          }
          100% {
            transform: translate3d(36vw, -28vh, 0) scale(0.2);
            border-radius: 999px;
            opacity: 0;
          }
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
      <div className="hotspot" onClick={onPlant} role="button" aria-label={label} />

      <div className="hint">{label}</div>

      <style jsx>{`
        .hotspot {
          position: fixed;
          left: 20px;
          bottom: 20px;
          width: min(320px, calc(100vw - 40px));
          height: 42px;
          cursor: pointer;
          z-index: 102;
          border-radius: 10px;
        }

        .hint {
          position: fixed;
          left: 30px;
          bottom: 54px;
          z-index: 103;
          font-family: var(--font-typewriter), ui-monospace, monospace;
          color: #7dd3fc;
          opacity: 0;
          transform: translateY(8px) scale(0.98);
          transition: opacity 0.16s ease, text-shadow 0.16s ease, transform 0.16s ease;
          padding: 4px 8px;
          border-radius: 8px;
          pointer-events: none;
          user-select: none;
        }

        .hotspot:hover + .hint {
          opacity: 1;
          text-shadow: 0 0 6px #7dd3fc, 0 0 12px rgba(125, 211, 252, 0.12);
          transform: translateY(-6px) scale(1);
        }

        @media (max-width: 520px) {
          .hotspot {
            left: 12px;
            bottom: 12px;
            width: min(320px, calc(100vw - 24px));
          }

          .hint {
            left: 20px;
            bottom: 48px;
          }
        }
      `}</style>
    </>
  );
}

function ForgetMeNotLogo({
  className,
}: {
  className?: string;
}) {
  return (
    <svg className={className} width="140" height="90" viewBox="0 0 140 90" fill="none" xmlns="http://www.w3.org/2000/svg">
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
  );
}

function MemoryModal({
  capsule,
  collaborators,
  inviteEmail,
  onInviteEmailChange,
  onInvite,
  onDelete,
  onLeave,
  onClose,
}: {
  capsule: CapsuleDetail;
  collaborators: Collaborator[];
  inviteEmail: string;
  onInviteEmailChange: (value: string) => void;
  onInvite: () => Promise<void>;
  onDelete: () => Promise<void>;
  onLeave: () => Promise<void>;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop memory-backdrop" onClick={onClose}>
      <section
        className="memory-modal"
        aria-modal="true"
        role="dialog"
        aria-label={capsule.title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="memory-head">
          <h3 className="text-xl font-semibold">{capsule.title}</h3>
          <button type="button" onClick={onClose} className="rounded border border-zinc-500 px-3 py-1 text-sm">
            Pick Flower (Esc)
          </button>
        </div>

        <p className="text-sm text-zinc-300">Mood: {capsule.mood}</p>
        <p className="text-sm text-zinc-400">Role: {capsule.accessRole ?? "collaborator"}</p>
        <p className="text-sm text-zinc-400">Opened: {new Date(capsule.unlockAt).toLocaleString()}</p>

        {capsule.accessRole === "owner" ? (
          <button type="button" onClick={() => void onDelete()} className="mt-3 rounded bg-red-600 px-3 py-2 text-sm text-white">
            Delete Memory
          </button>
        ) : null}

        {capsule.accessRole === "collaborator" ? (
          <button
            type="button"
            onClick={() => void onLeave()}
            className="mt-3 rounded bg-orange-500 px-3 py-2 text-sm text-white"
          >
            Leave Memory
          </button>
        ) : null}

        {capsule.accessRole === "owner" ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => onInviteEmailChange(event.target.value)}
              placeholder="Invite collaborator by email"
              className="rounded border border-zinc-600 bg-zinc-900 p-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void onInvite()}
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

        {capsule.unlocked ? (
          <>
            <p className="mt-4 whitespace-pre-wrap rounded border border-zinc-700 bg-zinc-950/70 p-3">{capsule.note || "(No note)"}</p>

            <div className="mt-4 space-y-4">
              {(capsule.files ?? [])
                .filter((file) => file.mimeType.startsWith("image/"))
                .map((file) => (
                  <div key={file.id} className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950/70">
                    <Image
                      src={`/api/capsules/${capsule.id}/files/${file.id}`}
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

            <ul className="mt-4 space-y-1 text-sm">
              {(capsule.files ?? [])
                .filter((file) => !file.mimeType.startsWith("image/"))
                .map((file) => (
                  <li key={file.id}>
                    <a className="underline" href={`/api/capsules/${capsule.id}/files/${file.id}`}>
                      {file.name}
                    </a>
                  </li>
                ))}
            </ul>
          </>
        ) : (
          <p className="mt-3 text-sm text-zinc-400">{capsule.error ?? "Capsule is locked"}</p>
        )}
      </section>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 14px;
        }

        .memory-backdrop {
          z-index: 110;
          background: rgba(2, 4, 10, 0.78);
          backdrop-filter: blur(4px);
        }

        .memory-modal {
          width: min(880px, 94vw);
          max-height: 88vh;
          overflow: auto;
          border-radius: 34px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background:
            radial-gradient(circle at center, rgba(176, 227, 255, 0.13), transparent 52%),
            radial-gradient(circle at top right, rgba(85, 182, 255, 0.12), transparent 44%),
            rgba(6, 8, 14, 0.98);
          padding: 18px;
          color: white;
          font-family: var(--font-typewriter), ui-monospace, monospace;
          box-shadow: 0 24px 66px rgba(0, 0, 0, 0.62);
          animation: orb-focus-in 220ms ease-out;
        }

        .memory-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        @keyframes orb-focus-in {
          0% {
            transform: scale(0.94);
            opacity: 0.4;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function ArchiveModal({
  archivedMemories,
  onClose,
}: {
  archivedMemories: ArchivedMemory[];
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop archive-backdrop" onClick={onClose}>
      <section
        className="archive-modal"
        aria-modal="true"
        role="dialog"
        aria-label="Picked flowers archive"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="archive-head">
          <h3 className="text-xl font-semibold">Picked flowers archive</h3>
          <button type="button" onClick={onClose} className="rounded border border-zinc-500 px-3 py-1 text-sm">
            Close (Esc)
          </button>
        </div>

        {archivedMemories.length === 0 ? (
          <p className="text-sm text-zinc-300">No flowers picked yet.</p>
        ) : (
          <div className="archive-list">
            {archivedMemories.map((memory) => (
              <article key={memory.id} className="archive-card">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold">{memory.title}</h4>
                  <span className="text-xs text-zinc-400">picked {new Date(memory.archivedAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-300">Mood: {memory.mood}</p>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-200">{memory.note || "(No note)"}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 14px;
        }

        .archive-backdrop {
          z-index: 120;
          background: rgba(1, 3, 8, 0.74);
        }

        .archive-modal {
          width: min(800px, 95vw);
          max-height: 84vh;
          overflow: auto;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.11);
          background: rgba(8, 10, 18, 0.98);
          padding: 18px;
          color: white;
          font-family: var(--font-typewriter), ui-monospace, monospace;
        }

        .archive-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .archive-list {
          display: grid;
          gap: 10px;
        }

        .archive-card {
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 10px;
          padding: 10px;
          background: rgba(15, 18, 28, 0.9);
        }
      `}</style>
    </div>
  );
}

function FriendsModal({
  friends,
  onVisit,
  onClose,
}: {
  friends: FriendRecord[];
  onVisit: (friend: FriendRecord) => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop friends-backdrop" onClick={onClose}>
      <section
        className="friends-modal"
        aria-modal="true"
        role="dialog"
        aria-label="Friends"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="friends-head">
          <h3 className="text-xl font-semibold">Friends</h3>
          <button type="button" onClick={onClose} className="friends-close" aria-label="Close friends window">
            X
          </button>
        </div>

        {friends.length === 0 ? (
          <p className="text-sm text-zinc-300">
            No friends yet. Invite collaborators to memories to start building your friend list.
          </p>
        ) : (
          <ul className="friends-list">
            {friends.map((friend) => {
              const displayName = friend.username ?? friend.email ?? friend.userId;
              return (
                <li key={friend.userId} className="friend-row">
                  <span className="friend-name">{displayName}</span>
                  <button type="button" className="friend-visit" onClick={() => onVisit(friend)}>
                    Visit
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 14px;
        }

        .friends-backdrop {
          z-index: 125;
          background: rgba(2, 4, 10, 0.74);
          backdrop-filter: blur(3px);
        }

        .friends-modal {
          width: min(560px, 94vw);
          max-height: 82vh;
          overflow: auto;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(8, 10, 18, 0.96);
          padding: 16px;
          color: white;
          font-family: var(--font-typewriter), ui-monospace, monospace;
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5);
        }

        .friends-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .friends-close {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: transparent;
          color: #f8fafc;
          font-weight: 700;
          line-height: 1;
        }

        .friends-list {
          display: grid;
          gap: 8px;
        }

        .friend-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
          padding: 10px 12px;
        }

        .friend-name {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #e2e8f0;
        }

        .friend-visit {
          border-radius: 999px;
          border: 1px solid rgba(125, 211, 252, 0.45);
          background: transparent;
          color: #bae6fd;
          padding: 5px 12px;
          font-size: 0.85rem;
          white-space: nowrap;
        }
      `}</style>
    </div>
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

  const supabase = useMemo(() => createSupabaseClient(), []);
  const [view, setView] = useState<GardenView>("intro");
  const [viewInitialized, setViewInitialized] = useState(false);
  const [capsules, setCapsules] = useState<CapsuleSummary[]>([]);
  const [selected, setSelected] = useState<CapsuleDetail | null>(null);
  const [status, setStatus] = useState<string>("Loading capsules...");
  const [submitting, setSubmitting] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [archivedMemories, setArchivedMemories] = useState<ArchivedMemory[]>([]);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [bloomingOrbId, setBloomingOrbId] = useState<string | null>(null);
  const [bloomToken, setBloomToken] = useState(0);
  const [gardenHeight, setGardenHeight] = useState(620);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserProfile | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (collaborators.length === 0) {
      return;
    }

    setFriends((current) => {
      const byUserId = new Map(current.map((friend) => [friend.userId, friend]));

      for (const collaborator of collaborators) {
        const existing = byUserId.get(collaborator.userId);
        byUserId.set(collaborator.userId, {
          userId: collaborator.userId,
          username: collaborator.username ?? existing?.username ?? null,
          email: collaborator.email ?? existing?.email ?? null,
        });
      }

      return [...byUserId.values()].sort((a, b) => {
        const aName = (a.username ?? a.email ?? a.userId).toLowerCase();
        const bName = (b.username ?? b.email ?? b.userId).toLowerCase();
        return aName.localeCompare(bName);
      });
    });
  }, [collaborators]);

  const onCloseSelectedMemory = useCallback(() => {
    if (!selected) {
      return;
    }

    const closedMemory = selected;
    setSelected(null);
    setCollaborators([]);

    if (!closedMemory.unlocked) {
      return;
    }

    setArchivedMemories((current) => {
      if (current.some((memory) => memory.id === closedMemory.id)) {
        return current;
      }

      return [{ ...closedMemory, archivedAt: new Date().toISOString() }, ...current];
    });

    setArchivedIds((current) => {
      if (current.includes(closedMemory.id)) {
        return current;
      }

      return [closedMemory.id, ...current];
    });

    setCapsules((current) => current.filter((capsule) => capsule.id !== closedMemory.id));
    setStatus("Memory opened and archived to picked flowers.");
  }, [selected]);

  const loadCapsules = useCallback(async () => {
    try {
      const response = await fetch("/api/capsules", { cache: "no-store" });
      const json = await response.json();

      if (!response.ok) {
        setStatus(json.error ?? "Failed to load capsules");
        setCapsules([]);
        return;
      }

      const nextCapsules = (json.capsules ?? []) as CapsuleSummary[];
      const visibleCapsules = nextCapsules.filter((capsule) => !archivedIds.includes(capsule.id));

      setCapsules(visibleCapsules);
      setStatus("");

      setView((current) => {
        if (current === "create") {
          return current;
        }

        return visibleCapsules.length > 0 || archivedMemories.length > 0 ? "garden" : "intro";
      });
    } catch {
      setStatus("Network error loading capsules");
      setCapsules([]);
    } finally {
      setViewInitialized(true);
    }
  }, [archivedIds, archivedMemories.length]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCapsules();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [loadCapsules]);

  useEffect(() => {
    const updateGardenHeight = () => {
      const nextHeight = Math.round(window.innerHeight);
      setGardenHeight(Math.max(560, nextHeight));
    };

    updateGardenHeight();
    window.addEventListener("resize", updateGardenHeight);

    return () => {
      window.removeEventListener("resize", updateGardenHeight);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadCurrentUserProfile = async () => {
      try {
        const response = await fetch("/api/profile/sync", {
          method: "POST",
          cache: "no-store",
        });

        const json = (await response.json().catch(() => null)) as
          | { username?: string | null; email?: string | null }
          | null;

        if (active && response.ok) {
          setCurrentUserProfile({
            username: json?.username ?? null,
            email: json?.email ?? null,
          });
          return;
        }
      } catch {
        // Fall through to auth fallback.
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active || !user) {
          return;
        }

        setCurrentUserProfile({
          username:
            (typeof user.user_metadata?.preferred_username === "string" && user.user_metadata.preferred_username) ||
            (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
            null,
          email: user.email ?? null,
        });
      } catch {
        if (active) {
          setCurrentUserProfile(null);
        }
      }
    };

    void loadCurrentUserProfile();

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (selected) {
        onCloseSelectedMemory();
        return;
      }

      if (showArchive) {
        setShowArchive(false);
        return;
      }

      if (showFriends) {
        setShowFriends(false);
        return;
      }

      if (menuOpen) {
        setMenuOpen(false);
        return;
      }

      if (view === "create") {
        setView(capsules.length > 0 ? "garden" : "intro");
      }
    };

    window.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [capsules.length, menuOpen, onCloseSelectedMemory, selected, showArchive, showFriends, view]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current) {
        return;
      }

      const target = event.target as Node | null;
      if (target && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

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
        return false;
      }

      setStatus("Capsule created and encrypted successfully.");
      setSubmitting(false);
      await loadCapsules();
      return true;
    } catch {
      setStatus("Network error creating capsule");
      setSubmitting(false);
      return false;
    }
  }

  async function loadCapsuleDetail(id: string, triggerBloom: boolean) {
    try {
      const [response, collabResponse] = await Promise.all([
        fetch(`/api/capsules/${id}`, { cache: "no-store" }),
        fetch(`/api/capsules/${id}/collaborators`, { cache: "no-store" }),
      ]);

      const json = (await response.json().catch(() => null)) as CapsuleDetail | { error?: string } | null;
      const collabJson = (await collabResponse.json().catch(() => null)) as
        | { collaborators?: Collaborator[] }
        | null;

      if (!response.ok) {
        setSelected(null);
        setStatus((json as { error?: string } | null)?.error ?? "Failed to load capsule");
        setCollaborators([]);
        return;
      }

      const detail = json as CapsuleDetail;

      if (!detail.unlocked) {
        setStatus(detail.error ?? "This memory is still sealed.");
        setSelected(null);
        setCollaborators([]);
        return;
      }

      setSelected(detail);
      setCollaborators(collabResponse.ok ? (collabJson?.collaborators ?? []) : []);
      setInviteEmail("");
      setStatus("");

      if (triggerBloom) {
        setBloomToken((current) => current + 1);
        setBloomingOrbId(id);
        window.setTimeout(() => {
          setBloomingOrbId((current) => (current === id ? null : current));
        }, 1100);
      }
    } catch {
      setStatus("Network error loading capsule");
      setSelected(null);
      setCollaborators([]);
    }
  }

  async function onSelectCapsule(id: string) {
    await loadCapsuleDetail(id, true);
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
    await loadCapsuleDetail(selected.id, false);
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

    const removedId = selected.id;
    setSelected(null);
    setCollaborators([]);
    setCapsules((current) => current.filter((capsule) => capsule.id !== removedId));
    setArchivedMemories((current) => current.filter((memory) => memory.id !== removedId));
    setArchivedIds((current) => current.filter((id) => id !== removedId));
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

    const removedId = selected.id;
    setSelected(null);
    setCollaborators([]);
    setCapsules((current) => current.filter((capsule) => capsule.id !== removedId));
    setStatus("You left the memory capsule.");
    await loadCapsules();
  }

  async function onLogout() {
    try {
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setStatus("Failed to log out. Try again.");
    }
  }

  function onVisitFriend(friend: FriendRecord) {
    const label = friend.username ?? friend.email ?? friend.userId;
    setStatus(`Visit ${label}: collaboration garden visits are a reach goal (coming soon).`);
    setShowFriends(false);
  }

  return (
    <main className="garden-root">
      <div className="space-backdrop" aria-hidden="true">
        <div className="particle-layer particle-layer-slow" />
        <div className="particle-layer particle-layer-fast" />
      </div>

      {viewInitialized ? (
        <TypewriterText
          text={
            view === "intro"
              ? "Start your garden"
              : capsules.length === 0
                ? "Your garden is empty, plant a new memory..."
                : "Plant a new memory..."
          }
          speed={90}
          pauseAfter={0}
          start={view === "intro" || view === "garden"}
        />
      ) : null}

      {viewInitialized && (view === "intro" || view === "garden") ? (
        <IntroHotspot
          onPlant={() => setView("create")}
          label="plant memory"
        />
      ) : null}

      {viewInitialized && view === "intro" ? (
        <div className="controls-wrap" ref={menuRef}>
          <button
            type="button"
            className="logo-trigger"
            onClick={() => setMenuOpen((current) => !current)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="garden-logo-menu-intro"
            aria-label="Open menu"
          >
            <ForgetMeNotLogo className="menu-logo" />
          </button>

          <div id="garden-logo-menu-intro" className={`logo-dropdown ${menuOpen ? "open" : ""}`}>
            <button
              type="button"
              onClick={() => {
                setShowFriends(true);
                setMenuOpen(false);
              }}
              className="control-btn"
            >
              Friends
            </button>
            <button
              type="button"
              onClick={() => {
                setShowArchive(true);
                setMenuOpen(false);
              }}
              className="control-btn"
            >
              See picked flowers ({archivedMemories.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                void onLogout();
              }}
              className="control-btn"
            >
              Log out
            </button>
            {currentUserProfile?.username || currentUserProfile?.email ? (
              <p className="logged-user">
                logged in as {currentUserProfile.username ?? currentUserProfile.email}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {view === "create" ? (
        <CreateModal
          onCancel={() => setView(capsules.length > 0 ? "garden" : "intro")}
          onPlantSuccess={() => setView("garden")}
          onCreate={onCreate}
          submitting={submitting}
        />
      ) : null}

      {view === "garden" ? (
        <section className="dashboard-wrap">
          <div className="garden-canvas">
            <OrbGarden
              capsules={capsules}
              onSelect={(id) => void onSelectCapsule(id)}
              height={gardenHeight}
              fullscreen
              bloomingOrbId={bloomingOrbId}
              bloomToken={bloomToken}
            />
          </div>

          <div className="garden-overlay">
            <div className="garden-topbar">
              <div className={`title-wrap ${viewInitialized ? "fade-in" : "pre-anim"}`}>
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

              <div className="controls-wrap" ref={menuRef}>
                <button
                  type="button"
                  className="logo-trigger"
                  onClick={() => setMenuOpen((current) => !current)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-controls="garden-logo-menu"
                  aria-label="Open menu"
                >
                  <ForgetMeNotLogo className="menu-logo" />
                </button>

                <div id="garden-logo-menu" className={`logo-dropdown ${menuOpen ? "open" : ""}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFriends(true);
                      setMenuOpen(false);
                    }}
                    className="control-btn"
                  >
                    Friends
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowArchive(true);
                      setMenuOpen(false);
                    }}
                    className="control-btn"
                  >
                    See picked flowers ({archivedMemories.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void onLogout();
                    }}
                    className="control-btn"
                  >
                    Log out
                  </button>
                  {currentUserProfile?.username || currentUserProfile?.email ? (
                    <p className="logged-user">
                      logged in as {currentUserProfile.username ?? currentUserProfile.email}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {status ? <p className="garden-status text-sm text-zinc-300">{status}</p> : null}

          </div>
        </section>
      ) : null}

      {selected ? (
        <MemoryModal
          capsule={selected}
          collaborators={collaborators}
          inviteEmail={inviteEmail}
          onInviteEmailChange={setInviteEmail}
          onInvite={onInviteCollaborator}
          onDelete={onDeleteCapsule}
          onLeave={onLeaveCapsule}
          onClose={onCloseSelectedMemory}
        />
      ) : null}

      {showArchive ? <ArchiveModal archivedMemories={archivedMemories} onClose={() => setShowArchive(false)} /> : null}
      {showFriends ? <FriendsModal friends={friends} onVisit={onVisitFriend} onClose={() => setShowFriends(false)} /> : null}

      <style jsx>{`
        .garden-root {
          color: white;
          min-height: 100vh;
          position: relative;
          font-family: var(--font-typewriter), ui-monospace, monospace;
          letter-spacing: 0.01em;
          background: #04070d;
        }

        .space-backdrop {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background: #03060d;
        }

        .particle-layer {
          position: absolute;
          inset: -22%;
          opacity: 0.4;
          background-size: 240px 240px;
        }

        .particle-layer-slow {
          background-image:
            radial-gradient(circle, rgba(191, 230, 255, 0.55) 0 1px, transparent 2px),
            radial-gradient(circle, rgba(125, 211, 252, 0.42) 0 1.3px, transparent 2.4px);
          background-position: 0 0, 120px 86px;
          animation: particles-rise 20s linear infinite;
        }

        .particle-layer-fast {
          opacity: 0.28;
          background-size: 180px 180px;
          background-image:
            radial-gradient(circle, rgba(147, 197, 253, 0.54) 0 1px, transparent 2px),
            radial-gradient(circle, rgba(186, 230, 253, 0.4) 0 1.2px, transparent 2px);
          background-position: 40px 60px, 120px 20px;
          animation: particles-rise-fast 12s linear infinite;
        }

        .dashboard-wrap {
          z-index: 20;
          position: relative;
          min-height: 100vh;
          width: 100%;
          overflow: hidden;
        }

        .garden-canvas {
          position: absolute;
          inset: 0;
          z-index: 20;
        }

        .garden-overlay {
          position: relative;
          z-index: 26;
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 12px;
          pointer-events: none;
        }

        .garden-topbar {
          width: 100%;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          pointer-events: auto;
        }

        .controls-wrap {
          pointer-events: auto;
          position: fixed;
          top: 14px;
          right: 14px;
          z-index: 40;
          display: grid;
          justify-items: end;
          gap: 8px;
        }

        .logo-trigger {
          width: 148px;
          height: 94px;
          border-radius: 14px;
          border: none;
          background: transparent;
          display: grid;
          place-items: center;
          box-shadow: none;
          transition: transform 130ms ease;
        }

        .logo-trigger:hover {
          transform: translateY(-1px) scale(1.02);
        }

        .menu-logo {
          width: 132px;
          height: auto;
          display: block;
          filter: drop-shadow(0 0 8px rgba(147, 197, 253, 0.24));
          transition: filter 140ms ease;
        }

        .logo-trigger:hover .menu-logo,
        .logo-trigger:focus-visible .menu-logo {
          filter:
            drop-shadow(0 0 6px rgba(255, 255, 255, 0.35))
            drop-shadow(0 0 14px rgba(147, 197, 253, 0.65))
            drop-shadow(0 0 24px rgba(96, 165, 250, 0.35));
        }

        .logo-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: min(290px, 82vw);
          display: grid;
          gap: 8px;
          opacity: 0;
          transform: translateY(-4px) scale(0.98);
          pointer-events: none;
          transition: opacity 150ms ease, transform 150ms ease;
        }

        .logo-dropdown.open {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }

        .logged-user {
          margin: 2px 6px 0;
          padding: 2px 4px;
          font-size: 0.78rem;
          line-height: 1.25;
          color: rgba(226, 232, 240, 0.78);
          text-align: right;
          pointer-events: none;
          text-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
          word-break: break-word;
        }

        .control-btn {
          border-radius: 12px;
          border: 1px solid rgb(82 82 91 / 0.55);
          background: transparent;
          padding: 12px 16px;
          font-size: 1rem;
          line-height: 1.2;
          font-weight: 600;
          text-align: left;
          color: rgb(244 244 245);
          transition: border-color 120ms ease, background 120ms ease, transform 120ms ease, color 120ms ease;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }

        .control-btn:hover {
          border-color: rgb(125 211 252 / 0.7);
          background: transparent;
          color: rgb(224 242 254);
          transform: translateY(-1px);
        }

        .control-btn:active {
          transform: translateY(0);
        }

        @media (max-width: 700px) {
          .controls-wrap {
            top: 10px;
            right: 10px;
          }

          .logo-trigger {
            width: 124px;
            height: 82px;
            border-radius: 12px;
          }

          .menu-logo {
            width: 110px;
          }

          .logo-dropdown {
            width: min(250px, 88vw);
          }

          .control-btn {
            padding: 10px 12px;
            font-size: 0.95rem;
          }
        }

        .garden-status {
          pointer-events: auto;
          width: fit-content;
          max-width: min(94vw, 680px);
          border-radius: 9px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: rgba(9, 15, 27, 0.72);
          padding: 6px 10px;
        }

        .garden-empty {
          pointer-events: auto;
          margin-top: auto;
          width: fit-content;
          max-width: min(94vw, 720px);
        }

        .title-wrap {
          width: 100%;
          display: flex;
          justify-content: flex-start;
        }

        .aurora-title {
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(1.8rem, 4vw, 3.2rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          position: relative;
          overflow: hidden;
          background: transparent;
          margin: 0;
          color: #fff;
          display: inline-block;
          padding: 0.12em 0.2em;
          border-radius: 14px;
          text-shadow: none;
        }

        .aurora {
          display: none;
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

        @keyframes particles-rise {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-210px);
          }
        }

        @keyframes particles-rise-fast {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-260px);
          }
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
          0%,
          100% {
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

        .pre-anim {
          opacity: 0;
        }

        .fade-in {
          opacity: 1;
          animation: fade-in 500ms ease-out forwards;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
