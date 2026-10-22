import type { ComplementoUsoNoMenu } from '@/src/domain/complemento/tipos'

export type ColunaOrdenacaoUsoComplemento = 'produto' | 'menu' | 'grupo'
export type DirecaoOrdenacaoUsoComplemento = 'asc' | 'desc'

const COLUNAS_DESEMPATE: ColunaOrdenacaoUsoComplemento[] = ['produto', 'menu', 'grupo']

function nomeDaColuna(
  uso: ComplementoUsoNoMenu,
  coluna: ColunaOrdenacaoUsoComplemento
): string {
  if (coluna === 'produto') return uso.produto.nome
  if (coluna === 'menu') return uso.menu.nome
  return uso.grupoComplementos.nome
}

export function ordenarUsosComplemento(
  usos: ComplementoUsoNoMenu[],
  coluna: ColunaOrdenacaoUsoComplemento,
  direcao: DirecaoOrdenacaoUsoComplemento
): ComplementoUsoNoMenu[] {
  return [...usos].sort((a, b) => {
    const comparacaoPrincipal = nomeDaColuna(a, coluna).localeCompare(
      nomeDaColuna(b, coluna),
      'pt-BR',
      { sensitivity: 'base' }
    )
    if (comparacaoPrincipal !== 0) {
      return direcao === 'asc' ? comparacaoPrincipal : -comparacaoPrincipal
    }

    for (const colunaDesempate of COLUNAS_DESEMPATE) {
      if (colunaDesempate === coluna) continue
      const comparacaoDesempate = nomeDaColuna(a, colunaDesempate).localeCompare(
        nomeDaColuna(b, colunaDesempate),
        'pt-BR',
        { sensitivity: 'base' }
      )
      if (comparacaoDesempate !== 0) return comparacaoDesempate
    }
    return 0
  })
}
