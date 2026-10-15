import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const sets = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./data" }),
  schema: z.object({
    title: z.string(),
    artist: z.string(),
    event: z.string().optional(),
    date: z.string().optional(),
    source: z.string().optional(),
    duration: z.string(),
    tracks: z.array(
      z.object({
        number: z.number(),
        time: z.string(),
        artist: z.string(),
        title: z.string(),
        bandcamp: z.string().optional(),
        beatport: z.string().optional(),
      }),
    ),
  }),
});

export const collections = { sets };
