interface ProductReviewSchema {
  type: "ProductReview"
  productName: string
  brand: string
  rating: number
  reviewCount?: number
  price?: string
  currency?: string
  description: string
  url: string
  imageUrl?: string
  author: string
  datePublished: string
  dateModified: string
}

interface ItemListSchema {
  type: "ItemList"
  name: string
  description: string
  url: string
  items: {
    name: string
    url: string
    position: number
    image?: string
    rating?: number
  }[]
}

interface FAQSchema {
  type: "FAQ"
  questions: { question: string; answer: string }[]
}

interface ArticleSchema {
  type: "Article"
  title: string
  description: string
  url: string
  imageUrl?: string
  author: string
  datePublished: string
  dateModified: string
}

type SchemaData = ProductReviewSchema | ItemListSchema | FAQSchema | ArticleSchema

interface SeoJsonLdProps {
  schemas: SchemaData[]
}

function buildSchema(data: SchemaData): object {
  switch (data.type) {
    case "ProductReview":
      return {
        "@context": "https://schema.org",
        "@type": "Product",
        name: data.productName,
        brand: { "@type": "Brand", name: data.brand },
        description: data.description,
        image: data.imageUrl,
        review: {
          "@type": "Review",
          reviewRating: {
            "@type": "Rating",
            ratingValue: data.rating,
            bestRating: 10,
            worstRating: 1,
          },
          author: { "@type": "Organization", name: "Kosttilskudsvalg" },
          datePublished: data.datePublished,
          dateModified: data.dateModified,
        },
        aggregateRating: data.reviewCount
          ? {
              "@type": "AggregateRating",
              ratingValue: data.rating,
              bestRating: 10,
              reviewCount: data.reviewCount,
            }
          : undefined,
        offers: data.price
          ? {
              "@type": "Offer",
              price: data.price,
              priceCurrency: data.currency || "DKK",
              availability: "https://schema.org/InStock",
            }
          : undefined,
      }

    case "ItemList":
      return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: data.name,
        description: data.description,
        url: data.url,
        numberOfItems: data.items.length,
        itemListElement: data.items.map((item) => ({
          "@type": "ListItem",
          position: item.position,
          name: item.name,
          url: item.url,
          ...(item.image ? { image: item.image } : {}),
        })),
      }

    case "FAQ":
      return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: data.questions.map((q) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: q.answer,
          },
        })),
      }

    case "Article":
      return {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: data.title,
        description: data.description,
        url: data.url,
        image: data.imageUrl,
        author: { "@type": "Person", name: data.author },
        publisher: {
          "@type": "Organization",
          name: "Kosttilskudsvalg",
          url: "https://www.kosttilskudsvalg.dk",
        },
        datePublished: data.datePublished,
        dateModified: data.dateModified,
      }
  }
}

export function SeoJsonLd({ schemas }: SeoJsonLdProps) {
  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildSchema(schema)) }}
        />
      ))}
    </>
  )
}
