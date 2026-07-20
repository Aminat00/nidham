# Nidham — نِظام

*Empty your head in ten seconds and watch each thing land, already scheduled around the five prayers. Nidham proposes, you dispose.*

React Native / Expo · TypeScript · Arabic (RTL), English, Turkish · fonts Hanken Grotesk + Amiri. Design source of truth: the Claude Design file `Nidham.dc.html`. **Scope: tabs 1 & 2 only — Capture and Today.**

## Run

```bash
npm install
npm run ios      # or: npm run android
npm run web      # browser preview
npm run typecheck
```

The demo works out of the box with **no configuration** — it ships with a built-in fallback plan, so a missing/failed agent never breaks it.

## The agent (one swappable module)

All model calls go through `src/agent/runAgent.ts`, configured by env (copy `.env.example` → `.env`):

| Var | Meaning |
|---|---|
| `EXPO_PUBLIC_AGENT_MODE` | `webhook` (preferred — key stays server-side on n8n) or `direct` |
| `EXPO_PUBLIC_AGENT_URL` | n8n webhook running the Triage → Planner → Breakdown orchestrator |
| `EXPO_PUBLIC_AGENT_KEY` | model key, **`direct` mode only** |

- **webhook**: POSTs the request contract to n8n; n8n owns the prompt + key.
- **direct**: calls the model with the full orchestrator system prompt (`src/agent/systemPrompt.ts`, verbatim from the spec).
- **fallback**: if unconfigured / offline / bad response, `runAgent` returns a built-in plan. It never throws.

**Request** → `{ capture, context: { now, lang, prayerTimes, existingItems } }`
**Response** → `{ summary, items[] }` (projects carry nested `steps`).

To stand up the live agent, follow [`docs/n8n-agent.md`](docs/n8n-agent.md) and import
[`docs/nidham-agent.n8n.json`](docs/nidham-agent.n8n.json) into n8n.

## Backend

| Capability | Status | Where |
|---|---|---|
| **Agent** | webhook / direct / fallback — app side ready; import the n8n flow to go live | `src/agent/`, `docs/` |
| **Persistence** | live — captures + done/pushed state + language survive a reload (AsyncStorage) | `src/state/persistence.ts` |
| **Prayer times** | live — real times + Hijri date from the Aladhan API by device location, with an offline fallback to the pinned demo | `src/data/prayerTimes.ts`, `PrayerTimesContext.tsx` |
| **Voice** | real Web Speech dictation in the browser; simulated on native (real native STT needs a dev build) | `src/components/DumpBox.tsx` |

## Architecture

```
src/
  types/item.ts        The single Item model (prayers, tasks, projects, steps — all Items)
  agent/               contract · systemPrompt · runAgent  (the swappable layer)
  data/                demo constants · prayers · localized fallback plan · seed
  state/               in-memory store · flatten (lift nested steps → real Items)
  i18n/                en/ar/tr strings · I18nContext (live language + RTL flip)
  theme/               design tokens (palette/type/spacing) · rtl helpers
  components/          Card, DumpBox, CaptureCard, TimelineRow, TabBar, primitives, Icons
  screens/             CaptureScreen · TodayScreen
```

### Notes

- **Everything is one `Item`.** Category + field values distinguish a prayer from a task from a project step.
- **RTL is live** (no reload): the toggle flips copy *and* layout — mirrored rows, accent bars, timeline, flipped arrows, Arabic-Indic numerals.
- **Demo day is pinned** to 20 Jul 2026 (`src/data/demo.ts`) so the curated tasks/statuses stay consistent; real prayer times + Hijri are fetched for that date. Point `PrayerTimesProvider` at the real today to go fully live.
- **Deferred (intentionally NOT built):** Track, Muhāsaba, Tasks tabs, calendar, the re-plan agent — and a per-language `<Text>` wrapper for the Hanken/Amiri font stack on **native** (the comma stack works on web today).
