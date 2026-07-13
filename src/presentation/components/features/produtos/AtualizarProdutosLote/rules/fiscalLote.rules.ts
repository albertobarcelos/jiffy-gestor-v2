import type { Produto } from '@/src/domain/entities/Produto'
import { CAMPOS_FISCAL_LOTE } from '../constants'
import type {
  FiscalCampoChave,
  FiscalLoteDraft,
  FiscalLoteFalhaExibida,
} from '../types'

export type FiscalLoteAlteracoes = {
  ncm?: string | null
  cest?: string | null
  origemMercadoria?: number | null
  tipoProduto?: string | null
  indicadorProducaoEscala?: string | null
}

export type FiscalLoteRequestPayload = {
  produtoIds: string[]
  alteracoes: FiscalLoteAlteracoes
}

/**
 * Monta `alteracoes` para PATCH /api/produtos/fiscal/lote.
 * Só envia NCM/CEST completos para evitar PATCH com código parcial.
 */
export function montarAlteracoesFiscalLote(
  d: FiscalLoteDraft
): FiscalLoteAlteracoes | null {
  const alteracoes: FiscalLoteAlteracoes = {}
  const ncmT = d.ncm.replace(/\D/g, '').slice(0, 8)
  const cestT = d.cest.replace(/\D/g, '').slice(0, 7)
  if (ncmT.length === 8) alteracoes.ncm = ncmT
  if (cestT.length === 7) alteracoes.cest = cestT
  if (d.origemMercadoria !== '') {
    const om = parseInt(d.origemMercadoria, 10)
    if (!Number.isNaN(om)) alteracoes.origemMercadoria = om
  }
  const tipoT = d.tipoProduto.trim()
  if (tipoT) alteracoes.tipoProduto = tipoT
  const indT = d.indicadorProducaoEscala.trim()
  if (indT) alteracoes.indicadorProducaoEscala = indT
  if (Object.keys(alteracoes).length === 0) return null
  return alteracoes
}

export function montarPayloadFiscalLote(
  produtoIds: string[],
  draft: FiscalLoteDraft
): FiscalLoteRequestPayload | null {
  const alteracoes = montarAlteracoesFiscalLote(draft)
  if (!alteracoes) return null
  return { produtoIds, alteracoes }
}

/** Monta payload para limpar campos fiscais (`null`) nos produtos selecionados. */
export function montarPayloadLimparFiscalLote(
  produtoIds: string[],
  campos: Set<FiscalCampoChave>
): FiscalLoteRequestPayload | null {
  if (campos.size === 0) return null

  const alteracoes: FiscalLoteAlteracoes = {}
  if (campos.has('ncm')) alteracoes.ncm = null
  if (campos.has('cest')) alteracoes.cest = null
  if (campos.has('origemMercadoria')) alteracoes.origemMercadoria = null
  if (campos.has('tipoProduto')) alteracoes.tipoProduto = null
  if (campos.has('indicadorProducaoEscala')) alteracoes.indicadorProducaoEscala = null

  return { produtoIds, alteracoes }
}

/** Produtos selecionados que não possuem CEST cadastrado (validação do indicador de escala). */
export function produtosSelecionadosSemCest(
  produtoIds: string[],
  produtos: Produto[]
): Produto[] {
  const porId = new Map(produtos.map(p => [p.getId(), p]))
  return produtoIds
    .map(id => porId.get(id))
    .filter((p): p is Produto => p != null)
    .filter(p => p.getCest().trim() === '')
}

/** Produtos selecionados sem NCM (raiz ou fiscal) — CEST em lote exige NCM no formulário ou no produto. */
export function produtosSelecionadosSemNcm(
  produtoIds: string[],
  produtos: Produto[]
): Produto[] {
  const porId = new Map(produtos.map(p => [p.getId(), p]))
  return produtoIds
    .map(id => porId.get(id))
    .filter((p): p is Produto => p != null)
    .filter(p => p.getNcm().trim() === '')
}

/**
 * Se todos os selecionados têm o mesmo NCM (8 dígitos), devolve esse código.
 * Usado para validar/listar CEST sem preencher NCM no formulário em lote.
 */
export function ncmComumDosProdutosSelecionados(
  produtoIds: string[],
  produtos: Produto[]
): string | null {
  if (produtoIds.length === 0) return null
  const porId = new Map(produtos.map(p => [p.getId(), p]))
  let comum: string | null = null

  for (const id of produtoIds) {
    const produto = porId.get(id)
    if (!produto) return null
    const ncm = produto.getNcm().replace(/\D/g, '').slice(0, 8)
    if (ncm.length !== 8) return null
    if (comum === null) {
      comum = ncm
      continue
    }
    if (comum !== ncm) return null
  }

  return comum
}

function labelCampoFiscal(campo?: string): string | undefined {
  if (!campo?.trim()) return undefined
  const chave = campo.trim() as FiscalCampoChave
  return CAMPOS_FISCAL_LOTE.find(c => c.chave === chave)?.label ?? chave
}

/**
 * Converte `errosDetalhe` da API em itens exibíveis (com nome do produto quando disponível).
 */
export function mapearErrosDetalheFiscalLote(
  errosDetalhe: Array<{ produtoId?: string; mensagem?: string; campo?: string }>,
  produtos: Produto[]
): FiscalLoteFalhaExibida[] {
  const porId = new Map(produtos.map(p => [p.getId(), p]))
  const falhas: FiscalLoteFalhaExibida[] = []

  for (const erro of errosDetalhe) {
    const produtoId = typeof erro.produtoId === 'string' ? erro.produtoId.trim() : ''
    if (!produtoId) continue
    const mensagem =
      typeof erro.mensagem === 'string' && erro.mensagem.trim() !== ''
        ? erro.mensagem.trim()
        : 'Não foi possível atualizar este produto.'
    const campo =
      typeof erro.campo === 'string' && erro.campo.trim() !== ''
        ? erro.campo.trim()
        : undefined
    const produto = porId.get(produtoId)
    falhas.push({
      produtoId,
      nomeProduto: produto?.getNome().trim() || produtoId,
      mensagem,
      campo,
      labelCampo: labelCampoFiscal(campo),
    })
  }

  return falhas
}
