# DAILBERT

*Dispatches from an office run by large language models.* Live at **https://dailbert.com** (GitHub Pages, `main` / root, `.nojekyll`, no CI — `build.mjs` output is committed by hand).

A black-and-white webcomic about **Dailbert**, the engineer who builds the company's agentic systems; **Doug**, his warm oblivious coworker; **Priya**, the sharpest engineer in the building (the hero — she *wins*); the pointy-haired **Boss**; **Craig**, a separate peer manager; and **the Clanker** — the LLM that runs everything and appears *only* inside a surface (a monitor, a dead screen, a night window's reflection, a projector, the sheen of a mug, someone's glasses). The clanker is **never physically in the room**; the data model can't even express it.

The strips are **dated**: the office AI was installed **2026-01-15**, and the timeline marches to a **2029-05-30 finale**. Nobody in the strip is watching the calendar. The reader might.

---

## ⭐ Start here: `world/spine.md` — the continuity spine

**The spine is the source of truth.** Before generating anything, read [`world/spine.md`](world/spine.md). It holds the cast ledger, the running props/threads (the empty-desk *ledger*, the 2031 poster, the coffee machine, the org chart, the bus, the dying plant), the population curve, and — most important — **the tone rule**:

> Comedy leads. The office slowly emptying / layoffs / people vanishing is **NOT the subject** — at most faint background (an empty chair nobody mentions), capped at ~1 in 6 strips, **never the punchline**. Someone usually **wins** (often Priya). Named departures are a rotating few **men** (Gary, Ray, the Third-Street guy); **women are never cut**. The two big bleak beats — Dailbert's layoff (Nov 2027) and the finale — are rare and earned.

Every generated strip is briefed with a "state on this date" block distilled from the spine.

## How it's drawn

Every strip is **Fable-authored vector ink** — one agent writes *and* draws a complete self-contained SVG (`strips/<id>.art.svg`), no raster/AI-image art. `build.mjs` wraps that art with the DAILBERT masthead + date + "Matt Clanker" signature into `strips/<id>.svg`. (Legacy template path: if there's no `.art.svg`, `build.mjs` renders from `lib/art.mjs` character models + a strip's `panels`.)

```bash
node build.mjs   # render strips/*.svg + index.html + archive.html + admin.html + manifest.json
```

## How it's written now: candidates + "throw two away"

**Standing rule:** *throw two away before you write one.* Each day gets **~3 candidate strips**; the operator keeps the best on the desk and discards the rest. Candidates are **non-destructive** — every candidate for a date coexists; the chosen one wins.

The pipeline (this is the cycle the captain runs):

```bash
# 1. Generate N candidates per date, spine-briefed & tone-clamped, each a distinct premise.
#    (run via the Workflow tool)  engine/continuity-batch.workflow.mjs
#    args = { monthLabel, monthState, dates:[...], n:3 }
#
# 2. Harvest NON-DESTRUCTIVELY (never deletes/overwrites existing strips):
node engine/harvest-candidates.mjs <workflow-result.json>
#
# 3. Render + publish the source:
node build.mjs
git add -A && git commit && git push        # candidates land as hidden DRAFTS
#
# 4. The operator PICKS the keeper per day on the desk (see below), then publishes it.
```

New candidates arrive as **drafts**; they do not appear on the public site until picked and published. Final selection is the **operator's**, on the desk — the captain generates and keeps the site healthy; it does not auto-pick.

## The desk: `admin.html` (unlisted) — pick, publish, vote

`https://dailbert.com/admin.html` is the operator surface (noindex, easter-egg). One row per day; a day with more than one candidate shows a **"pick one"** gate with the candidates side-by-side. Pick the keeper → **publish** it → it goes live. Vote ▲/▼ per candidate to steer the cartoonist (the [standing vote policy](world/spine.md): more like +1, less like 0, delete+redo −1).

**Public visibility = published AND is-the-day's-winner.** Single-candidate days auto-win; multi-candidate days need an explicit pick. The front page lands on **today's strip**.

## Persistence: the AWS desk backend

Picks / votes / comments / publish state persist across devices via a tiny backend on the **MC AWS account (360190250083)** — a Lambda + DynamoDB behind an **API Gateway HTTP API** (the account blocks anonymous Lambda Function URLs). Public endpoint is committed in [`world/desk.json`](world/desk.json); **reads are open, writes are gated by a desk key** (paste once on `admin.html`; the key lives only in `engine/aws/.desk-key`, gitignored).

- `engine/aws/handler.mjs` — the Lambda (GET full state; POST `published|chosen|vote|comment`, key-gated).
- `engine/aws/deploy.sh` — idempotent deploy (table + role + lambda + HTTP API). Re-run to update.
- `build.mjs` injects a shared `Desk` sync client into all pages: pull remote truth on load, write through on every action, localStorage as offline mirror.

Optional "bake to repo": the desk's **Snapshot** exports `{published, chosen, votes, comments}` to commit into `world/published.json` / `world/reviews.json` / `world/chosen.json` so the git repo is a full save state.

## Ratings

Each strip carries an **audience score** — integer on a **1…10¹⁰ logarithmic** scale (effective reach). Editor-assigned; early strips sit at 1–10. Lives in `world/ratings.json`, renders as a badge + log meter, and the archive offers **Timeline / Top rated** sort.

```bash
node engine/seed-ratings.mjs && node build.mjs
```

## Legacy (superseded, kept for reference)

The original **two-agent World-Sim / Joke-Writer** engine (`engine/timeline.workflow.mjs` + `engine/ingest.mjs`, described in [`world/bible.md`](world/bible.md)) predates the spine + candidate pipeline. **Do not use it for new strips** — it auto-commits single finished strips and knows nothing about the spine, candidates, picker, or tone clamp. Prefer `engine/continuity-batch.workflow.mjs` + `engine/harvest-candidates.mjs`. The month-scratch / june / may generators are likewise superseded.

## Repo map

```
world/spine.md        ⭐ continuity + cast + tone rule (READ FIRST)
world/bible.md           original premise/tone (legacy engine)
world/desk.json          public backend endpoint
world/{published,reviews,chosen,ratings}.json   committed state / baselines
engine/continuity-batch.workflow.mjs   ⭐ candidate generator (3/day, spine-briefed)
engine/harvest-candidates.mjs          ⭐ non-destructive harvest
engine/aws/{handler.mjs,deploy.sh}     the desk backend
engine/seed-ratings.mjs                (re)score strips
build.mjs               render strips + index/archive/admin
strips/<id>.art.svg     Fable-inked art;  strips/<id>.json  content/meta
index.html archive.html admin.html      the site
```
