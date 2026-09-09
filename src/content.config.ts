import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const collections = {
  blog: defineCollection({
    loader: glob({ pattern: '**/[^_]*.md', base: './src/content/blog' }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      locale: z.enum(['en', 'cs', 'es', 'de', 'pt']),
      categories: z.array(z.enum(['AI', 'PostgreSQL', 'Software Engineering'])),
      date: z.date(),
      tags: z.array(z.string()).optional(),
      draft: z.boolean().optional().default(false),
      canonical: z.string().url().optional(),
      translation_id: z.string().optional(),
    }),
  }),
};
