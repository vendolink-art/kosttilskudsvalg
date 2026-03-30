import { z } from 'zod'

// MDX Frontmatter Schema
export const MDXFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  author: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  affiliate_disclosure: z.boolean().default(false),
})

export type MDXFrontmatter = z.infer<typeof MDXFrontmatterSchema>

// Content Types
export const ContentTypeSchema = z.enum(['guide', 'review', 'blog', 'author'])
export type ContentType = z.infer<typeof ContentTypeSchema>

// Product Schema for Reviews
export const ProductSchema = z.object({
  name: z.string(),
  brand: z.string(),
  price: z.number().optional(),
  rating: z.number().min(1).max(5).optional(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  affiliate_links: z.array(z.object({
    retailer: z.string(),
    url: z.string(),
    price: z.number().optional(),
  })).optional(),
})

export type Product = z.infer<typeof ProductSchema>

// Author Schema
export const AuthorSchema = z.object({
  slug: z.string(),
  name: z.string(),
  bio: z.string(),
  expertise: z.array(z.string()),
  avatar: z.string().optional(),
  social: z.object({
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
  }).optional(),
})

export type Author = z.infer<typeof AuthorSchema>
