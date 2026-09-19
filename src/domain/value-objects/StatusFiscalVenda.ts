import type { ColunaKanbanFiscalId } from '@/src/domain/types/kanbanPedido'
import {
  STATUS_FISCAIS_VENDA_SET,
  type BucketStatusEntreguesFiscal,
  type StatusFiscalVendaValor,
} from '@/src/domain/types/statusFiscalVenda'

const ALIAS_PARA_CANONICO: Record<string, StatusFiscalVendaValor> = {
  AUTORIZADA: 'EMITIDA',
  AUTORIZADO: 'EMITIDA',
  EM_PROCESSAMENTO: 'PENDENTE_AUTORIZACAO',
}

export class StatusFiscalVenda {
  private constructor(private readonly _valor: StatusFiscalVendaValor) {}

  static tryParse(raw?: string | null): StatusFiscalVenda | null {
    const normalizado = String(raw ?? '')
      .trim()
      .toUpperCase()
    if (!normalizado) return null
    if (STATUS_FISCAIS_VENDA_SET.has(normalizado)) {
      return new StatusFiscalVenda(normalizado as StatusFiscalVendaValor)
    }
    const alias = ALIAS_PARA_CANONICO[normalizado]
    return alias ? new StatusFiscalVenda(alias) : null
  }

  static create(raw: string): StatusFiscalVenda {
    const status = StatusFiscalVenda.tryParse(raw)
    if (!status) {
      throw new Error(`Status fiscal inválido: ${raw}`)
    }
    return status
  }

  static normalizarValor(raw?: string | null): StatusFiscalVendaValor | null {
    return StatusFiscalVenda.tryParse(raw)?.valor ?? null
  }

  get valor(): StatusFiscalVendaValor {
    return this._valor
  }

  isEmitida(): boolean {
    return this._valor === 'EMITIDA'
  }

  isRejeitada(): boolean {
    return this._valor === 'REJEITADA' || this._valor === 'DENEGADA'
  }

  isCancelada(): boolean {
    return this._valor === 'CANCELADA'
  }

  isInutilizada(): boolean {
    return this._valor === 'INUTILIZADA'
  }

  isPendenteAutorizacao(): boolean {
    return this._valor === 'PENDENTE' || this._valor === 'PENDENTE_AUTORIZACAO'
  }

  aguardandoSefaz(): boolean {
    return (
      this._valor === 'PENDENTE' ||
      this._valor === 'PENDENTE_AUTORIZACAO' ||
      this._valor === 'EMITINDO' ||
      this._valor === 'CONTINGENCIA'
    )
  }

  permiteAbaNotaFiscal(): boolean {
    return (
      this.isEmitida() ||
      this._valor === 'REJEITADA' ||
      this._valor === 'PENDENTE' ||
      this._valor === 'PENDENTE_AUTORIZACAO'
    )
  }

  permiteCancelarNota(): boolean {
    return this.isEmitida()
  }

  temDocumentoAutorizadoOuCancelado(): boolean {
    return this.isEmitida() || this.isCancelada()
  }

  colunaKanbanFiscal(): ColunaKanbanFiscalId | null {
    if (this._valor === 'UNKNOWN') return null
    if (this.isRejeitada()) return 'REJEITADAS'
    if (this._valor === 'PENDENTE_EMISSAO') return 'PENDENTE_EMISSAO'
    return 'COM_FISCAL'
  }

  bucketEntregues(): BucketStatusEntreguesFiscal | null {
    if (this.isCancelada() || this.isInutilizada()) return 'CANCELADA'
    if (this.isEmitida()) return 'EMITIDA'
    if (this.isRejeitada()) return 'REJEITADA'
    if (
      this.aguardandoSefaz() ||
      this._valor === 'PENDENTE_EMISSAO'
    ) {
      return 'PENDENTE'
    }
    return null
  }
}

export function primeiroStatusFiscalNaoVazio(
  ...candidatos: unknown[]
): StatusFiscalVenda | null {
  for (const c of candidatos) {
    if (c == null) continue
    const s = String(c).trim()
    if (!s) continue
    const parsed = StatusFiscalVenda.tryParse(s)
    if (parsed) return parsed
  }
  return null
}
