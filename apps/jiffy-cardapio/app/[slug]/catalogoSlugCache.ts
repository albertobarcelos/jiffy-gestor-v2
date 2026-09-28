/**
 * On-demand ISR: não pré-renderiza as ~200 lojas no build.
 * `revalidate = 30` e `dynamicParams` ficam literais em `page.tsx`
 * (o Next 15 não lê esses campos re-exportados).
 */
export function generateStaticParams(): { slug: string }[] {
  return []
}
