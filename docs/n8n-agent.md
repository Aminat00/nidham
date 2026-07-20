# Nidham agent — n8n webhook setup

The app already talks to the agent through **one module** (`src/agent/runAgent.ts`). In
`webhook` mode it POSTs a JSON payload to your n8n webhook and renders the JSON that
comes back. Your model key stays on the n8n server — never in the app.

## 1. The contract

### Request (app → n8n), `POST` JSON body

```jsonc
{
  "capture": "buy train tickets, plan my move from poland, call the dentist",
  "context": {
    "now": "2026-07-20T13:02:00+03:00",   // ISO 8601 with offset
    "lang": "en",                          // "en" | "tr" | "ar"
    "prayerTimes": { "fajr": "03:51", "dhuhr": "13:15", "asr": "17:13", "maghrib": "20:39", "isha": "22:21" },
    "existingItems": [ { "id": "x_thesis", "title": "Thesis — outline lit-review", "window": "dhuhr" } ]
  }
}
```

### Response (n8n → app), JSON body

```jsonc
{
  "summary": "3 things captured — scheduled around your prayers.",
  "items": [
    {
      "id": "gen-1", "title": "Call the dentist", "category": "errand",
      "day": "2026-07-21", "window": "dhuhr", "sortTime": "13:20",
      "urgency": "soon", "energy": "admin", "status": "pending"
    },
    {
      "id": "gen-2", "title": "Plan my move from Poland", "category": "project",
      "day": "2026-07-21", "dueDate": "2026-07-28", "window": "anytime",
      "sortTime": "10:00", "urgency": "soon", "energy": "deep", "status": "pending",
      "steps": [
        { "id": "gen-2a", "title": "List what to bring", "parentId": "gen-2", "category": "step", "startHere": true },
        { "id": "gen-2b", "title": "Message my brother",  "parentId": "gen-2", "category": "step" }
      ]
    }
  ]
}
```

**Item fields** — the app's single data model (`src/types/item.ts`):

| field | type | notes |
|---|---|---|
| `id` | string | unique; stable so re-captures upsert |
| `title` | string | in `context.lang` |
| `category` | `prayer\|tesbihat\|wird\|task\|project\|step\|errand` | |
| `day` | `YYYY-MM-DD` | |
| `window` | `fajr\|morning\|dhuhr\|afternoon\|asr\|maghrib\|isha\|evening\|anytime` | prayer-anchored |
| `sortTime` | `HH:mm` | ordering within the day |
| `urgency` | `now\|today\|soon\|someday` | |
| `energy` | `deep\|light\|admin` | |
| `dueDate` | `YYYY-MM-DD?` | optional |
| `parentId` | string? | set on steps → their project |
| `steps` | nested step items? | projects only (see example) |
| `startHere` | boolean? | the first step |
| `status` | `pending\|now\|done\|pushed` | new items = `pending` |
| `protected` | boolean? | prayers + protected projects |
| `note` | string? | e.g. `"Admin · 5 min"` |

The app tolerates the response being wrapped (`{output}` / `{data}` / `{json}` / `{result}` / `{response}` / a one-element array) — n8n's usual envelopes are unwrapped automatically.

## 2. Point the app at it

Copy `.env.example` → `.env`:

```
EXPO_PUBLIC_AGENT_MODE=webhook
EXPO_PUBLIC_AGENT_URL=https://<your-n8n-host>/webhook/nidham
```

Restart the dev server (env vars are inlined at build time). If unset or the call
fails, the app falls back to a built-in plan, so it never breaks.

## 3. Build the flow

Import [`nidham-agent.n8n.json`](./nidham-agent.n8n.json) into n8n (Workflows → Import
from File). It contains:

1. **Webhook** (`POST /nidham`) — receives the payload.
2. **HTTP Request → Anthropic Messages API** — sends the verbatim orchestrator system
   prompt (Triage → Planner → Breakdown) with the payload as the user message. Add your
   Anthropic credential to this node.
3. **Code** — extracts the model's text and `JSON.parse`s it into `{ summary, items }`.
4. **Respond to Webhook** — returns that JSON.

The orchestrator system prompt lives in `src/agent/systemPrompt.ts` (also embedded in
the workflow's HTTP node) — keep the two in sync if you edit it.

Swap the Anthropic node for OpenAI/Gemini/etc. freely — the app only cares about the
response shape, not which model produced it.

## 4. The Project agent (interview → plan)

The Tasks/Projects flow uses a **second** swappable module, `src/agent/runProjectAgent.ts`,
that runs the adaptive interview. It shares the same env config (`EXPO_PUBLIC_AGENT_MODE`,
`EXPO_PUBLIC_AGENT_KEY`) and, by default, the same webhook URL — or set a dedicated one:

```
EXPO_PUBLIC_PROJECT_AGENT_URL=https://<your-n8n-host>/webhook/nidham-project
```

Requests carry `"agent": "project"` so one webhook can branch to the right prompt.

### Request (app → n8n)

```jsonc
{
  "agent": "project",
  "conversation": [
    { "role": "user",  "text": "I want to start a solo AI business" },
    { "role": "agent", "text": "What would done look like in 30 days?" },
    { "role": "user",  "text": "one paying customer" }
  ],
  "context": { "now": "…", "lang": "en", "prayerTimes": { … }, "existingItems": [ … ] }
}
```

### Response (n8n → app) — ONE of

```jsonc
{ "type": "ask", "question": "…one question in context.lang…" }
```
```jsonc
{
  "type": "plan",
  "summary": "Here’s a plan — start with the first step.",
  "project": {
    "title": "Solo AI business",
    "milestones": [
      { "title": "Validate the idea", "steps": [
        { "title": "Write the one-line pitch", "startHere": true },
        { "title": "List 5 people to ask" }
      ] },
      { "title": "First paying customer", "steps": [ { "title": "Draft an offer" } ] }
    ]
  }
}
```

Rules the prompt enforces (see `src/agent/projectSystemPrompt.ts`): ask a follow-up only
when the goal is vague, **max 3 questions**, then emit a plan of 2–4 milestones each with
2–4 tiny steps and **exactly one** `startHere`. The app caps the interview at 3 answers
and, as always, falls back to a built-in interview + plan if the call fails — so the flow
never breaks. Common n8n envelopes (`output`/`data`/`json`/`result`/array) are unwrapped
automatically, same as the capture agent.
