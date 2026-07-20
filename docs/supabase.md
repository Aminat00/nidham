# Nidham — Supabase (Postgres + Auth)

The app is **local-first**: it always works from on-device storage. When Supabase is
configured it additionally requires sign-in and syncs each user's items to Postgres,
protected by row-level security. The schema is plain Postgres, so you can lift it to
any Postgres host later.

## 1. Create the project + schema

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste and run [`supabase/schema.sql`](../supabase/schema.sql).
   It creates `profiles` + `items`, per-user RLS policies, indexes, `updated_at`
   triggers, and a trigger that auto-creates a profile on sign-up.
3. **Authentication → Providers → Email**: enable it. For quick testing you can turn
   off "Confirm email" so sign-in works immediately.

## 2. Point the app at it

In `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>   # Project Settings → API
```

Restart the dev server (env is inlined at build time). With these set, the app shows
a sign-in screen; without them, it runs as a local demo (no auth).

## 3. How sync works

- **Sign in** → the store pulls your rows (`items` filtered by `user_id`; RLS also
  enforces this server-side) and merges them over the local state. First sign-in on a
  device with no cloud rows seeds the cloud from local.
- **Every change** (mark done, push, capture) writes through to Postgres (debounced),
  and always to the local cache so the app stays instant and offline-tolerant.
- **Data model**: the `items` table mirrors `src/types/item.ts` 1:1
  (`src/data/itemsRepo.ts` maps between them). The app's semantic ids are unique per
  user, so the primary key is `(user_id, id)` and writes upsert on that pair.

## 4. For the agent (next phase)

The n8n agent will write to these same tables using the **service-role key** (server
side only — never in the app), scoped to the `user_id` passed in the request context.
Because RLS is on, the service role bypasses it by design; the flow must therefore set
`user_id` explicitly on every insert/update. See [`n8n-agent.md`](./n8n-agent.md).
