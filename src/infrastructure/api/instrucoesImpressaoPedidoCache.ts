import type { InstrucoesImpressaoResponse } from '@/src/shared/types/instrucoesImpressao'

const INSTRUCOES_IMPRESSAO_CACHE = new Map<string, InstrucoesImpressaoResponse>()

function chaveInstrucoes(vendaId: string, estacaoImpressaoId: string): string {
  return `${vendaId.trim()}::${estacaoImpressaoId.trim()}`
}

export function obterInstrucoesImpressaoCache(
  vendaId: string,
  estacaoImpressaoId: string
): InstrucoesImpressaoResponse | null {
  const id = vendaId.trim()
  const estacao = estacaoImpressaoId.trim()
  if (!id || !estacao) return null
  return INSTRUCOES_IMPRESSAO_CACHE.get(chaveInstrucoes(id, estacao)) ?? null
}

export function salvarInstrucoesImpressaoCache(
  vendaId: string,
  estacaoImpressaoId: string,
  data: InstrucoesImpressaoResponse
): void {
  const id = vendaId.trim()
  const estacao = estacaoImpressaoId.trim()
  if (!id || !estacao) return
  INSTRUCOES_IMPRESSAO_CACHE.set(chaveInstrucoes(id, estacao), data)
}

/** Invalida instruções do pedido (itens mudaram → roteamento de impressoras pode mudar). */
export function invalidarInstrucoesImpressaoCache(vendaId: string): void {
  const id = vendaId.trim()
  if (!id) return
  const prefixo = `${id}::`
  for (const chave of [...INSTRUCOES_IMPRESSAO_CACHE.keys()]) {
    if (chave === id || chave.startsWith(prefixo)) {
      INSTRUCOES_IMPRESSAO_CACHE.delete(chave)
    }
  }
}
