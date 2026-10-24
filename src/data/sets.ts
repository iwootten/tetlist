export const site = {
  documentTitle: "Four Tet sets, tracklists and videos",
  tagline: "Watch Four Tet performances and find the tracks used to make them",
  description: "Watch Kieran Hebden sets and dig through tracklists",
};

export function splitTitle(title: string) {
  const [artist, ...rest] = title.split(" — ");
  return { artist, detail: rest.join(" — ") };
}

export function displayTime(time: string) {
  return time.split(/[–—]/)[0].trim();
}

export function displayDuration(duration: string) {
  const parts = duration.split(":").map(Number);
  if (parts.some((part) => Number.isNaN(part)) || parts.length < 2) return duration;
  const [hours, minutes] = parts;
  if (hours > 0 && minutes > 0) return `${hours} hr ${minutes} min`;
  if (hours > 0) return `${hours} hr`;
  return `${minutes} min`;
}

export function startSeconds(time: string) {
  const start = displayTime(time);
  const parts = start.split(":").map(Number);
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

export function youtube(source?: string) {
  if (!source) return null;
  const url = new URL(source);
  const id =
    url.hostname === "youtu.be"
      ? url.pathname.slice(1)
      : (url.searchParams.get("v") ?? "");
  if (!id) return null;
  return { id };
}

export function watchUrl(id: string, seconds: number) {
  return `https://www.youtube.com/embed/${id}?start=${seconds}&autoplay=1`;
}

export function byNewest(
  a: { id: string; data?: { date?: string } },
  b: { id: string; data?: { date?: string } },
) {
  const key = (s: { id: string; data?: { date?: string } }) => {
    const d = s.data?.date;
    const m = d?.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
    if (m) return `${m[1]}${m[2] ?? "00"}${m[3] ?? "00"}`;
    const year = s.id.match(/(\d{4})$/)?.[1] ?? "0000";
    return `${year}0000`;
  };
  return key(b).localeCompare(key(a)) || a.id.localeCompare(b.id);
}
