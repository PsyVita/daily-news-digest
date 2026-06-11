# Morning Brief 🐟

A static, mobile-first daily briefing site (tech · AI · cybersecurity · law) built with [Astro](https://astro.build). A new markdown file committed each morning is the **only** thing that ever changes — the site requires zero code changes for daily updates and is designed to stay clean after thousands of briefings.

## How daily updates work

An automated agent (Claude, running in Cowork) researches the news every morning at **4:00 AM** (the schedule lives on the Cowork side, not in this repo) and commits one file via the GitHub API:

```
briefings/YYYY/MM/DD.md
```

Vercel auto-deploys on every push to `main`. That's the whole pipeline. No index files, no manifests, no code edits — all date lists, the latest-briefing pointer, and the calendar data are derived at build time by scanning `briefings/`.

### Contract between the generator and the site

The generator promises / the site assumes:

- **One file per day**, at the correct nested path `briefings/YYYY/MM/DD.md`, with frontmatter `date` matching the path.
- **Create-only** (or idempotent same-day overwrite). It never edits other files.
- Markdown sections as described below; sections may occasionally be missing.
- Days may be skipped entirely — gaps are normal and the UI handles them.

## Briefing file format

```markdown
---
date: 2026-06-12          # ISO date, must match the file path
topStory: "One-line headline for previews and meta description"
funFact: "Short title for the fun fact"
---

## Top story
One- or two-sentence lead. [Source](https://...)

## Technology
- **Headline** — 1–2 sentence summary. [Source](https://...)

## AI
...

## Cybersecurity
...

## Law
...

## Tech law
...

## Fun fact
A single self-contained paragraph (~80–150 words). May include one source link.
```

The site is tolerant of imperfect content:

- Missing sections are simply not rendered.
- Missing `topStory` falls back to the first heading; missing `funFact` falls back to `"Fun fact"`.
- A malformed file logs a build warning and is skipped — it never breaks the build. The date is always derived from the **file path**, which is authoritative.
- Dates are plain calendar dates. No timezone math happens anywhere; `YYYY-MM-DD` is never parsed through `new Date(string)`.

## Folder rules (do not violate)

1. Briefings live at `briefings/YYYY/MM/DD.md` — never a flat folder.
2. The daily automation only ever creates one new file (or overwrites the same day's file on a re-run). No file in the repo is edited daily.
3. All indexes are derived at build time by scanning `briefings/`. There is no manually-maintained or daily-updated index/manifest file — and there must never be one.
4. Site code must not need modification as content grows. Briefing #2,000 works identically to briefing #2.

## Architecture

- **Astro, fully static** (`output: 'static'`). One page per briefing day via `getStaticPaths`; `/` renders the latest briefing inline.
- **Custom content loader** ([src/lib/briefings-loader.ts](src/lib/briefings-loader.ts)) scans `briefings/` recursively with per-file error tolerance.
- **Calendar navigator** ([src/components/Calendar.astro](src/components/Calendar.astro)) is the only JavaScript on the page — a small vanilla island. It lazy-loads `/dates.json` (a build-time generated index of `{date, topStory, funFact}`) on first open, never in the critical path.
- **PWA**: web manifest + icons; installable from a phone browser. No service worker, so deployed content is never stale.
- Dark mode follows `prefers-color-scheme` with a manual toggle persisted in `localStorage`.
- **Day-of-week palettes** (Thai day colors): each briefing page's accent color follows its weekday — red Sunday, yellow Monday, pink Tuesday, green Wednesday, orange Thursday, blue Friday, purple Saturday. Defined in [src/styles/global.css](src/styles/global.css) via `data-day` on `<html>`; tints are derived with `color-mix`, so each day only overrides two hue tokens per theme.

## Local development

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # static build into dist/
npm run preview    # serve the production build
```

## Deployment

The repo is connected to Vercel (framework preset: **Astro**), auto-deploying on every push to `main`. To verify the pipeline end-to-end, commit a new `briefings/YYYY/MM/DD.md` and push — it should appear on the live site with no other change.

## Future escape hatch (documented, not implemented)

Build time grows linearly with the number of briefings. Astro builds thousands of small markdown pages in seconds, so this is fine for years. If builds ever exceed ~5 minutes:

1. Switch `astro.config.mjs` to `output: 'server'` with the Vercel adapter.
2. Render `[year]/[month]/[day].astro` and `dates.json` on demand instead of at build time.
3. Nothing about the content layout or the daily automation needs to change.

Other clean seams left for later: RSS (derive from the same collection), search (index `dates.json` client-side or build a static index), and a service worker (use network-first for pages if added).
