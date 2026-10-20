import type { EnderecoClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

function timestampUltimaUtilizacao(endereco: EnderecoClienteDeliveryPublicoDTO): number {
  const raw = endereco.ultimaUtilizacaoEm?.trim()
  if (!raw) return 0
  const t = Date.parse(raw)
  return Number.isFinite(t) ? t : 0
}

/** Mais recente primeiro (`ultimaUtilizacaoEm`). Sem data fica no fim. */
export function ordenarEnderecosPorUltimaUtilizacao(
  enderecos: readonly EnderecoClienteDeliveryPublicoDTO[]
): EnderecoClienteDeliveryPublicoDTO[] {
  return [...enderecos].sort(
    (a, b) => timestampUltimaUtilizacao(b) - timestampUltimaUtilizacao(a)
  )
}

/** Endereço padrão no checkout: o usado por último (ou o primeiro da lista se nenhum tiver data). */
export function escolherEnderecoMaisRecenteCliente(
  enderecos: readonly EnderecoClienteDeliveryPublicoDTO[]
): EnderecoClienteDeliveryPublicoDTO | null {
  if (enderecos.length === 0) return null
  return ordenarEnderecosPorUltimaUtilizacao(enderecos)[0] ?? null
}
