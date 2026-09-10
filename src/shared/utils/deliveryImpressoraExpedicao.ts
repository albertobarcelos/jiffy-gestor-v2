import type { AcaoTransicaoGestor } from '@/src/presentation/hooks/useVendas'
import type { ColunaKanbanId } from '@/src/presentation/components/features/kanban/types'
import type { ModoImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'

export const TOAST_IMPRESSORA_EXPEDICAO_NECESSARIA =
  'É necessário escolher uma impressora de expedição.'

export const TOAST_IMPRESSORA_EXPEDICAO_MAPEAMENTO_WINDOWS =
  'Vincule a impressora de expedição a uma impressora Windows neste terminal.'

const SUFIXO_PEDIDO_SEGUE_SEM_PAPEL =
  'O pedido já avançou no quadro e o fluxo segue mesmo sem o papel. Vincule em Configurações de impressão neste PC.'

export const TOAST_QUADRO_SEGUE_SEM_EXPEDICAO_ESCOLHIDA =
  `O cupom de expedição NÃO imprimiu: nenhuma impressora de expedição está escolhida. ${SUFIXO_PEDIDO_SEGUE_SEM_PAPEL}`

export const TOAST_QUADRO_SEGUE_SEM_VINCULO_EXPEDICAO =
  `O cupom de expedição NÃO imprimiu: a impressora de expedição não está vinculada a uma impressora deste PC. ${SUFIXO_PEDIDO_SEGUE_SEM_PAPEL}`

export function TOAST_IMPRESSORA_PRODUCAO_MAPEAMENTO_WINDOWS(nomeImpressoraLogica: string): string {
  const nome = nomeImpressoraLogica.trim() || 'lógica'
  return `O cupom da "${nome}" NÃO imprimiu: essa impressora lógica não está vinculada a uma impressora deste PC. ${SUFIXO_PEDIDO_SEGUE_SEM_PAPEL}`
}

/** Toast após o pedido já ter sido criado: impressão é opcional e não desfaz o pedido. */
export function TOAST_CUPOM_NAO_IMPRIMIU_SEM_VINCULO_PC(nomeImpressoraLogica: string): string {
  const nome = nomeImpressoraLogica.trim() || 'lógica'
  return `Pedido criado. O cupom da "${nome}" NÃO imprimiu: essa impressora lógica não está vinculada a uma impressora deste PC. ${SUFIXO_PEDIDO_SEGUE_SEM_PAPEL}`
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
