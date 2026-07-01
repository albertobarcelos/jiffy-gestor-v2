/**
 * Tipos do fluxo de atualização de produtos em lote.
 */

/** Chaves de permissão PDV no PATCH (alinhado a NovoProduto / cardápio). */
export type PermissaoCampoChave =
  | 'favorito'
  | 'permiteDesconto'
  | 'permiteAcrescimo'
  | 'permiteAlterarPreco'
  | 'incideTaxa'
  | 'abreComplementos'

/** Filtro apenas no front: mostrar só produtos sem dado na coluna escolhida. */
export type FiltroColunaVazia =
  | 'todos'
  | 'sem_impressoras'
  | 'sem_ncm'
  | 'sem_grupos_complementos'

/** Abas do painel de lote — usado para guardar destaque de linhas alteradas por aba. */
export type TabPainelLote = 'precos' | 'impressoras' | 'gruposComplementos' | 'permissoes' | 'fiscal'

/** Modo da aba fiscal: preencher valores ou limpar campos selecionados. */
export type ModoFiscalLote = 'editar' | 'limpar'

/** Chaves dos campos fiscais disponíveis para limpeza em lote. */
export type FiscalCampoChave =
  | 'ncm'
  | 'cest'
  | 'origemMercadoria'
  | 'tipoProduto'
  | 'indicadorProducaoEscala'

/** Identificadores das colunas fiscais na grid (edição inline). */
export type FiscalColunaGridId = 'ncm' | 'cest' | 'origem' | 'tipo' | 'indicador'

/** Célula fiscal em edição inline (uma por vez). */
export type CelulaFiscalAtiva = {
  produtoId: string
  coluna: FiscalColunaGridId
}

/** Rascunho fiscal aplicado em lote (PATCH parcial, objeto `fiscal` + `ncm` legado). */
export type FiscalLoteDraft = {
  ncm: string
  cest: string
  origemMercadoria: string
  tipoProduto: string
  indicadorProducaoEscala: string
}

/** Resultado da validação do NCM (API fiscal). */
export interface NcmValidationResult {
  codigo: string
  valido: boolean
  descricao?: string
  mensagem: string
}

/** Resultado da validação do CEST (API fiscal). */
export interface CestValidationResult {
  codigo: string
  valido: boolean
  descricao?: string
  segmento?: string
  mensagem: string
}

/** Item retornado por CESTs por NCM. */
export interface CestPorNcmItem {
  codigo: string
  descricao: string
  segmento: string
  numeroAnexo?: string
}

/** Filtros da listagem de produtos no fluxo de lote (enviados à API). */
export type ProdutosLoteFilterState = {
  searchText: string
  filterStatus: 'Todos' | 'Ativo' | 'Desativado'
  ativoLocalFilter: 'Todos' | 'Sim' | 'Não'
  ativoDeliveryFilter: 'Todos' | 'Sim' | 'Não'
  grupoProdutoFilter: string
}
