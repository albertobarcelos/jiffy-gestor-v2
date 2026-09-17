import type { GetCatalogoPublicoResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

export function extrairImagemUrlMidia(item: unknown): string | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null
  const rec = item as Record<string, unknown>
  const image = rec.image
  const nested =
    image && typeof image === 'object' && !Array.isArray(image)
      ? ((image as Record<string, unknown>).imageUrl ??
        (image as Record<string, unknown>).imagemUrl ??
        (image as Record<string, unknown>).url)
      : typeof image === 'string'
        ? image
        : null
  const raw = rec.imagemUrl ?? rec.imageUrl ?? nested
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed || null
}

function comImagemUrl<T extends { imagemUrl: string | null }>(item: T): T {
  return {
    ...item,
    imagemUrl: extrairImagemUrlMidia(item) ?? item.imagemUrl,
  }
}

/** O catálogo público manda a foto em `image.imageUrl`; a UI lê `imagemUrl`. */
export function normalizarCatalogoPublicoImagens(
  data: GetCatalogoPublicoResponseDTO
): GetCatalogoPublicoResponseDTO {
  const catalogo = data.catalogo
  if (!catalogo) return data

  return {
    ...data,
    catalogo: {
      ...catalogo,
      gruposProdutos: catalogo.gruposProdutos.map(grupo => ({
        ...comImagemUrl(grupo),
        produtos: grupo.produtos.map(produto => comImagemUrl(produto)),
      })),
      gruposComplementos: catalogo.gruposComplementos?.map(comImagemUrl) ?? catalogo.gruposComplementos,
      complementos: catalogo.complementos?.map(comImagemUrl) ?? catalogo.complementos,
    },
  }
}
