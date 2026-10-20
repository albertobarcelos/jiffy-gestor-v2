import {
  ETAPAS_OPERACIONAIS_DELIVERY_SET,
  ETAPAS_OPERACIONAIS_EDICAO_ITENS,
  ETAPAS_OPERACIONAIS_EM_CURSO,
  type EtapaOperacionalDeliveryValor,
} from '@/src/domain/types/etapaOperacionalDelivery'
import type {
  ColunaKanbanId,
  ColunaKanbanOperacionalId,
} from '@/src/domain/types/kanbanPedido'

/**
 * Sinônimos fechados de persistência/UI que representam a mesma etapa canônica.
 * Não incluir palpites soltos (`COZINHA`, `NOVO`, `ROTA`).
 */
const ALIAS_PARA_CANONICO: Record<string, EtapaOperacionalDeliveryValor> = {
  FINALIZADA: 'FINALIZADO',
  CANCELADA: 'CANCELADO',
  ENTREGUE: 'FINALIZADO',
  CONCLUIDO: 'FINALIZADO',
  NOVOS_PEDIDOS: 'PENDENTE',
  PRONTO_ENTREGA: 'PRONTO',
  FINALIZADAS: 'FINALIZADO',
  DESPACHADO: 'EM_ROTA',
  SAIU_PARA_ENTREGA: 'EM_ROTA',
  SAIU_ENTREGA: 'EM_ROTA',
}

const COLUNA_OPERACIONAL_POR_ETAPA: Record<
  Exclude<EtapaOperacionalDeliveryValor, 'FINALIZADO' | 'CANCELADO'>,
  ColunaKanbanOperacionalId
> = {
  PENDENTE: 'NOVOS_PEDIDOS',
  EM_PREPARO: 'EM_PREPARO',
  PRONTO: 'PRONTO_ENTREGA',
  EM_ROTA: 'EM_ROTA',
}

const ETAPA_POR_COLUNA_OPERACIONAL: Record<
  ColunaKanbanOperacionalId,
  EtapaOperacionalDeliveryValor
> = {
  NOVOS_PEDIDOS: 'PENDENTE',
  EM_PREPARO: 'EM_PREPARO',
  PRONTO_ENTREGA: 'PRONTO',
  EM_ROTA: 'EM_ROTA',
}

export class EtapaOperacionalDelivery {
  private constructor(private readonly _valor: EtapaOperacionalDeliveryValor) {}

  static tryParse(raw?: string | null): EtapaOperacionalDelivery | null {
    const normalizado = String(raw ?? '')
      .trim()
      .toUpperCase()
    if (!normalizado) return null
    if (ETAPAS_OPERACIONAIS_DELIVERY_SET.has(normalizado)) {
      return new EtapaOperacionalDelivery(normalizado as EtapaOperacionalDeliveryValor)
    }
    const alias = ALIAS_PARA_CANONICO[normalizado]
    return alias ? new EtapaOperacionalDelivery(alias) : null
  }

  static create(raw: string): EtapaOperacionalDelivery {
    const etapa = EtapaOperacionalDelivery.tryParse(raw)
    if (!etapa) {
      throw new Error(`Etapa operacional de delivery inválida: ${raw}`)
    }
    return etapa
  }

  get valor(): EtapaOperacionalDeliveryValor {
    return this._valor
  }

  equals(outra: EtapaOperacionalDelivery): boolean {
    return this._valor === outra._valor
  }

  isFinalizado(): boolean {
    return this._valor === 'FINALIZADO'
  }

  isCancelado(): boolean {
    return this._valor === 'CANCELADO'
  }

  isTerminal(): boolean {
    return this.isFinalizado() || this.isCancelado()
  }

  aindaOperacional(): boolean {
    return (ETAPAS_OPERACIONAIS_EM_CURSO as readonly string[]).includes(this._valor)
  }

  permiteEditarItens(): boolean {
    return (ETAPAS_OPERACIONAIS_EDICAO_ITENS as readonly string[]).includes(this._valor)
  }

  permiteCancelarPedido(): boolean {
    return !this.isTerminal()
  }

  colunaKanbanOperacional(): ColunaKanbanOperacionalId | null {
    if (this._valor === 'FINALIZADO' || this._valor === 'CANCELADO') return null
    return COLUNA_OPERACIONAL_POR_ETAPA[this._valor]
  }

  colunaKanbanDetalhe(): ColunaKanbanId {
    return this.colunaKanbanOperacional() ?? 'FINALIZADAS'
  }
}

export function etapaOperacionalDaColunaKanban(
  coluna: ColunaKanbanId
): EtapaOperacionalDeliveryValor | null {
  if (coluna === 'NOVOS_PEDIDOS' || coluna === 'EM_PREPARO' || coluna === 'PRONTO_ENTREGA' || coluna === 'EM_ROTA') {
    return ETAPA_POR_COLUNA_OPERACIONAL[coluna]
  }
  return null
}

/** Filtro `statusDelivery` da listagem por coluna. `FINALIZADAS`/`COM_FISCAL` pedem o pool terminal. */
export function statusDeliveryQueryDaColunaKanban(
  coluna: ColunaKanbanId
): EtapaOperacionalDeliveryValor | EtapaOperacionalDeliveryValor[] | null {
  if (coluna === 'FINALIZADAS' || coluna === 'COM_FISCAL') {
    return ['FINALIZADO', 'CANCELADO']
  }
  return etapaOperacionalDaColunaKanban(coluna)
}

export function colunaKanbanDeStatusEtapa(
  statusEtapaOperacional?: string | null
): ColunaKanbanId | null {
  return EtapaOperacionalDelivery.tryParse(statusEtapaOperacional)?.colunaKanbanDetalhe() ?? null
}
