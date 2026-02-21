create extension if not exists pgcrypto;

create table if not exists public.capsules (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  unlock_at timestamptz not null,
  iv text not null,
  auth_tag text not null,
  ciphertext text not null,
  mood text not null,
  mood_color text not null
);

create index if not exists capsules_unlock_at_idx on public.capsules (unlock_at);
