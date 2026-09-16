import type { CreatePedidoPublicoResponseDTO } from '@/src/application/dto/delivery-publico/CreatePedidoPublicoResponseDTO'
import type { CotacaoPedidoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { ClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

export type EnviarPedidoCheckoutResult =
  | { ok: true; pedido: CreatePedidoPublicoResponseDTO }
  | {
      ok: false
      reason: 'cotacao_desatualizada'
      message: string
      cotacao: CotacaoPedidoPublicoDTO
    }
  | { ok: false; reason: 'loja_fechada' }
  | { ok: false }

export type RecotarPedidoResult =
  | { ok: true }
  | { ok: false; reason?: 'fora_cobertura' | 'rate_limit' | 'bloqueado' | 'erro' }

export type ClienteLookupStatus =
  | 'idle'
  | 'loading'
  | 'encontrado'
  | 'nao_encontrado'
  | 'erro'

export type ClienteLookupState = {
  status: ClienteLookupStatus
  telefoneConsultado: string | null
  cliente: ClienteDeliveryPublicoDTO | null
  mensagemErro: string | null
}

export type UseDeliveryCheckoutOptions = {
  /** Força fetch (steps pós-identificação / pagamento / revisão). */
  fetchMeiosPagamento?: boolean
  /**
   * P4.2 — inicia o GET de meios quando a identificação já está completa
   * (ainda no step telefone), em overlap com o resto do fluxo.
   */
  prefetchMeiosAposIdentificacao?: boolean
}
