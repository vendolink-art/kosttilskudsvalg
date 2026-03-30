import { MDXFrontmatter, Product } from './schemas'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Utility for combining class names
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Affiliate link helper function
export function createAffiliateLink(url: string, text: string, className?: string) {
  return {
    href: url,
    text,
    className,
    rel: 'sponsored nofollow',
    target: '_self',
  }
}

// Format date for Danish display
export function formatDanishDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('da-DK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Generate breadcrumbs
export function generateBreadcrumbs(path: string) {
  const segments = path.split('/').filter(Boolean)
  const breadcrumbs = [{ name: 'Hjem', href: '/' }]

  let currentPath = ''
  segments.forEach((segment) => {
    currentPath += `/${segment}`
    const name = segment.charAt(0).toUpperCase() + segment.slice(1)
    breadcrumbs.push({
      name,
      href: currentPath,
    })
  })

  return breadcrumbs
}

// SEO helper functions
export function generatePageMetadata(
  frontmatter: MDXFrontmatter,
  type: 'guide' | 'review' | 'blog' = 'guide'
) {
  const baseUrl = 'https://www.kosttilskudsvalg.dk'
  const canonical = `${baseUrl}/${type}s/${frontmatter.title.toLowerCase().replace(/\s+/g, '-')}`

  return {
    title: `${frontmatter.title} | Kosttilskudsvalg`,
    description: frontmatter.description,
    canonical,
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.description,
      type: 'article',
      publishedTime: frontmatter.date,
      modifiedTime: frontmatter.updated || frontmatter.date,
      authors: [frontmatter.author],
      tags: frontmatter.tags,
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: frontmatter.title,
      description: frontmatter.description,
    },
  }
}

// JSON-LD generators
export function generateProductJsonLd(product: Product, frontmatter: MDXFrontmatter) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    brand: {
      '@type': 'Brand',
      name: product.brand,
    },
    description: frontmatter.description,
    aggregateRating: product.rating ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    offers: product.affiliate_links?.map(link => ({
      '@type': 'Offer',
      price: link.price,
      priceCurrency: 'DKK',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: link.retailer,
      },
    })),
  }
}

export function generateItemListJsonLd(items: Array<{ name: string, url: string, description?: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Thing',
        name: item.name,
        url: item.url,
        description: item.description,
      },
    })),
  }
}
