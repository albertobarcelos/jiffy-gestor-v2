type CardapioSlugJsonLdProps = {
  data: Record<string, unknown>
}

export function CardapioSlugJsonLd({ data }: CardapioSlugJsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
