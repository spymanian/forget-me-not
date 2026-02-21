type UserLike = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

type UpsertResult = {
  error: { message: string; code?: string } | null;
};

type SupabaseLike = {
  from: (table: string) => {
    upsert: (
      values: Record<string, unknown>,
      options?: { onConflict?: string },
    ) => PromiseLike<UpsertResult>;
  };
};

function normalizedSeed(seed: string) {
  return (
    seed
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 20) || "user"
  );
}

function buildUsername(seed: string, userId: string, attempt: number) {
  const base = `${normalizedSeed(seed)}_${userId.slice(0, 6)}`;
  return attempt === 0 ? base : `${base}_${attempt}`;
}

export async function ensureProfileForUser(supabase: SupabaseLike, user: UserLike) {
  if (!user.email) {
    throw new Error("User has no email");
  }

  const email = user.email.toLowerCase();
  const preferredName =
    (typeof user.user_metadata?.preferred_username === "string" && user.user_metadata.preferred_username) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    email.split("@")[0] ||
    "user";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const username = buildUsername(preferredName, user.id, attempt);
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email,
        username,
      },
      { onConflict: "id" },
    );

    if (!error) {
      return { email, username };
    }

    const message = error.message.toLowerCase();
    const code = error.code;

    if (code === "42501" || message.includes("row-level security") || message.includes("permission denied")) {
      throw new Error("Profile sync blocked by RLS policy on profiles table");
    }

    const isUniqueUsernameConflict =
      code === "23505" && (message.includes("profiles_username_key") || message.includes("username"));

    if (isUniqueUsernameConflict) {
      continue;
    }

    throw new Error(error.message);
  }

  throw new Error("Failed to generate a unique username");
}
