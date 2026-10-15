if (location.hostname === "127.0.0.1") {
  const next = new URL(location.href);
  next.hostname = "localhost";
  location.replace(next.href);
}

const player = document.querySelector(".player");
if (player) {
  const sizes = ["40rem", "48rem", "64rem", "calc(100vw - 3rem)"];
  const stored = localStorage.getItem("player-size");
  let size = stored === null ? 1 : Number(stored);
  if (!Number.isInteger(size) || size < 0 || size >= sizes.length) size = 1;

  const bar = document.createElement("div");
  bar.className = "player-bar";
  const now = document.createElement("p");
  now.className = "now-playing";
  now.hidden = true;
  const controls = document.createElement("div");
  controls.className = "player-controls";
  controls.innerHTML = `
    <button type="button" data-step="-1">Smaller</button>
    <button type="button" data-step="1">Larger</button>
  `;
  bar.append(now, controls);
  player.after(bar);

  const smaller = controls.querySelector('[data-step="-1"]');
  const larger = controls.querySelector('[data-step="1"]');

  function applySize() {
    const width = `min(${sizes[size]}, calc(100vw - 3rem))`;
    player.style.width = width;
    bar.style.width = width;
    localStorage.setItem("player-size", String(size));
    smaller.disabled = size === 0;
    larger.disabled = size === sizes.length - 1;
  }

  controls.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    size += Number(button.dataset.step);
    applySize();
  });

  applySize();

  const cues = [...document.querySelectorAll(".tracks tbody tr")]
    .map((row) => {
      const link = row.querySelector("a:not(.buy)");
      const cells = row.querySelectorAll("td");
      if (!link) return null;
      const start = Number(new URL(link.href).searchParams.get("start"));
      if (!Number.isFinite(start)) return null;
      return {
        row,
        start,
        artist: cells[1].textContent,
        title: cells[2].textContent,
        href: row.querySelector("a.bandcamp")?.href ?? row.querySelector("a.beatport")?.href ?? null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);

  let shown = -1;
  let current = null;

  function showAt(seconds) {
    let cue = null;
    for (const next of cues) {
      if (next.start <= seconds + 0.4) cue = next;
      else break;
    }
    if (!cue) {
      shown = -1;
      current?.classList.remove("is-playing");
      current = null;
      now.hidden = true;
      now.replaceChildren();
      return;
    }
    if (cue.start === shown) return;
    shown = cue.start;
    current?.classList.remove("is-playing");
    current = cue.row;
    current.classList.add("is-playing");
    now.hidden = false;
    const artist = document.createElement("span");
    artist.textContent = cue.artist;
    const title = document.createElement("span");
    title.className = "meta";
    title.textContent = cue.title;
    if (cue.href) {
      const link = document.createElement("a");
      link.href = cue.href;
      link.target = "_blank";
      link.rel = "noopener";
      link.append(artist, title);
      now.replaceChildren(link);
    } else {
      now.replaceChildren(artist, title);
    }
  }

  const frame = player.querySelector("iframe");
  frame.id = "yt-player";
  const src = new URL(frame.src);
  src.searchParams.set("enablejsapi", "1");
  src.searchParams.set("origin", location.origin);
  if (frame.src !== src.href) frame.src = src.href;

  let yt = null;
  let pending = null;

  function seek(seconds) {
    yt.seekTo(seconds, true);
    yt.playVideo();
    showAt(seconds);
  }

  document.addEventListener("keydown", (event) => {
    if (!yt || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest("input, textarea, select")) return;
    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      const state = yt.getPlayerState();
      if (state === 1 || state === 3) yt.pauseVideo();
      else yt.playVideo();
      return;
    }
    const step = event.key === "ArrowRight" ? 5 : event.key === "ArrowLeft" ? -5 : 0;
    if (!step) return;
    event.preventDefault();
    const next = Math.max(0, yt.getCurrentTime() + step);
    yt.seekTo(next, true);
    showAt(next);
  });

  document.querySelector(".tracks").addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link || link.classList.contains("buy")) return;
    const start = Number(new URL(link.href).searchParams.get("start"));
    if (!Number.isFinite(start)) return;
    event.preventDefault();
    showAt(start);
    if (yt) seek(start);
    else pending = start;
  });

  function tick() {
    if (!yt || typeof yt.getCurrentTime !== "function") return;
    const state = yt.getPlayerState();
    if (state === -1 || state === 5) return;
    showAt(yt.getCurrentTime());
  }

  window.onYouTubeIframeAPIReady = () => {
    yt = new YT.Player(frame, {
      events: {
        onReady() {
          if (pending !== null) seek(pending);
          tick();
          setInterval(tick, 500);
        },
        onStateChange: tick,
      },
    });
  };

  const api = document.createElement("script");
  api.src = "https://www.youtube.com/iframe_api";
  document.head.append(api);
}
