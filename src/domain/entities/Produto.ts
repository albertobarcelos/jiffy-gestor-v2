import {
  normalizarUnidadeMedidaProduto,
  type UnidadeMedidaProduto,
} from '@/src/shared/types/unidadeMedidaProduto'
import type { ProdutoMenuResumo } from '@/src/shared/types/menus'

/**
 * Entidade de domínio representando um Produto
 */
interface ProdutoComplementoResumo {
  id: string
  nome: string
  valor?: number
  tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum'
}

interface ProdutoGrupoComplementoResumo {
  id: string
  nome: string
  complementos: ProdutoComplementoResumo[]
}

interface ProdutoImpressoraResumo {
  id: string
  nome: string
  ativo: boolean
}

function mapMenusFromJson(raw: unknown): ProdutoMenuResumo[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item: unknown) => {
      const rec = asPlainRecord(item)
      const nested = asPlainRecord(rec.menu)
      const id = firstNonEmptyString(nested.id, rec.id)
      const nome = firstNonEmptyString(nested.nome, rec.nome) || 'Menu'
      return id ? { id, nome } : null
    })
    .filter((m): m is ProdutoMenuResumo => m != null)
}

function asPlainRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
  return {}
}

/** Primeira string não vazia (após trim); ignora `null`, `undefined` e `''`. */
function firstNonEmptyString(...candidates: unknown[]): string {
  for (const c of candidates) {
    if (c === null || c === undefined) continue
    const s = String(c).trim()
    if (s !== '') return s
  }
  return ''
}

/**
 * Lê campos fiscais do JSON do cardápio: objeto `fiscal`, opcional `dadosFiscais`,
 * aliases comuns (`codigoCest`, `codigoNcm`, snake_case) e raiz do produto.
 */
function extractFiscalStrings(data: any): {
  ncm: string
  cest: string
  origemMercadoria: string
  tipoProduto: string
  indicadorProducaoEscala: string | null
} {
  const d = asPlainRecord(data)
  const fiscalNested = asPlainRecord(d.fiscal)
  const dadosFiscais = asPlainRecord(d.dadosFiscais)
  /** `fiscal` sobrescreve `dadosFiscais` quando ambos existem. */
  const fiscal = { ...dadosFiscais, ...fiscalNested }

  const ncm = firstNonEmptyString(
    fiscal.ncm,
    fiscal.codigoNcm,
    fiscal.codigo_ncm,
    d.ncm,
    d.codigoNcm,
    d.codigo_ncm,
  )
  const cest = firstNonEmptyString(
    fiscal.cest,
    fiscal.codigoCest,
    fiscal.cestCodigo,
    fiscal.codigo_cest,
    d.cest,
    d.codigoCest,
    d.codigo_cest,
  )
  const origemMercadoria = firstNonEmptyString(
    fiscal.origemMercadoria,
    fiscal.origem_mercadoria,
    fiscal.origem,
    d.origemMercadoria,
    d.origem_mercadoria,
    d.origem,
  )
  const tipoProdutoRaw = firstNonEmptyString(
    fiscal.tipoProduto,
    fiscal.tipo_produto,
    fiscal.tipoMercadoria,
    fiscal.tipo_mercadoria,
    fiscal.tipoItem,
    fiscal.tipo_item,
    d.tipoProduto,
    d.tipo_produto,
    d.tipoMercadoria,
    d.tipo_mercadoria,
  )
  /** API às vezes manda `0`/`1` em vez de `00`/`01`. */
  const tipoProduto =
    /^\d{1}$/.test(tipoProdutoRaw) ? tipoProdutoRaw.padStart(2, '0') : tipoProdutoRaw

  const indStr = firstNonEmptyString(
    fiscal.indicadorProducaoEscala,
    fiscal.indicador_producao_escala,
    fiscal.indicadorEscala,
    fiscal.indicador_escala,
    d.indicadorProducaoEscala,
    d.indicador_producao_escala,
    d.indicadorEscala,
    d.indicador_escala,
  )

  return {
    ncm,
    cest,
    origemMercadoria,
    tipoProduto,
    indicadorProducaoEscala: indStr === '' ? null : indStr,
  }
}

export class Produto {
  private constructor(
    private readonly id: string,
    private readonly codigoProduto: string,
    private readonly nome: string,
    private readonly valor: number,
    private readonly ativo: boolean,
    private readonly nomeGrupo?: string,
    private readonly grupoId?: string,
    private readonly estoque?: number | string,
    private readonly favorito?: boolean,
    private readonly abreComplementos?: boolean,
    private readonly permiteAcrescimo?: boolean,
    private readonly permiteDesconto?: boolean,
    private readonly permiteAlterarPreco?: boolean,
    private readonly incideTaxa?: boolean,
    private readonly ordem?: number,
    private readonly gruposComplementos?: ProdutoGrupoComplementoResumo[],
    private readonly impressoras?: ProdutoImpressoraResumo[],
    private readonly ncm?: string,
    private readonly cest?: string,
    private readonly origemMercadoria?: string,
    private readonly tipoProduto?: string,
    private readonly indicadorProducaoEscala?: string | null,
    private readonly unidadeMedida: UnidadeMedidaProduto = 'UN',
    private readonly menus?: ProdutoMenuResumo[],
    private readonly imagemUrl?: string | null
  ) {}

  static create(
    id: string,
    codigoProduto: string,
    nome: string,
    valor: number,
    ativo: boolean,
    nomeGrupo?: string,
    grupoId?: string,
    estoque?: number | string,
    favorito?: boolean,
    abreComplementos?: boolean,
    permiteAcrescimo?: boolean,
    permiteDesconto?: boolean,
    permiteAlterarPreco?: boolean,
    incideTaxa?: boolean,
    ordem?: number,
    gruposComplementos?: ProdutoGrupoComplementoResumo[],
    impressoras?: ProdutoImpressoraResumo[],
    ncm?: string,
    cest?: string,
    origemMercadoria?: string,
    tipoProduto?: string,
    indicadorProducaoEscala?: string | null,
    unidadeMedida?: UnidadeMedidaProduto,
    menus?: ProdutoMenuResumo[],
    imagemUrl?: string | null
  ): Produto {
    if (!id || !nome) {
      throw new Error('ID e nome são obrigatórios')
    }

    return new Produto(
      id,
      codigoProduto,
      nome,
      valor,
      ativo,
      nomeGrupo,
      grupoId,
      estoque,
      favorito,
      abreComplementos,
      permiteAcrescimo,
      permiteDesconto,
      permiteAlterarPreco,
      incideTaxa,
      ordem,
      gruposComplementos,
      impressoras,
      ncm,
      cest,
      origemMercadoria,
      tipoProduto,
      indicadorProducaoEscala,
      normalizarUnidadeMedidaProduto(unidadeMedida),
      menus,
      imagemUrl ?? null
    )
  }

  static fromJSON(data: any): Produto {
    const impressorasMapeadas = Array.isArray(data.impressoras)
      ? data.impressoras
          .filter((imp: any) => imp && imp.id) // Filtra impressoras válidas
          .map((imp: any) => ({
            id: imp.id?.toString() || '',
            nome: imp.nome?.toString() || 'Impressora',
            ativo: imp.ativo === true || imp.ativo === 'true' || imp.ativo === undefined, // Se não tiver campo ativo, assume true
          }))
      : []

    const fisc = extractFiscalStrings(data)

    return Produto.create(
      data.id?.toString() || '',
      data.codigoProduto?.toString() || (typeof data.codigoProduto === 'number' ? data.codigoProduto.toString() : ''),
      data.nome?.toString() || '',
      typeof data.valor === 'number' ? data.valor : parseFloat(data.valor) || 0,
      data.ativo === true || data.ativo === 'true',
      data.nomeGrupo?.toString(),
      data.grupoId?.toString(),
      data.estoque,
      data.favorito === true || data.favorito === 'true',
      data.abreComplementos === true || data.abreComplementos === 'true',
      data.permiteAcrescimo === true || data.permiteAcrescimo === 'true',
      data.permiteDesconto === true || data.permiteDesconto === 'true',
      data.permiteAlterarPreco === true || data.permiteAlterarPreco === 'true',
      data.incideTaxa === true || data.incideTaxa === 'true',
      (() => {
        if (typeof data.ordem === 'number' && Number.isFinite(data.ordem)) return data.ordem
        if (typeof data.ordem === 'string' && data.ordem.trim() !== '') {
          const n = parseInt(data.ordem, 10)
          return Number.isFinite(n) ? n : undefined
        }
        return undefined
      })(),
      Array.isArray(data.gruposComplementos)
        ? data.gruposComplementos.map((grupo: any) => ({
            id: grupo.id?.toString() || '',
            nome: grupo.nome?.toString() || '',
            complementos: Array.isArray(grupo.complementos)
              ? grupo.complementos.map((comp: any) => ({
                  id: comp.id?.toString() || '',
                  nome: comp.nome?.toString() || '',
                  valor: typeof comp.valor === 'number' ? comp.valor : (comp.valor ? parseFloat(comp.valor) : 0),
                  tipoImpactoPreco: comp.tipoImpactoPreco || 'nenhum',
                }))
              : [],
          }))
        : [],
      impressorasMapeadas,
      fisc.ncm,
      fisc.cest,
      fisc.origemMercadoria,
      fisc.tipoProduto,
      fisc.indicadorProducaoEscala,
      normalizarUnidadeMedidaProduto(data.unidadeMedida),
      mapMenusFromJson(data.menus),
      (() => {
        const raw =
          data.imagemUrl ??
          data.imageUrl ??
          (data.image && typeof data.image === 'object' ? data.image.imageUrl : null)
        if (typeof raw !== 'string') return null
        const trimmed = raw.trim()
        return trimmed || null
      })()
    )
  }

  getId(): string {
    return this.id
  }

  getCodigoProduto(): string {
    return this.codigoProduto
  }

  getNome(): string {
    return this.nome
  }

  getValor(): number {
    return this.valor
  }

  isAtivo(): boolean {
    return this.ativo
  }

  getNomeGrupo(): string | undefined {
    return this.nomeGrupo
  }

  getGrupoId(): string | undefined {
    return this.grupoId
  }

  getEstoque(): number | string | undefined {
    return this.estoque
  }

  isFavorito(): boolean {
    return this.favorito === true
  }

  abreComplementosAtivo(): boolean {
    return this.abreComplementos === true
  }

  permiteAcrescimoAtivo(): boolean {
    return this.permiteAcrescimo === true
  }

  permiteDescontoAtivo(): boolean {
    return this.permiteDesconto === true
  }

  permiteAlterarPrecoAtivo(): boolean {
    return this.permiteAlterarPreco === true
  }

  incideTaxaAtivo(): boolean {
    return this.incideTaxa === true
  }

  getOrdem(): number | undefined {
    return this.ordem
  }

  getGruposComplementos(): ProdutoGrupoComplementoResumo[] {
    return this.gruposComplementos || []
  }

  getImpressoras(): ProdutoImpressoraResumo[] {
    return this.impressoras || []
  }

  getNcm(): string {
    return this.ncm ?? ''
  }

  getCest(): string {
    return this.cest ?? ''
  }

  /** Código de origem da mercadoria (ex.: `"0"`, `"1"`). */
  getOrigemMercadoria(): string {
    return this.origemMercadoria ?? ''
  }

  /** Código do tipo do produto (ex.: `"00"`, `"KT"`). */
  getTipoProduto(): string {
    return this.tipoProduto ?? ''
  }

  /** `null` ou string vazia tratados como sem indicador. */
  getIndicadorProducaoEscala(): string | null {
    const v = this.indicadorProducaoEscala
    if (v === null || v === undefined || String(v).trim() === '') return null
    return String(v).trim()
  }

  getUnidadeMedida(): UnidadeMedidaProduto {
    return this.unidadeMedida
  }

  getMenus(): ProdutoMenuResumo[] {
    return this.menus || []
  }

  getImagemUrl(): string | null {
    const url = this.imagemUrl?.trim()
    return url ? url : null
  }

  /** Retorna cópia com campos fiscais atualizados (edição inline / lote). */
  withDadosFiscais(partial: {
    ncm?: string
    cest?: string
    origemMercadoria?: string
    tipoProduto?: string
    indicadorProducaoEscala?: string | null
  }): Produto {
    return Produto.fromJSON({
      ...this.toJSON(),
      ncm: partial.ncm !== undefined ? partial.ncm : this.ncm,
      cest: partial.cest !== undefined ? partial.cest : this.cest,
      origemMercadoria:
        partial.origemMercadoria !== undefined
          ? partial.origemMercadoria
          : this.origemMercadoria,
      tipoProduto: partial.tipoProduto !== undefined ? partial.tipoProduto : this.tipoProduto,
      indicadorProducaoEscala:
        partial.indicadorProducaoEscala !== undefined
          ? partial.indicadorProducaoEscala
          : this.indicadorProducaoEscala,
      fiscal: {
        ncm: partial.ncm !== undefined ? partial.ncm : this.ncm,
        cest: partial.cest !== undefined ? partial.cest : this.cest,
        origemMercadoria:
          partial.origemMercadoria !== undefined
            ? partial.origemMercadoria
            : this.origemMercadoria,
        tipoProduto:
          partial.tipoProduto !== undefined ? partial.tipoProduto : this.tipoProduto,
        indicadorProducaoEscala:
          partial.indicadorProducaoEscala !== undefined
            ? partial.indicadorProducaoEscala
            : this.indicadorProducaoEscala,
      },
    })
  }

  /** Retorna cópia com impressoras atualizadas (vínculo/desvínculo em lote, sem refetch). */
  withImpressoras(impressoras: ProdutoImpressoraResumo[]): Produto {
    return Produto.fromJSON({
      ...this.toJSON(),
      impressoras,
    })
  }

  withMenus(menus: ProdutoMenuResumo[]): Produto {
    return Produto.fromJSON({
      ...this.toJSON(),
      menus,
    })
  }

  toJSON() {
    return {
      id: this.id,
      codigoProduto: this.codigoProduto,
      nome: this.nome,
      valor: this.valor,
      ativo: this.ativo,
      nomeGrupo: this.nomeGrupo,
      grupoId: this.grupoId,
      estoque: this.estoque,
      favorito: this.favorito,
      abreComplementos: this.abreComplementos,
      permiteAcrescimo: this.permiteAcrescimo,
      permiteDesconto: this.permiteDesconto,
      permiteAlterarPreco: this.permiteAlterarPreco,
      incideTaxa: this.incideTaxa,
      ordem: this.ordem,
      gruposComplementos: this.gruposComplementos,
      impressoras: this.impressoras,
      ncm: this.ncm ?? '',
      cest: this.cest ?? '',
      origemMercadoria: this.origemMercadoria ?? '',
      tipoProduto: this.tipoProduto ?? '',
      indicadorProducaoEscala: this.indicadorProducaoEscala ?? null,
      unidadeMedida: this.unidadeMedida,
      menus: this.menus ?? [],
      imagemUrl: this.imagemUrl ?? null,
    }
  }
}

