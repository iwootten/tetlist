# tetlist

A dark, left-aligned static site that lists Four Tet sets. Each set has a YouTube embed, a timestamped tracklist, and Bandcamp and Beatport links. The public site is https://tetlist.com.

## Stack

- Astro static site. Content lives in YAML under `data/` and is loaded as the `sets` collection.
- One global stylesheet, Instrument Sans, no component framework.
- Set pages load `src/scripts/player.js` for the YouTube IFrame API, player size, now-playing line, and current-row highlight.
- Built files deploy to Cloudflare Workers static assets (`astro build && wrangler deploy`). Custom domains are `tetlist.com` and `www.tetlist.com`.
- `site` in the Astro config is `https://tetlist.com`, which makes sitemap and Open Graph URLs absolute.

## Content

Each file in `data/*.yaml` is one set. The filename (without `.yaml`) is the URL slug.

| Field | Required | Used for |
| --- | --- | --- |
| `title` | yes | Visible heading, document title, and the index label |
| `source` | no | YouTube watch URL. Only the video id is used |
| `duration` | yes | Video length, shown on the index |
| `tracks` | yes | The track table |
| `event` | no | Stored, not shown |
| `date` | no | Stored, not shown |

`tracks` entries:

| Field | Required | Used for |
| --- | --- | --- |
| `number` | yes | Stored, not shown |
| `time` | yes | Cue time. `H:MM:SS`, `M:SS`, or a range such as `15:00–18:00` |
| `artist` | yes | Artist column and the now-playing line |
| `title` | yes | Title column and the now-playing line |
| `bandcamp` | no | `bc` link, and the preferred now-playing link |
| `beatport` | no | `bp` link, used for now-playing when there is no Bandcamp URL |

A `source` URL may include a `t=` playhead (Alexandra Palace does). That offset is ignored. Track times are positions from the start of the video, not from a saved playhead.

Titles split on the first ` — ` (em dash with spaces). Text before it is the artist. Text after it, including any further em dashes, is the set name. A title with no em dash is shown in full and has no separate artist crumb. A hyphen (` - `) is not a split.

Index order is the four-digit year at the end of the slug, newest first. Sets with the same year are ordered by slug.

## Pages

### All sets, `/`

Document title: `tetlist - Watch Four Tet sets, discover new tracks`.

Meta description, also used for Open Graph and Twitter when a page does not pass its own: `Watch Kieran Hebden sets find the source tracks`.

The breadcrumb is `All / Watch Four Tet sets, find new tracks`. `All` is the current page. There is no “Sets” heading and no visible description.

Each set is one link to `/sets/{slug}`:

- First line: the set name (the part after ` — `), or the full title when there is no em dash. It does not repeat “Four Tet” when the title splits.
- Second line, muted: `{count} track` or `{count} tracks`, then the duration when present, for example `27 tracks, 1 hr 31 min`.

Duration formatting drops seconds. `1:31:31` becomes `1 hr 31 min`. An exact hour (`1:00:07`) becomes `1 hr`. Under an hour it is `{minutes} min`.

Long set names truncate with an ellipsis. The whole block is the link.

### Set, `/sets/{slug}`

Document title: `{title} Tracklist, video and download links`.

Meta description: `Watch {title} set, find the source tracks and download links`.

Breadcrumb: `All / {artist} / {set name}`. `All` goes home. The set name links to the current page and is marked current. The artist crumb is plain text. The last crumb truncates with an ellipsis. When the title does not split, the artist crumb is the full title and there is no third crumb.

If `source` resolves to a YouTube id, a 16:9 embed sits under the breadcrumb. The iframe starts at the beginning of the video (`enablejsapi=1`, no `start`). The embed title is the set title.

Under the video, a bar holds the current track on the left and Smaller / Larger on the right. The bar is the same width as the player.

The track table follows. Columns, left aligned: Time, Artist, Title, Bandcamp, Beatport.

- Time shows only the start of a range, so `15:00–18:00` renders as `15:00`.
- When there is a video, the time is a link. Clicking it seeks the embed to that cue and plays. The href is the embed URL with `start` and `autoplay=1`, targeted at the iframe named `player`, so it still works if the script has not loaded.
- Bandcamp and Beatport render as `bc` and `bp` when the URL exists, opening in a new tab. An empty cell stays empty.
- The row for the cue currently playing has a light wash (`is-playing`).

## Player

`127.0.0.1` is replaced with `localhost` before anything else. YouTube embeds fail when the referrer is `127.0.0.1`.

Size steps, remembered in `localStorage` under `player-size`:

1. `40rem`
2. `48rem` (default when nothing is stored)
3. `64rem`
4. `calc(100vw - 3rem)`

The applied width is `min(step, calc(100vw - 3rem))`, so a step never exceeds the viewport minus the page gutters. Smaller is disabled on the first step, Larger on the last. The table does not follow these steps.

The current cue is the last track whose start is at or before the playhead plus 0.4 seconds. The playhead is polled every 500ms, and also read on player state changes. Unstarted and cued states do not update the line.

The line under the video is the artist, then the title in muted text. There is no “now playing” label. If the track has a Bandcamp URL, the line links there. Otherwise it links to Beatport. If neither exists, the line is plain text. Shop links open in a new tab.

Clicking a time highlights that row immediately. If the IFrame API is ready it seeks and plays. If not, the seek waits until the player is ready. `bc` and `bp` clicks are not seeks.

Keys apply when the page is focused, not when an input, textarea, or select is focused, and not with a modifier held:

- Space toggles play and pause. Playing or buffering pauses. Anything else plays.
- Left and right arrow seek 5 seconds back or forward and do not force playback. The time does not go below 0.

When the iframe itself is focused, YouTube handles its own keys. The page does not see them.

## Layout

The page is left aligned. `main` is at most `40rem` wide, with `1.5rem` padding on the left and right and `6rem` at the bottom. The player, its bar, and the track table are allowed to grow wider than that column.

Colors: background `#111`, text `#e8e8e8`, muted `#888`, hover `#fff`. The current-track wash is white at 6% opacity. Focus rings are a 1px muted outline, offset 4px. Links in the table are underlined and muted. Body type is Instrument Sans at the browser default size. The breadcrumb is `1.05rem`. Table headers are `0.75rem` and muted. The index summary line is `0.875rem`.

The player is 16:9, black until the video paints, and defaults to `min(48rem, calc(100vw - 3rem))` before the script applies the saved step.

Track columns stay proportional: time 12%, artist 34%, title 36%, Bandcamp 9%, Beatport 9%.

## Breakpoints

Root font size is the browser default, so `1rem` is 16px.

| Viewport | Query | What changes |
| --- | --- | --- |
| Narrow | `max-width: 40rem` (640px) | Table cells stay on one line and truncate with an ellipsis. The time column is `4.25rem`, does not ellipsize, and stays wide enough for a time like `4:19:24`. Bandcamp and Beatport columns are `2rem` with no right padding. Cell padding shrinks to `0.45rem`. The player bar wraps, and the now-playing line can shrink. |
| Tablet and below | default, under `64rem` (1024px) | The track table is `calc(100vw - 3rem)`: the full viewport, inset by the same `1.5rem` gutter used on `main`. |
| Desktop | `min-width: 64rem` (1024px) | The track table is `50vw`. |

The index list, breadcrumb, and `main` column do not change at these breakpoints. Player Smaller / Larger is separate from the breakpoints: each step is capped at `calc(100vw - 3rem)` at every width.

## SEO and sharing

Every page sets a description, `og:title`, `og:description`, `og:url`, and `og:image`. The image is `/og.jpg` at 1200×630. Twitter uses `summary_large_image` with the same title, description, and image.

`public/robots.txt` allows all crawlers and points at `https://tetlist.com/sitemap-index.xml`. The sitemap integration emits that index plus the page list, covering `/` and each `/sets/{slug}/`.

Favicon is `/favicon.svg`, with a 32×32 `/favicon.ico`. Both are a light geometric “t” on `#111`.
