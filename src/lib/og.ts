import { displayDuration, thumbnailUrl, youtube } from "../data/sets";

// What the share card draws for a set.
export interface OgData {
  title: string;
  show: string;
  duration: string;
  count: string;
  image: string;
}

// The set's detail (everything after "Four Tet — ") reads better on a card
// than the full title, which repeats the artist on every card.
export function ogData(data: {
  title: string;
  artist: string;
  event?: string;
  duration?: string;
  source?: string;
  tracks: unknown[];
}): OgData {
  const detail = data.title.split(" — ").slice(1).join(" — ").trim();
  const title = detail || data.title;
  // Skip the event line when the title already says it, e.g. "Finsbury Park,
  // London, 10th August 2024".
  const event = data.event || data.artist;
  const show = title.toLowerCase().includes(event.toLowerCase()) ? "" : event;
  const count = data.tracks.length;
  const video = youtube(data.source);
  return {
    title,
    show,
    duration: data.duration ? displayDuration(data.duration) : "",
    count: `${count} ${count === 1 ? "track" : "tracks"}`,
    image: video ? thumbnailUrl(video.id) : "",
  };
}

export function ogImagePath(slug: string) {
  return `/og/${slug}.jpg`;
}
