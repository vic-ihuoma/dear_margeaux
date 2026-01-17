import { defineCollection, z } from 'astro:content';

/**
 * Blog collection schema
 * For news, stories, and articles about Dear Margeaux
 */
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    author: z.string(),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

/**
 * Lookbook collection schema
 * For visual campaign/editorial content tied to drops
 */
const lookbook = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    drop: z.string(), // Reference to drop slug
    date: z.date(),
    images: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  blog,
  lookbook,
};
