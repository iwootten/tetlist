import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import satori from "satori";
import sharp from "sharp";
import type { OgData } from "./og";

// 16:9 so the YouTube thumbnail fills the card without being cropped.
const WIDTH = 1200;
const HEIGHT = 675;
const PAD = 64;

// Dark tokens from src/styles/global.css.
const C = { bg: "#111", fg: "#e8e8e8", muted: "#888" };

// Keeps the wordmark and title readable over a busy frame without hiding the
// thumbnail: dark at the top and bottom, clear through the middle.
const SCRIM =
  "linear-gradient(to bottom, rgba(17,17,17,0.7) 0%, rgba(17,17,17,0.34) 12%, rgba(17,17,17,0) 32%, rgba(17,17,17,0) 46%, rgba(17,17,17,0.5) 68%, rgba(17,17,17,0.9) 88%, rgba(17,17,17,0.96) 100%)";

const require = createRequire(import.meta.url);
const font = (file: string) => readFile(require.resolve(`@fontsource/instrument-sans/files/${file}`));
const fonts = Promise.all([
  font("instrument-sans-latin-400-normal.woff"),
  font("instrument-sans-latin-500-normal.woff"),
  font("instrument-sans-latin-600-normal.woff"),
]).then(([regular, medium, semibold]) => [
  { name: "Instrument Sans", data: regular, weight: 400 as const, style: "normal" as const },
  { name: "Instrument Sans", data: medium, weight: 500 as const, style: "normal" as const },
  { name: "Instrument Sans", data: semibold, weight: 600 as const, style: "normal" as const },
]);

// Satori takes React-style element objects; this avoids pulling in JSX.
type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: (Node | string | null)[]): Node => {
  const kids = children.filter((c) => c !== null);
  return { type, props: { style, children: kids.length === 1 ? kids[0] : kids } };
};

function titleSize(title: string): number {
  if (title.length <= 22) return 84;
  if (title.length <= 40) return 68;
  if (title.length <= 60) return 56;
  return 48;
}

const caps = (size: number) => ({
  fontSize: size,
  fontWeight: 500,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
});

async function coverDataUri(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return `data:${res.headers.get("content-type") ?? "image/jpeg"};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function card(og: OgData, cover: string | null): Node {
  const detail = [og.show, og.duration].filter(Boolean).join(" · ");
  return h(
    "div",
    { width: WIDTH, height: HEIGHT, position: "relative", display: "flex", background: C.bg, color: C.fg, fontFamily: "Instrument Sans" },
    cover
      ? {
          type: "img",
          props: {
            src: cover,
            width: WIDTH,
            height: HEIGHT,
            style: { position: "absolute", top: 0, left: 0, width: WIDTH, height: HEIGHT, objectFit: "cover" },
          },
        }
      : null,
    h("div", { position: "absolute", top: 0, left: 0, width: WIDTH, height: HEIGHT, backgroundImage: SCRIM }),
    h(
      "div",
      {
        position: "relative",
        width: WIDTH,
        height: HEIGHT,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: PAD,
      },
      h(
        "div",
        { display: "flex", alignItems: "baseline", justifyContent: "space-between", color: "#dcdcdc" },
        h("div", { fontSize: 26, fontWeight: 500, letterSpacing: "-0.01em" }, "tetlist.com"),
        h("div", caps(18), og.count),
      ),
      h(
        "div",
        { display: "flex", flexDirection: "column", gap: 14, minWidth: 0 },
        h(
          "div",
          { fontSize: titleSize(og.title), fontWeight: 500, letterSpacing: "-0.035em", lineHeight: 1.02, lineClamp: 3, color: "#fff" },
          og.title,
        ),
        detail ? h("div", { ...caps(19), color: "#d2d2d2" }, detail) : null,
      ),
    ),
  );
}

// 1200×675 JPEG of a set's share card.
export async function renderOgCard(og: OgData): Promise<Buffer> {
  const cover = await coverDataUri(og.image);
  const svg = await satori(card(og, cover) as never, { width: WIDTH, height: HEIGHT, fonts: await fonts });
  return sharp(Buffer.from(svg)).jpeg({ quality: 75, mozjpeg: true }).toBuffer();
}
