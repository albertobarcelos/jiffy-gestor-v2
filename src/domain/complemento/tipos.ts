/** Impacto de preço do complemento. O efetivo é override do grupo ou, na falta dele, o do cadastro. */
export type TipoImpactoPreco = 'nenhum' | 'aumenta' | 'diminui'

export function normalizarTipoImpactoPreco(value: unknown): TipoImpactoPreco {
  const texto = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (texto === 'aumenta' || texto === 'diminui' || texto === 'nenhum') {
    return texto
  }
  return 'nenhum'
}

/** Projeção: complemento dentro de um grupo, com o impacto efetivo daquele vínculo. */
export type ComplementoNoGrupo = {
  id: string
  nome: string
  tipoImpactoPreco: TipoImpactoPreco
}

/** Projeção: uso do complemento num produto de um cardápio, com valor e ativo efetivos. */
export type ComplementoUsoNoMenu = {
  menuProdutoId: string
  menu: { id: string; nome: string; ativo: boolean }
  produto: { id: string; nome: string; ativo: boolean }
  grupoProduto: { id: string; nome: string }
  grupoComplementos: { id: string; nome: string }
  complementoConfig: {
    ordem: number
    valor: number
    ativo: boolean
  }
}

/** Leitura `retorno=completo`: modelo identificado mais os usos e os grupos. */
export type ComplementoCompleto = {
  id: string
  nome: string
  vinculos: ComplementoUsoNoMenu[]
  grupos: ComplementoNoGrupo[]
}
