import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { fetchCatalogoPublicoUpstream } from '@/src/infrastructure/api/fetchCatalogoPublicoUpstream'
import { isReservedCardapioSlug } from './reservedCardapioSlugs'

export async function carregarEmpresaPublicaSeo(
  slug: string
): Promise<EmpresaPublicaDTO | null> {
  const slugNormalizado = slug.trim()
  if (!slugNormalizado || isReservedCardapioSlug(slugNormalizado)) return null
  try {
    const data = await fetchCatalogoPublicoUpstream(slugNormalizado)
    return data.empresa ?? null
  } catch {
    return null
  }
}
