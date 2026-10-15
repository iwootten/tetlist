---
name: fetch-yt-tetlist
description: Fetch a DJ set tracklist from a YouTube video into the tetlist project. Uses yt-dlp (no API key) to read the video title, description, chapters and comments, picks the fullest / most timestamped tracklist, and writes data/<slug>.yaml with title + source + tracks but no Bandcamp/Beatport links yet. Use when the user gives a YouTube URL and wants a tracklist scaffolded, before resolving shop links.
---

# fetch-yt-tetlist

Scaffold a tetlist data file from a YouTube DJ set. This is the first step of the
pipeline: it produces `data/<slug>.yaml` with the tracklist only. Run the
`add-tracklist` skill afterwards to add Bandcamp/Beatport links and the markdown
mirror.

## Requirements

- `yt-dlp` on `PATH`. No YouTube API key or OAuth needed.
- Comments enabled on the video (or a tracklist in the description / chapters).

## Usage

```bash
node .agents/skills/fetch-yt-tetlist/scripts/fetch-yt-tetlist <youtube-url>
```

Flags:

- `--slug <slug>` — explicit output filename. Reuse an existing set's slug to overwrite in place (e.g. `--slug four-tet-way-out-west-2026`).
- `--title <title>` — override the YAML title (default: the video title).
- `--dry-run` — print the YAML instead of writing it.

Env:

- `DATA_DIR` — output dir (default `./data`).
- `YT_MAX_COMMENTS` — comments to fetch (default `200`).

## What it does

1. `yt-dlp --write-comments` → video title, description, chapters and top comments.
2. Builds candidate tracklists from the description, chapters and every comment, and scores them (track count + timestamps + likes).
3. Picks the best, then backfills any missing `time` / `artist` from another full list of the same length.
4. Parses `time — artist — title`; `w/ …` layers become their own track inheriting the parent's time; header/chat lines are skipped.
5. Writes `data/<slug>.yaml` (`title`, `source`, `duration`, `tracks[]` with `number`, `time`, `artist`, `title`) — **no `bandcamp`/`beatport`**.

## Output format

- **YAML**: `title`, `source`, `duration` (`H:MM:SS`, from the video length), `tracks[]` with `number`, `time` (optional), `artist`, `title`. Strings are double-quoted UTF-8.

## Notes

- The output is a first pass — skim it. Unreleased IDs keep their `[Unreleased]` markers, and a comment may spell an artist differently (e.g. `Joy O` vs `Joy Orbison`).
- The slug comes from the video title, which often includes a date. Pass `--slug` to match the project's naming (e.g. `four-tet-way-out-west-2026`).
- Comments are fetched top-sorted; a pinned channel comment is usually the canonical tracklist.

## Related

- `add-tracklist` — enriches the YAML with Bandcamp/Beatport links and writes the markdown mirror in `~/Documents/mixes`.
