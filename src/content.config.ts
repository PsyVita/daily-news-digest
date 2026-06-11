import { defineCollection, z } from 'astro:content';
import { briefingsLoader } from './lib/briefings-loader';

const briefings = defineCollection({
  loader: briefingsLoader(),
  schema: z
    .object({
      date: z.string(),
      topStory: z.string(),
      funFact: z.string(),
    })
    .passthrough(),
});

export const collections = { briefings };
