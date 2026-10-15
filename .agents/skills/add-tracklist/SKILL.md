---
name: add-tracklist
description: Add a DJ mix tracklist to the tetlist project. Given a source URL, mix title, and tracklist, resolve Bandcamp and Beatport links (reusing known ones from the project's data/ directory first) and generate the markdown file in ~/Documents/mixes and the YAML data file in the project's data/ directory. Use when the user provides a tracklist to add, or asks to update ~/dev/ai/tetlist/data.
---

# Add a tracklist to tetlist

## Inputs

Gather three things from the user:

1. **title** — e.g. `Four Tet — CORE Los Angeles`
2. **source** — the YouTube/mix URL
3. **tracklist** — list of `time — artist — track` lines

## Workflow

1. Parse the tracklist into tracks, each with optional `time`, `artist`, `title`. Build an input JSON file with `bandcamp` and `beatport` left blank for now:

```json
{
  "title": "Four Tet — CORE Los Angeles",
  "artist": "Four Tet",
  "source": "https://www.youtube.com/watch?v=eptx0P-l9TE",
  "duration": "1:00:07",
  "event": "CORE Los Angeles",
  "slug": "four-tet-core-los-angeles",
  "tracks": [
    { "time": "0:15", "artist": "Four Tet", "title": "Maybe?" },
    { "time": "11:00", "artist": "Four Tet", "title": "Plastic People (2026 Mix)" }
  ]
}
```

   Capture the set **duration** from the source video — it is a required field and always available:

   ```bash
   yt-dlp --skip-download --no-warnings --print "%(duration)s" "<source-url>"
   ```

   Convert the seconds to `H:MM:SS` (e.g. `15861` → `4:24:21`) and add it to the input JSON as `duration`.

2. **Check known tracks first** — run the resolver from the tetlist project root:

```bash
node .agents/skills/add-tracklist/scripts/resolve-known.mjs /tmp/input.json
```

It scans `data/*.yaml` and fills in any `bandcamp` and `beatport` URLs we already know for a matching `artist` + `title` (match is case/punctuation-insensitive). It overwrites the input file and prints the tracks that still need research.

3. **Research only the remaining tracks** on Bandcamp and Beatport. Add a `bandcamp` / `beatport` URL to each track that exists on that platform; leave the field out otherwise. Keep editing the same input JSON.

   - **Bandcamp**: web search / fetch, or curl `*.bandcamp.com`. Prefer a track URL, but a release/album URL is fine when only the album/EP exists. Edits and remixes often have no Bandcamp release — leave blank, or link the original when that is all that exists.
   - **Beatport**: web search `<artist> <track> beatport`. Beatport search pages are JS-only, so `web_fetch` a **track** or **release** page directly to confirm the artist/title before using it.
     - If search is unavailable, fetch Beatport's public sitemap index:
       `https://storage.googleapis.com/beatport-production-sitemap/sitemap/index_bp.xml`.
       It lists 400+ track shards of 50k URLs each. The shards are ordered by track ID, so a cheap `Range: bytes=0-1500` request per shard reveals its first ID; then download only the shard(s) overlapping the relevant era and grep for the slug. Approx. Beatport track IDs: ~15M = 2021, ~17M = 2022, ~18M = 2023, ~19M = 2024).
     - Prefer track URLs; fall back to release URLs.
   - **Verify every URL** (a `404` slug or the wrong artist means don't use it). Leave the field blank for bootlegs/unofficial edits, unreleased IDs, or tracks genuinely not on the platform.

4. **Generate the files**:

```bash
node .agents/skills/add-tracklist/scripts/add-set.mjs /tmp/input.json
```

It writes:

- `~/Documents/mixes/<slug>.md`
- `~/dev/ai/tetlist/data/<slug>.yaml`

## Output format

- **Markdown**: `# <title>` + optional `Source:` line + a table. Columns are `# | Time | Artist | Track | Bandcamp | Beatport`; the `Time` column is omitted when no track has a timestamp.
- **YAML**: `title`, `artist` (required), `event` (optional), `date` (optional), `source`, `duration` (required, `H:MM:SS`), `tracks[]` with `number`, `time` (optional), `artist`, `title`, `bandcamp` (optional), `beatport` (optional). Strings are double-quoted UTF-8.

## Slug

Derive a clean slug from the title (lowercase, hyphens, keep the year), e.g. `four-tet-boomtown-2026`. Pass `slug` explicitly when the title has commas or full dates you want to shorten (e.g. `four-tet-alexandra-palace-2025` instead of `four-tet-alexandra-palace-22nd-november-2025`).

## Notes

- Reuse of known links is best-effort: `resolve-known.mjs` matches on normalized `artist | title`, so aliases (`Joy O` vs `Joy Orbison`) still need manual research and will be picked up automatically for future sets once added.
- When a track has a link, make the title match the release where practical (e.g. `Baby again.. (feat. Skrillex & Four Tet)`), but keep a `(w/ …)` mashup annotation when the layered track is not obvious from the main title (e.g. `leavemealone (w/ … Baddadan …)`).
- The Astro content schema in `src/content.config.ts` must declare `bandcamp` / `beatport` (as optional strings) for the site to use them; unknown keys are stripped by Zod.
- To update an existing set, reuse its existing slug so the files are overwritten in place.
- Override output dirs with env vars `MIXES_DIR` and `DATA_DIR` if needed.
