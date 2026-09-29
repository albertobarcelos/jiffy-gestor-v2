import {
  ehAcaoCardapio,
  type AcaoProdutoCardapio,
  type CategoriaCanalResumo,
  type CategoriaCardapioMarketplace,
  type ItemCardapioRemoto,
  type ItemCanalResumo,
  type ProdutoCardapioMarketplace,
  type ResultadoAplicarCardapio,
  type PagamentoCanalResumo,
  type PagamentoCardapioMarketplace,
  type ResultadoAplicarCategoria,
  type ResultadoAplicarPagamento,
  type ResultadoImportarCardapio,
  type SituacaoCardapioAiqfome,
  type SituacaoCardapioRemoto,
  SITUACOES_CARDAPIO_REMOTO,
} from '@/src/domain/integracoes/cardapioMarketplace'

function lerTexto(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const texto = value.trim()
  return texto.length > 0 ? texto : null
}

function lerNumero(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function lerResumo(value: unknown): ItemCanalResumo | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const idItem = lerTexto(row.idItem)
  const nome = lerTexto(row.nome)
  if (!idItem || !nome) return null
  return {
    idItem,
    sku: lerTexto(row.sku),
    nome,
    preco: lerNumero(row.preco),
  }
}

function lerAcaoProduto(value: unknown): AcaoProdutoCardapio {
  if (value === 'VINCULAR' || value === 'CRIAR') return value
  return null
}

function lerSituacao(value: unknown): SituacaoCardapioRemoto | null {
  return typeof value === 'string' && (SITUACOES_CARDAPIO_REMOTO as readonly string[]).includes(value)
    ? (value as SituacaoCardapioRemoto)
    : null
}

function lerSituacaoCardapio(row: Record<string, unknown>, totalItens: number): SituacaoCardapioAiqfome {
  const situacao = lerSituacao(row.situacao)
  if (situacao) {
    return {
      vazio: situacao !== 'COM_ITENS',
      situacao,
      mensagem: lerTexto(row.mensagem) ?? '',
      podeCriar: typeof row.podeCriar === 'boolean' ? row.podeCriar : situacao !== 'SEM_CATEGORIA',
      totalCategorias: lerNumero(row.totalCategorias) ?? 0,
      totalItens: lerNumero(row.totalItens) ?? totalItens,
    }
  }
  if (totalItens > 0) {
    return {
      vazio: false,
      situacao: 'COM_ITENS',
      mensagem: '',
      podeCriar: true,
      totalCategorias: 0,
      totalItens,
    }
  }
  return {
    vazio: true,
    situacao: 'SEM_ITENS',
    mensagem: 'A loja está conectada, mas o cardápio do Aiqfome ainda não tem item.',
    podeCriar: true,
    totalCategorias: 0,
    totalItens: 0,
  }
}

export function lerProdutosCardapioDoHub(payload: unknown): {
  empresaId: string
  menuId: string
  produtos: ProdutoCardapioMarketplace[]
} & SituacaoCardapioAiqfome {
  const row = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const lista = Array.isArray(row.produtos) ? row.produtos : []
  const produtos = lista.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const produto = item as Record<string, unknown>
    const produtoId = lerTexto(produto.produtoId)
    const nome = lerTexto(produto.nome)
    const preco = lerNumero(produto.preco)
    if (!produtoId || !nome || preco === null) return []
    return [
      {
        produtoId,
        nome,
        descricao: typeof produto.descricao === 'string' ? produto.descricao : null,
        preco,
        grupoId: lerTexto(produto.grupoId),
        grupoNome: lerTexto(produto.grupoNome),
        categoriaId: lerTexto(produto.categoriaId),
        acao: lerAcaoProduto(produto.acao),
        vinculo: lerResumo(produto.vinculo),
        sugestao: lerResumo(produto.sugestao),
      },
    ]
  })
  return {
    empresaId: lerTexto(row.empresaId) ?? '',
    menuId: lerTexto(row.menuId) ?? '',
    produtos,
    ...lerSituacaoCardapio(row, lerNumero(row.totalItens) ?? 0),
  }
}

export function lerRemotoCardapioDoHub(payload: unknown): {
  empresaId: string
  itens: ItemCardapioRemoto[]
} & SituacaoCardapioAiqfome {
  const row = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const lista = Array.isArray(row.itens) ? row.itens : []
  const itens = lista.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const remoto = item as Record<string, unknown>
    const idItem = lerTexto(remoto.idItem)
    const nome = lerTexto(remoto.nome)
    if (!idItem || !nome) return []
    return [
      {
        idItem,
        sku: lerTexto(remoto.sku),
        nome,
        descricao: typeof remoto.descricao === 'string' ? remoto.descricao : null,
        preco: lerNumero(remoto.preco),
        categoriaId: lerTexto(remoto.categoriaId),
      },
    ]
  })
  return {
    empresaId: lerTexto(row.empresaId) ?? '',
    itens,
    ...lerSituacaoCardapio(row, itens.length),
  }
}

function lerResumoCategoria(value: unknown): CategoriaCanalResumo | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const idCategoria = lerTexto(row.idCategoria)
  const nome = lerTexto(row.nome)
  if (!idCategoria || !nome) return null
  return { idCategoria, nome }
}

export function lerCategoriasCardapioDoHub(payload: unknown): {
  empresaId: string
  menuId: string
  categorias: CategoriaCardapioMarketplace[]
  remoto: CategoriaCanalResumo[]
} {
  const row = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const lista = Array.isArray(row.categorias) ? row.categorias : []
  const categorias = lista.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const categoria = item as Record<string, unknown>
    const grupoId = lerTexto(categoria.grupoId)
    const nome = lerTexto(categoria.nome)
    if (!grupoId || !nome) return []
    return [
      {
        grupoId,
        nome,
        acao: lerAcaoProduto(categoria.acao),
        vinculo: lerResumoCategoria(categoria.vinculo),
        sugestao: lerResumoCategoria(categoria.sugestao),
      },
    ]
  })
  const remotoLista = Array.isArray(row.remoto) ? row.remoto : []
  return {
    empresaId: lerTexto(row.empresaId) ?? '',
    menuId: lerTexto(row.menuId) ?? '',
    categorias,
    remoto: remotoLista.flatMap(item => {
      const resumo = lerResumoCategoria(item)
      return resumo ? [resumo] : []
    }),
  }
}

export function lerResultadosAplicarDoHub(payload: unknown): ResultadoAplicarCardapio[] {
  const row = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const lista = Array.isArray(row.resultados) ? row.resultados : []
  return lista.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const resultado = item as Record<string, unknown>
    const produtoId = lerTexto(resultado.produtoId)
    if (!produtoId || !ehAcaoCardapio(resultado.acao)) return []
    return [
      {
        produtoId,
        acao: resultado.acao,
        salvo: resultado.salvo === true,
        sku: lerTexto(resultado.sku) ?? undefined,
        idItem: lerTexto(resultado.idItem) ?? undefined,
        precoAtualizado: typeof resultado.precoAtualizado === 'boolean' ? resultado.precoAtualizado : undefined,
        erro: lerTexto(resultado.erro) ?? undefined,
      },
    ]
  })
}

export function lerResultadosAplicarCategoriaDoHub(payload: unknown): ResultadoAplicarCategoria[] {
  const row = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const lista = Array.isArray(row.resultados) ? row.resultados : []
  return lista.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const resultado = item as Record<string, unknown>
    const grupoId = lerTexto(resultado.grupoId)
    if (!grupoId || !ehAcaoCardapio(resultado.acao)) return []
    return [
      {
        grupoId,
        acao: resultado.acao,
        salvo: resultado.salvo === true,
        categoriaId: lerTexto(resultado.categoriaId) ?? undefined,
        erro: lerTexto(resultado.erro) ?? undefined,
      },
    ]
  })
}

function lerResumoPagamento(value: unknown): PagamentoCanalResumo | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const idPagamento = lerTexto(row.idPagamento)
  const nome = lerTexto(row.nome)
  if (!idPagamento || !nome) return null
  return { idPagamento, nome }
}

export function lerPagamentosCardapioDoHub(payload: unknown): {
  empresaId: string
  pagamentos: PagamentoCardapioMarketplace[]
  remoto: PagamentoCanalResumo[]
} {
  const row = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const lista = Array.isArray(row.pagamentos) ? row.pagamentos : []
  const pagamentos = lista.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const pagamento = item as Record<string, unknown>
    const meioId = lerTexto(pagamento.meioId)
    const nome = lerTexto(pagamento.nome)
    if (!meioId || !nome) return []
    return [
      {
        meioId,
        nome,
        acao: lerAcaoProduto(pagamento.acao),
        vinculo: lerResumoPagamento(pagamento.vinculo),
        sugestao: lerResumoPagamento(pagamento.sugestao),
      },
    ]
  })
  const remotoLista = Array.isArray(row.remoto) ? row.remoto : []
  return {
    empresaId: lerTexto(row.empresaId) ?? '',
    pagamentos,
    remoto: remotoLista.flatMap(item => {
      const resumo = lerResumoPagamento(item)
      return resumo ? [resumo] : []
    }),
  }
}

export function lerResultadosAplicarPagamentoDoHub(payload: unknown): ResultadoAplicarPagamento[] {
  const row = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const lista = Array.isArray(row.resultados) ? row.resultados : []
  return lista.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const resultado = item as Record<string, unknown>
    const meioId = lerTexto(resultado.meioId)
    if (!meioId || !ehAcaoCardapio(resultado.acao)) return []
    return [
      {
        meioId,
        acao: resultado.acao,
        salvo: resultado.salvo === true,
        pagamentoId: lerTexto(resultado.pagamentoId) ?? undefined,
        erro: lerTexto(resultado.erro) ?? undefined,
      },
    ]
  })
}

export function lerResultadosImportarDoHub(payload: unknown): ResultadoImportarCardapio[] {
  const row = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const lista = Array.isArray(row.resultados) ? row.resultados : []
  return lista.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const resultado = item as Record<string, unknown>
    const idItem = lerTexto(resultado.idItem)
    if (!idItem) return []
    return [
      {
        idItem,
        criado: resultado.criado === true,
        produtoId: lerTexto(resultado.produtoId) ?? undefined,
        sku: lerTexto(resultado.sku) ?? undefined,
        motivo: lerTexto(resultado.motivo) ?? undefined,
        erro: lerTexto(resultado.erro) ?? undefined,
      },
    ]
  })
}
