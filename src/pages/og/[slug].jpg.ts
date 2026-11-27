import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { ogData } from "../../lib/og";
import { renderOgCard } from "../../lib/og-card";

// Prerendered: each card is a static file in dist/og/<slug>.jpg at build time.
export async function getStaticPaths() {
  const sets = await getCollection("sets");
  return sets.map((set) => ({ params: { slug: set.id }, props: { set } }));
}

export const GET: APIRoute = async ({ props }) => {
  const { set } = props as { set: Awaited<ReturnType<typeof getCollection<"sets">>>[number] };
  const image = await renderOgCard(ogData(set.data));
  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
