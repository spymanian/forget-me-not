This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Backend (Supabase) setup

1. Copy `.env.example` to `.env.local` and fill values:
	 - `SUPABASE_URL`
	 - `SUPABASE_SERVICE_ROLE_KEY`
	 - `CAPSULE_ENCRYPTION_SECRET`
	 - `OPENAI_API_KEY` (optional, fallback mood tagging is used when missing)
2. In Supabase SQL editor, run `supabase/schema.sql`.
3. Install dependencies with `npm install`.

## Capsule API (backend only)

- `POST /api/capsules`
	- `multipart/form-data`
	- fields:
		- `note` (string, optional)
		- `unlockAt` (ISO datetime, required, must be in the future)
		- `files` (repeatable file field, optional)
- `GET /api/capsules`
	- Lists capsule metadata with lock status.
- `GET /api/capsules/:id`
	- Returns decrypted note and file metadata only after unlock time.
	- Returns `423` while locked.
- `GET /api/capsules/:id/files/:fileId`
	- Returns decrypted file bytes only after unlock time.
	- Returns `423` while locked.
- `POST /api/mood`
	- JSON body: `{ "text": "memory text" }`
	- Returns LLM mood + color (or fallback heuristic when no LLM key)

All capsule contents (notes + files) are encrypted before insertion and stored encrypted in database.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
