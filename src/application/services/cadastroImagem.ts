import type { ICadastroImagemMedia } from '@/src/application/ports/ICadastroImagemMedia'
import { Complemento } from '@/src/domain/entities/Complemento'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { urlImagemHttp } from '@/src/shared/utils/imagemUrl'

export { urlImagemHttp }

/**
 * Reaplica foto já conhecida (upload/save) quando o catálogo ainda vem sem URL.
 */
export function hidratarImagemCadastro<T>(
  media: ICadastroImagemMedia,
  item: T,
  getId: (item: T) => string,
  getUrl: (item: T) => string | null | undefined,
  withUrl: (item: T, url: string | null) => T
): T {
  const id = getId(item)?.trim()
  if (!id) return item

  const atual = urlImagemHttp(getUrl(item))
  if (atual) {
    media.lembrar(id, atual)
    return item
  }

  const conhecida = urlImagemHttp(media.conhecida(id))
  return conhecida ? withUrl(item, conhecida) : item
}

export function aplicarImagensEmLista<T>(
  items: T[],
  urls: Record<string, string | null>,
  getId: (item: T) => string,
  withUrl: (item: T, url: string | null) => T
): T[] {
  if (items.length === 0) return items
  let changed = false
  const next = items.map(item => {
    const url = urlImagemHttp(urls[getId(item)])
    if (!url) return item
    const updated = withUrl(item, url)
    if (updated !== item) changed = true
    return updated
  })
  return changed ? next : items
}

export function hidratarComplemento(
  media: ICadastroImagemMedia,
  complemento: Complemento
): Complemento {
  return hidratarImagemCadastro(
    media,
    complemento,
    item => item.getId(),
    item => item.getImagemUrl(),
    (item, url) => item.withImagemUrl(url)
  )
}

export function hidratarGrupoComplemento(
  media: ICadastroImagemMedia,
  grupo: GrupoComplemento
): GrupoComplemento {
  return hidratarImagemCadastro(
    media,
    grupo,
    item => item.getId(),
    item => item.getImagemUrl(),
    (item, url) => item.withImagemUrl(url)
  )
}
