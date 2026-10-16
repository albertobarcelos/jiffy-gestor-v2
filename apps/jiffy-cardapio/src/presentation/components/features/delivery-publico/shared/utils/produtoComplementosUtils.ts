import type {
  CatalogoPublicoComplementoDTO,
  CatalogoPublicoGrupoComplementoDTO,
  CatalogoPublicoProdutoDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

export type ComplementosCatalogoCache = {
  gruposComplementos: CatalogoPublicoGrupoComplementoDTO[]
  complementos: CatalogoPublicoComplementoDTO[]
}

export type GrupoComplementoResolvido = CatalogoPublicoGrupoComplementoDTO & {
  complementos: CatalogoPublicoComplementoDTO[]
}

export function chaveComplemento(grupoId: string, complementoId: string): string {
  return `${grupoId}-${complementoId}`
}

function leanGruposDoProduto(
  produto: Pick<CatalogoPublicoProdutoDTO, 'gruposComplementos'> | { gruposComplementos?: CatalogoPublicoProdutoDTO['gruposComplementos'] }
) {
  return Array.isArray(produto.gruposComplementos) ? produto.gruposComplementos : []
}

/**
 * Produto com ao menos um complemento ativo para exibir no delivery público.
 * Ignora `abreComplementos` (flag só de gestor/PDV); usa vínculo no menu + lean ativo.
 */
export function produtoTemComplementosAtivos(
  produto: Pick<CatalogoPublicoProdutoDTO, 'grupoComplementosIds'> & {
    gruposComplementos?: CatalogoPublicoProdutoDTO['gruposComplementos']
  }
): boolean {
  const lean = leanGruposDoProduto(produto)
  if (lean.length > 0) {
    return lean.some(grupo => grupo.complementos.some(comp => comp.ativo !== false))
  }
  return produto.grupoComplementosIds.length > 0
}

function resolveGruposViaTemplate(
  cache: ComplementosCatalogoCache,
  produto: CatalogoPublicoProdutoDTO
): GrupoComplementoResolvido[] {
  const complementoMap = new Map(cache.complementos.map(c => [c.id, c]))

  return produto.grupoComplementosIds
    .map(grupoId => cache.gruposComplementos.find(g => g.id === grupoId))
    .filter((g): g is CatalogoPublicoGrupoComplementoDTO => !!g)
    .map(grupo => ({
      ...grupo,
      complementos: grupo.complementoIds
        .map(id => complementoMap.get(id))
        .filter((c): c is CatalogoPublicoComplementoDTO => !!c),
    }))
    .filter(g => g.complementos.length > 0)
    .sort((a, b) => a.ordem - b.ordem)
}

/**
 * Join dicionário (metadados) + lean do produto (valor/ativo/ordem/impacto).
 * Sem lean (payload antigo), cai no join só por `grupoComplementosIds`.
 * Não usa `abreComplementos` — no público vale o vínculo ativo no cardápio.
 */
export function resolveGruposComplementos(
  cache: ComplementosCatalogoCache | null,
  produto: CatalogoPublicoProdutoDTO
): GrupoComplementoResolvido[] {
  if (!cache) return []

  const lean = leanGruposDoProduto(produto)
  if (lean.length === 0) {
    return resolveGruposViaTemplate(cache, produto)
  }

  const complementoMap = new Map(cache.complementos.map(c => [c.id, c]))
  const grupoMap = new Map(cache.gruposComplementos.map(g => [g.id, g]))

  return lean
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .flatMap(grupoLean => {
      const meta = grupoMap.get(grupoLean.id)
      if (!meta) return []

      const complementos = grupoLean.complementos
        .filter(comp => comp.ativo !== false)
        .slice()
        .sort((a, b) => a.ordem - b.ordem)
        .flatMap(compLean => {
          const template = complementoMap.get(compLean.id)
          if (!template) return []
          return [
            {
              ...template,
              valor: compLean.valor,
              tipoImpactoPreco: compLean.tipoImpactoPreco,
            },
          ]
        })

      if (complementos.length === 0) return []

      return [
        {
          ...meta,
          ordem: grupoLean.ordem,
          complementoIds: complementos.map(c => c.id),
          complementos,
        },
      ]
    })
}

/**
 * True quando o cache local cobre os grupos do produto (ou o produto não precisa).
 * False com cache ausente/desatualizado → força refetch (ex.: sessionStorage velho pós-SSR).
 */
export function cacheComplementosCobreProduto(
  cache: ComplementosCatalogoCache | null,
  produto: CatalogoPublicoProdutoDTO
): boolean {
  if (!produtoTemComplementosAtivos(produto)) return true
  if (!cache) return false
  return resolveGruposComplementos(cache, produto).length > 0
}

export function somarQuantidadeNoGrupo(
  quantidades: Record<string, number>,
  grupoId: string,
  override?: { key: string; quantidade: number }
): number {
  let total = 0
  const prefix = `${grupoId}-`
  for (const [key, qtd] of Object.entries(quantidades)) {
    if (!key.startsWith(prefix)) continue
    total += override?.key === key ? override.quantidade : Math.max(0, Math.floor(qtd))
  }
  return total
}

export type GrupoComplementoPendente = {
  id: string
  nome: string
  obrigatorio: boolean
  quantidadeMinima: number
  quantidadeSelecionada: number
}

function quantidadeMinimaGrupo(grupo: GrupoComplementoResolvido): number {
  return grupo.obrigatorio ? Math.max(grupo.qtdMinima, 1) : grupo.qtdMinima
}

export function listarGruposComplementosPendentes(
  grupos: GrupoComplementoResolvido[],
  quantidades: Record<string, number>
): GrupoComplementoPendente[] {
  return grupos.flatMap(grupo => {
    const quantidadeSelecionada = somarQuantidadeNoGrupo(quantidades, grupo.id)
    const quantidadeMinima = quantidadeMinimaGrupo(grupo)
    if (quantidadeMinima <= 0 || quantidadeSelecionada >= quantidadeMinima) return []

    return [{
      id: grupo.id,
      nome: grupo.nome,
      obrigatorio: grupo.obrigatorio,
      quantidadeMinima,
      quantidadeSelecionada,
    }]
  })
}

export function validarGruposComplementos(
  grupos: GrupoComplementoResolvido[],
  quantidades: Record<string, number>
): { valido: boolean; mensagem?: string } {
  const pendentes = listarGruposComplementosPendentes(grupos, quantidades)
  if (pendentes.length === 0) return { valido: true }

  const primeiro = pendentes[0]
  return {
    valido: false,
    mensagem: `Selecione pelo menos ${primeiro.quantidadeMinima} em "${primeiro.nome}"`,
  }
}

export type GrupoComplementoAcimaDoMaximo = {
  id: string
  nome: string
  quantidadeMaxima: number
  quantidadeSelecionada: number
}

/** `qtdMaxima` 0 significa ilimitado — o mesmo critério do modal. */
export function listarGruposComplementosAcimaDoMaximo(
  grupos: GrupoComplementoResolvido[],
  quantidades: Record<string, number>
): GrupoComplementoAcimaDoMaximo[] {
  return grupos.flatMap(grupo => {
    if (grupo.qtdMaxima <= 0) return []
    const quantidadeSelecionada = somarQuantidadeNoGrupo(quantidades, grupo.id)
    if (quantidadeSelecionada <= grupo.qtdMaxima) return []

    return [{
      id: grupo.id,
      nome: grupo.nome,
      quantidadeMaxima: grupo.qtdMaxima,
      quantidadeSelecionada,
    }]
  })
}

export type ComplementoQuantidadeCarrinho = {
  complementoId: string
  grupoComplementoId: string
  quantidade: number
}

export function quantidadesComplementosCarrinho(
  complementos: ComplementoQuantidadeCarrinho[]
): Record<string, number> {
  const quantidades: Record<string, number> = {}
  for (const complemento of complementos) {
    const key = chaveComplemento(complemento.grupoComplementoId, complemento.complementoId)
    const atual = quantidades[key] ?? 0
    quantidades[key] = atual + Math.max(0, Math.floor(complemento.quantidade))
  }
  return quantidades
}

export type AvaliacaoComplementosItemCarrinho =
  | { status: 'ok' }
  | { status: 'indefinido' }
  | {
      status: 'invalido'
      produtoNome: string
      pendentes: GrupoComplementoPendente[]
      acimaDoMaximo: GrupoComplementoAcimaDoMaximo[]
    }

/**
 * Confere mínimo e máximo do item contra o catálogo.
 * Sem produto ou sem cache de grupos, devolve `indefinido` — não dá para saber se o complemento é obrigatório.
 */
export function avaliarComplementosItemCarrinho(input: {
  produto: CatalogoPublicoProdutoDTO | null
  cache: ComplementosCatalogoCache | null
  produtoNome: string
  complementos: ComplementoQuantidadeCarrinho[]
}): AvaliacaoComplementosItemCarrinho {
  if (!input.produto) return { status: 'indefinido' }
  if (!produtoTemComplementosAtivos(input.produto)) return { status: 'ok' }
  if (!cacheComplementosCobreProduto(input.cache, input.produto)) {
    return { status: 'indefinido' }
  }

  const grupos = resolveGruposComplementos(input.cache, input.produto)
  const quantidades = quantidadesComplementosCarrinho(input.complementos)
  const pendentes = listarGruposComplementosPendentes(grupos, quantidades)
  const acimaDoMaximo = listarGruposComplementosAcimaDoMaximo(grupos, quantidades)

  if (pendentes.length === 0 && acimaDoMaximo.length === 0) {
    return { status: 'ok' }
  }

  return {
    status: 'invalido',
    produtoNome: input.produtoNome,
    pendentes,
    acimaDoMaximo,
  }
}
