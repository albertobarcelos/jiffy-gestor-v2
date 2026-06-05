import type { AcaoTransicaoGestor } from '@/src/presentation/hooks/useVendas'
import type { ColunaKanbanId } from '@/src/presentation/components/features/nfe/kanban/types'
import type { ModoImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'

export const TOAST_IMPRESSORA_EXPEDICAO_NECESSARIA =
  'É necessário escolher uma impressora de expedição.'

export const TOAST_IMPRESSORA_EXPEDICAO_MAPEAMENTO_WINDOWS =
  'Vincule a impressora de expedição a uma impressora Windows neste terminal.'

export function TOAST_IMPRESSORA_PRODUCAO_MAPEAMENTO_WINDOWS(nomeImpressoraLogica: string): string {
  return `Vincule a impressora "${nomeImpressoraLogica}" a uma impressora Windows neste terminal para imprimir o cupom de produção.`
}

export const DIALOG_SALVAR_SEM_IMPRESSORA_EXPEDICAO =
  'É necessário escolher uma impressora de expedição para imprimir o ticket de expedição nas opções de separado ou unificado.'

export function temImpressoraExpedicaoConfigurada(
  impressoraExpedicaoId: string | null | undefined
): boolean {
  return Boolean(impressoraExpedicaoId?.trim())
}

/** Transições do Kanban que exigem impressora de expedição configurada na empresa. */
export function transicaoExigeImpressoraExpedicao(
  modo: ModoImpressaoDelivery,
  acao: AcaoTransicaoGestor
): boolean {
  if (modo === 'unificado' && acao === 'iniciar_preparo') return true
  if (modo === 'separado' && acao === 'marcar_pronto') return true
  return false
}

export function algumaTransicaoExigeImpressoraExpedicao(
  modo: ModoImpressaoDelivery,
  acoes: AcaoTransicaoGestor[]
): boolean {
  return acoes.some(acao => transicaoExigeImpressoraExpedicao(modo, acao))
}

/** Reimpressão manual: cupom unificado ou expedição dependem da impressora de expedição. */
export function reimpressaoExigeImpressoraExpedicao(
  modo: ModoImpressaoDelivery,
  colunaId: ColunaKanbanId
): boolean {
  if (modo === 'unificado') return true
  return colunaId === 'PRONTO_ENTREGA' || colunaId === 'EM_ROTA'
}
