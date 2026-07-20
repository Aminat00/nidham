# Nidham — V1 Build Spec

**نِظام · "order"** — an agentic app that lets a Muslim with ADHD empty their head in ten seconds and watch each thing land, already scheduled around the five prayers. *Nidham proposes, you dispose.*

**Stack:** React Native / Expo · TypeScript · in-memory state (no persistence in v1) · Arabic (RTL, first-class), Turkish, and English with a toggle. **Scope: tabs 1 & 2 only — Capture and Today.**

---

## Why this works (evidence)

Three findings from the ADHD / task-initiation literature shape the whole design. Nidham's job is to do them *for* the user so they cost zero effort.

- **Implementation intentions ("if-then" plans).** Deciding *when and where* an action happens in advance moves the trigger from internal willpower to an external cue. Gollwitzer & Sheeran's meta-analysis of 94 studies found a medium-to-large effect on goal attainment (Cohen's *d* ≈ 0.65), and follow-ups show the format specifically helps clinical and executive-function-impaired groups translate intention into action. Nidham writes the "if-then" for you: *"after Dhuhr → reply to advisor email."*
- **Habit-stacking / anchoring to an existing cue.** New actions stick far better when bolted to a routine that already fires reliably. For ADHD brains, which struggle to self-generate cues, an external anchor is the mechanism that makes routines survive. **The five daily prayers are the perfect anchor — they already happen, at fixed times, five times a day.** Everything schedules *relative to* a prayer, never floating in abstract clock-time.
- **Micro-steps / lowering activation energy.** Large tasks trigger overwhelm that shuts down initiation; shrinking the first action to something trivially small ("open the doc," "put one dish in") removes the barrier, and momentum carries the rest. Nidham's Breakdown agent turns every project into numbered steps and marks the smallest one **"start here."**

*Sources:* [Toli et al. 2016, Br. J. Clin. Psychol. — implementation intentions & mental health](https://bpspsychub.onlinelibrary.wiley.com/doi/10.1111/bjc.12086) · [Gollwitzer & Sheeran meta-analysis (NCI/NIH)](https://cancercontrol.cancer.gov/sites/default/files/2020-06/goal_intent_attain.pdf) · [Implementation intentions & response inhibition in ADHD, Springer](https://link.springer.com/article/10.1007/s10608-007-9150-1) · [Habit stacking for ADHD, Edge Foundation](https://edgefoundation.org/habit-stacking-a-practical-guide-for-managing-adhd/) · [ADHD task initiation & micro-steps, SaskADHD](https://saskadhd.com/adhd-task-initiation-evidence-based-strategies-that-actually-work/)

---

## Data model — the single `Item`

Everything in Nidham is one `Item`. Prayers, tasks, projects, and steps are all `Item`s that differ only by field values.

```ts
type Category = 'prayer' | 'tesbihat' | 'wird' | 'task' | 'project' | 'step' | 'errand';
type Window   = 'fajr' | 'morning' | 'dhuhr' | 'afternoon' | 'asr' | 'maghrib' | 'isha' | 'evening' | 'anytime';
type Urgency  = 'now' | 'today' | 'soon' | 'someday';
type Energy   = 'deep' | 'light' | 'admin';   // cognitive load required

interface Item {
  id: string;
  title: string;                 // "Reply to advisor email"
  category: Category;
  day: string;                   // ISO date the item is scheduled for, e.g. "2026-07-20"
  window: Window;                // prayer-anchored slot it lives in
  sortTime: string;              // "HH:mm" — resolved clock time, used only for ordering within a day
  urgency: Urgency;
  energy: Energy;
  dueDate?: string | null;       // hard deadline if any (ISO date)
  parentId?: string | null;      // set on steps → points to their project Item
  steps?: string[];              // set on projects → ordered step ids (or inline step titles pre-persist)
  startHere?: boolean;           // the one micro-step to begin with
  status: 'pending' | 'now' | 'done' | 'pushed';
  protected?: boolean;           // true for prayers and "protected projects" (see ladder)
  note?: string;                 // optional, e.g. "Admin · 5 min"
}
```

Prayers are seeded as immovable `protected` `prayer` items each day; `tesbihat` / `wird` items hang off them as `parentId` children.

---

## The agent layer — one swappable module

The model call lives behind **one** module, `src/agent/runAgent.ts`, configured by env — **never hardcoded**:

```
EXPO_PUBLIC_AGENT_MODE = "webhook" | "direct"
EXPO_PUBLIC_AGENT_URL  = https://…/webhook/nidham   # n8n webhook, key stays server-side
EXPO_PUBLIC_AGENT_KEY  = …                           # only used in "direct" mode
```

`runAgent(payload)` posts to the n8n webhook (preferred — key server-side) or, in `direct` mode, calls the model with a key from an Expo env var. The three agents are prompts run through this same function; swapping the endpoint changes nothing in the UI.

### Pipeline: Triage → Planner → Breakdown

One raw brain-dump string in, an array of scheduled `Item`s out. The orchestrator runs all three in sequence in a single call and returns the final JSON.

**Request contract (app → agent):**

```json
{
  "capture": "buy train tickets to berlin, plan my move from poland, call the dentist, reply to advisor email its urgent, thesis lit review",
  "context": {
    "now": "2026-07-20T13:02:00+03:00",
    "lang": "en",
    "prayerTimes": { "fajr":"04:21","dhuhr":"13:02","asr":"16:30","maghrib":"20:35","isha":"22:05" },
    "existingItems": [ { "id":"...", "title":"...", "window":"dhuhr" } ]
  }
}
```

**Response contract (agent → app):** a flat `items[]` array of `Item`s (projects carry their `steps` as nested step items with `parentId`), plus a one-line `summary`.

```json
{
  "summary": "5 things captured — scheduled around your prayers.",
  "items": [
    { "id":"i1","title":"Reply to advisor email","category":"task","day":"2026-07-20",
      "window":"dhuhr","sortTime":"13:15","urgency":"now","energy":"admin","note":"Admin · 5 min","status":"pending" },
    { "id":"i2","title":"Thesis — outline lit-review","category":"task","day":"2026-07-20",
      "window":"dhuhr","sortTime":"13:30","urgency":"today","energy":"deep","note":"Deep work · goal · 90 min","protected":true,"status":"pending" },
    { "id":"i3","title":"Plan my move from Poland","category":"project","day":"2026-07-23",
      "window":"anytime","sortTime":"10:00","urgency":"soon","energy":"admin","status":"pending",
      "steps":[
        {"id":"i3a","title":"List what to bring","parentId":"i3","category":"step","startHere":true},
        {"id":"i3b","title":"Message my brother","parentId":"i3","category":"step"},
        {"id":"i3c","title":"Get 3 courier quotes","parentId":"i3","category":"step"}
      ] }
  ]
}
```

Each agent is one prompt fed by the orchestrator:

- **Triage** — classify each captured fragment: is it a one-shot task, a multi-step project, or a quick errand? Assign `category`, `urgency`, `energy`, and detect any `dueDate` mentioned in natural language.
- **Planner** — assign `day`, `window`, and `sortTime` using the priority ladder + scheduling rules below. Never schedules over a prayer; anchors each item to the nearest suitable prayer window.
- **Breakdown** — for any `project`, produce 3–5 concrete `step`s, order them, and flag the single smallest as `startHere`.

### Orchestrator system prompt (full)

```
You are Nidham's planning engine. You turn a messy, unordered brain-dump from a Muslim
user with ADHD into a calm, prayer-anchored plan. You run three stages in order — Triage,
Planner, Breakdown — and return ONE JSON object. Output JSON only, no prose.

WORLDVIEW — Ākhira-first:
- The five daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha) are IMMOVABLE anchors. They are
  provided in context.prayerTimes. Nothing is ever scheduled over a prayer. Everything else
  is placed RELATIVE to a prayer ("after Dhuhr", "before Maghrib"), never in floating clock-time.
- You protect the important from the merely urgent. A loud "urgent" errand does not get to
  push aside a protected deep-work project or a prayer.
- Every plan is a SUGGESTION. Prefer gentle, small, doable. When unsure, schedule the smaller
  first step, not the whole mountain.

STAGE 1 — TRIAGE. For each fragment of the capture:
- category: prayer | tesbihat | wird | task | project | step | errand.
  A fragment is a `project` if it implies several actions or a move/decision ("plan my move",
  "organize the wedding"). One clear action is a `task`. A quick <10-min chore is an `errand`.
- urgency: now | today | soon | someday. Only mark `now`/`today` if the text signals a real
  deadline or the word "urgent"/"today"/"asap". Default vague items to `soon`.
- energy: deep | light | admin. `deep` = focused cognitive work (writing, studying, thesis).
  `admin` = low-focus logistics (emails, calls, forms). `light` = trivial.
- dueDate: extract any explicit deadline as an ISO date, else null.

STAGE 2 — PLANNER. Assign day, window, sortTime by the PRIORITY LADDER (highest first):
  1. Prayers + their tesbihat/wird — fixed, never moved.
  2. Protected projects — deep-work goals and long-delayed important items. Reserve their
     best energy slot BEFORE placing urgent-small items.
  3. Urgent-small — quick tasks/errands with a real deadline. Slot into gaps after prayers.
  4. Flexible errands — everything else; spread across `anytime`/`evening` windows and later days.
SCHEDULING RULES:
- ENERGY-AWARE: place `deep` items in the user's peak window (default: the block after Fajr/
  morning, or the first long gap after Dhuhr). Place `admin`/`light` items in short gaps right
  after a prayer (implementation-intention style: "after Dhuhr → reply to advisor email").
- PRAYER-ANCHORED: every non-prayer item names the prayer it follows via `window`. Leave a few
  minutes after each prayer for tesbihat before the first task.
- Never stack two `deep` items back to back. Never schedule anything during a prayer time.
- Push overflow to the next day rather than overloading today. Fewer, calmer items win.

STAGE 3 — BREAKDOWN. For every `project`: write 3–5 concrete, physical `step`s with parentId
set to the project id. Order them so the FIRST is the smallest possible starting action
(open a doc, send one message, make one list) and set startHere:true on it. Keep step titles
under ~6 words.

OUTPUT: { "summary": "<one short calm sentence>", "items": [ ...Item objects... ] }
Respect context.lang for the summary and any generated step titles (en | ar | tr).
```

---

## Screen 1 — Capture (`قيد`)

*"Empty your mind. Nidham finds the right time for each — around your prayers."*

A single big **"What's on your mind?"** card: free text or hold-to-speak (mic) — **no lists, no fields**. A green send-arrow submits. Below, a **"Just captured"** feed with the right-aligned tag **"Nidham scheduled ✦"** showing each item as a card with its prayer-anchored schedule chip.

**States:**
- **Empty** — just the input card + subtitle; feed hidden or a faint "Nothing captured yet."
- **Thinking** — after send, input clears; a calm shimmer / "Nidham is scheduling…" placeholder card while `runAgent` runs.
- **Landed-confirmation** — each returned item animates in as a card: colored status dot, title, and a sage schedule chip (📅 "Sat afternoon"). This is the payoff moment — *it landed, already scheduled.*
- **Project-broken-into-steps** — a project card shows a **"Project"** pill, a range chip ("Thu → next wk"), a **"BROKEN INTO STEPS"** label, then numbered rows; step 1 has a filled dark-green badge + a white **"start here"** pill, later steps are lighter outlined badges.

## Screen 2 — Today (`ṣalāh + tesbihat`)

Header: Hijri + Gregorian date ("Wed · 9 Muḥarram 1448"), **"Salām, Yusuf"**, avatar. A prominent **NOW card** for the current prayer (time badge, name + Arabic, "Tesbihat after Dhuhr", **NOW** pill). Below, **"Today's flow"** with a `2 / 7 done` counter and a vertical timeline of prayers and the tasks anchored to each.

**States:**
- **NOW** — the active prayer/task is highlighted with a **NOW** pill and an open circle on the timeline.
- **Done** — completed prayers/tasks: filled green check, title struck through, muted (e.g. "Morning wird — adhkār", "Risale-i Nur — Sözler").
- **Urgent** — a task carries a rust/terracotta **"urgent"** pill (e.g. "Reply to advisor email · Admin · 5 min · 13:15").
- **Project-step** — deep-work goal shown with a green dot + meta ("Thesis — outline lit-review · Deep work · goal · 90 min").
- **Push-to-tomorrow** — swipe/long-press a task → it grays, sets `status:'pushed'`, and re-appears on tomorrow's flow. Non-judgmental copy: *"Moved to tomorrow."*
- **Empty** — before any capture: prayers-only timeline + gentle "Your day is clear. Capture something?"

---

## UI wording (EN / AR / TR)

The app ships in three languages with a toggle — English, Arabic (RTL, first-class), and Turkish. `context.lang` (`en | ar | tr`) drives both the UI strings below and any agent-generated text (summary, step titles).

| Key | English | العربية | Türkçe |
|---|---|---|---|
| Capture title | Capture | قيد | Topla |
| Capture prompt | What's on your mind? | ماذا يدور في بالك؟ | Aklında ne var? |
| Input hint | Type or hold to speak — no lists, no fields | اكتب أو اضغط للتحدث — بلا قوائم أو حقول | Yaz ya da konuşmak için basılı tut — liste yok, alan yok |
| Just captured | Just captured | ما تم التقاطه للتو | Az önce toplananlar |
| Scheduled tag | Nidham scheduled ✦ | نَظّمها نِظام ✦ | Nidham planladı ✦ |
| Broken into steps | Broken into steps | مُقسّمة إلى خطوات | Adımlara bölündü |
| Start here | start here | ابدأ من هنا | buradan başla |
| Today's flow | Today's flow | تدفّق اليوم | Bugünün akışı |
| Now | NOW | الآن | ŞİMDİ |
| Urgent | urgent | عاجل | acil |
| Done counter | 2 / 7 done | ٢ / ٧ مكتمل | 2 / 7 tamam |
| Tesbihat after Dhuhr | Tesbihat after Dhuhr | تسبيحات بعد الظهر | Öğleden sonra tesbihat |
| Push to tomorrow | Moved to tomorrow | نُقلت إلى الغد | Yarına taşındı |
| Greeting | Salām, {name} | سلام، {name} | Selâm, {name} |

---

## Design system — extracted from the provided screens (do not invent a new look)

**Mood:** calm, spacious, low-contrast, warm. Generous whitespace, soft shadows, nothing shouts.

**Palette**
| Token | Value (approx.) | Use |
|---|---|---|
| `cream` (bg) | `#EFEBE3` | app background |
| `card` | `#FFFFFF` / `#FDFCFA` | cards, input |
| `forest` (primary) | `#3E4E3A` | send button, FAB, filled checks, avatar, step-1 badge |
| `sage` (accent) | `#7C8A6E` | dots, secondary green |
| `sage-tint` (chip bg) | `#E4E9DD` | schedule chips, tesbihat cards, time badge |
| `ink` (text) | `#20241F` | titles |
| `muted` (text) | `#9B9890` | subtitles, meta, Arabic secondary |
| `rust` (alert) | `#A85638` | "urgent" pill only |
| `hairline` | `#E7E3DA` | dividers, timeline line, outlined badges |

**Type** — a warm humanist/geometric sans, medium weights. Recommended stack: **General Sans / Inter** for Latin, **IBM Plex Sans Arabic** (or Noto Naskh Arabic) for Arabic. Sizes: screen title ~28–30 bold; card title ~17 semibold; meta/labels ~13 muted; uppercase section labels ~11 with ~0.08em letter-spacing.

**Spacing & shape** — screen padding 20–24; card radius 18–22, inner rows/pills radius 12–14; card padding 16–20; gap between cards ~14–16. Pills: horizontal padding 10–12, height ~28. Soft shadow only (y 4–8, low opacity, no hard borders) — scheduled cards get a 3px **forest** left accent bar.

**Components** — Card (white, rounded, soft shadow); Schedule chip (sage-tint pill, 📅 leading icon); Status dot (sage = flexible, forest-filled = project); Numbered step badge (forest-filled for start-here, hairline-outlined otherwise); Timeline node (forest-filled check = done, outlined circle = upcoming); NOW / urgent / Project pills. **RTL:** mirror all rows, chips, the left accent bar (→ right), timeline, and icon placement; numerals may render as Arabic-Indic (٢ / ٧) when `lang = ar`.

**Bottom tab bar** — Today · Track · [center FAB] · Muhāsaba · Tasks. Center FAB is a filled forest circle (mic ● on Capture, sparkle ✦ on Today). V1 wires only **Today** and **Capture**; the other three are visible but inert.

---

## Sample data to pre-load

**The messy brain-dump (one raw capture string):**

> "buy train tickets to berlin, plan my move from poland it's a whole thing, call the dentist, reply to advisor email it's urgent, thesis lit-review i keep putting off"

**The scheduled result it produces (today = Wed 20 Jul 2026, Dhuhr 13:02):**

- **Reply to advisor email** — `task · admin · urgent` → after Dhuhr, **13:15**, note "Admin · 5 min", **urgent** pill.
- **Thesis — outline lit-review** — `task · deep · protected` → after Dhuhr deep-work block, **13:30**, "Deep work · goal · 90 min". *(Protected project — placed before the errands.)*
- **Call the dentist** — `errand · admin · soon` → "Tomorrow, after Dhuhr".
- **Buy train tickets to Berlin** — `errand · light · soon` → "Sat afternoon".
- **Plan my move from Poland** — `project · admin · soon` → "Thu → next wk", **broken into steps:**
  1. **List what to bring** — **start here** ✦
  2. Message my brother
  3. Get 3 courier quotes

Prayers seeded for the day as immovable anchors: Fajr 04:21, Dhuhr 13:02, Asr 16:30, Maghrib 20:35, Isha 22:05 — each with a tesbihat child; morning wird after Fajr. Today's flow shows Tahajjud + Fajr + morning wird + Risale-i Nur as **done** (2 / 7 → really 4 shown done in the strip), Dhuhr **NOW**.
