import type { ICardapioMarketplaceHub } from '@/src/domain/integracoes/ICardapioMarketplaceHub'
import {
  ehAcaoCardapio,
  type ItemAplicarCardapio,
  type ItemAplicarCategoria,
  type ItemAplicarPagamento,
  type ItemImportarCardapio,
} from '@/src/domain/integracoes/cardapioMarketplace'
import { IntegracaoMarketplaceError } from '@/src/domain/integracoes/errors/IntegracaoMarketplaceError'

function exigirMenu(menuId: unknown): string {
  if (typeof menuId !== 'string' || !menuId.trim()) {
    throw new IntegracaoMarketplaceError('Informe o menu do Jiffy.', 400, 'INTEGRACAO_MENU_MISSING')
  }
  return menuId.trim()
}

function exigirAuthorization(authorization: string): string {
  const valor = authorization.trim()
  if (!valor.startsWith('Bearer ') || valor.length < 16) {
    throw new IntegracaoMarketplaceError(
      'A sincronização usa o login do Gestor. Envie Authorization Bearer.',
      401,
      'INTEGRACAO_BEARER_MISSING'
    )
  }
  return valor
}

function exigirEmpresa(empresaId: string): string {
  const valor = empresaId.trim()
  if (!valor) {
    throw new IntegracaoMarketplaceError('Empresa não identificada.', 401, 'INTEGRACAO_EMPRESA_MISSING')
  }
  return valor
}

export class SincronizarCardapioMarketplaceUseCase {
  constructor(private readonly hub: ICardapioMarketplaceHub) {}

  async listarProdutos(input: { empresaId: string; authorization: string; menuId: unknown }) {
    return this.hub.listarProdutos({
      empresaId: exigirEmpresa(input.empresaId),
      authorization: exigirAuthorization(input.authorization),
      menuId: exigirMenu(input.menuId),
    })
  }

  async listarCategorias(input: { empresaId: string; authorization: string; menuId: unknown }) {
    return this.hub.listarCategorias({
      empresaId: exigirEmpresa(input.empresaId),
      authorization: exigirAuthorization(input.authorization),
      menuId: exigirMenu(input.menuId),
    })
  }

  async listarRemoto(input: { empresaId: string; authorization: string; busca?: unknown }) {
    const busca = typeof input.busca === 'string' && input.busca.trim() ? input.busca.trim() : undefined
    return this.hub.listarRemoto({
      empresaId: exigirEmpresa(input.empresaId),
      authorization: exigirAuthorization(input.authorization),
      busca,
    })
  }

  async aplicar(input: { empresaId: string; authorization: string; menuId: unknown; itens: unknown }) {
    const itens = lerItensAplicar(input.itens)
    return this.hub.aplicar({
      empresaId: exigirEmpresa(input.empresaId),
      authorization: exigirAuthorization(input.authorization),
      menuId: exigirMenu(input.menuId),
      itens,
    })
  }

  async aplicarCategorias(input: {
    empresaId: string
    authorization: string
    menuId: unknown
    itens: unknown
  }) {
    const itens = lerItensAplicarCategoria(input.itens)
    return this.hub.aplicarCategorias({
      empresaId: exigirEmpresa(input.empresaId),
      authorization: exigirAuthorization(input.authorization),
      menuId: exigirMenu(input.menuId),
      itens,
    })
  }

  async listarPagamentos(input: { empresaId: string; authorization: string }) {
    return this.hub.listarPagamentos({
      empresaId: exigirEmpresa(input.empresaId),
      authorization: exigirAuthorization(input.authorization),
    })
  }

  async aplicarPagamentos(input: { empresaId: string; authorization: string; itens: unknown }) {
    const itens = lerItensAplicarPagamento(input.itens)
    return this.hub.aplicarPagamentos({
      empresaId: exigirEmpresa(input.empresaId),
      authorization: exigirAuthorization(input.authorization),
      itens,
    })
  }

  async importar(input: {
    empresaId: string
    authorization: string
    menuId: unknown
    grupoId?: unknown
    itens: unknown
  }) {
    const itens = lerItensImportar(input.itens)
    const grupoId =
      typeof input.grupoId === 'string' && input.grupoId.trim() ? input.grupoId.trim() : null
    return this.hub.importar({
      empresaId: exigirEmpresa(input.empresaId),
      authorization: exigirAuthorization(input.authorization),
      menuId: exigirMenu(input.menuId),
      grupoId,
      itens,
    })
  }
}

function lerItensAplicar(value: unknown): ItemAplicarCardapio[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new IntegracaoMarketplaceError('Informe ao menos um item.', 400, 'INTEGRACAO_ITENS_MISSING')
  }
  return value.map((raw, index) => {
    const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    const produtoId = typeof row.produtoId === 'string' ? row.produtoId.trim() : ''
    if (!produtoId) {
      throw new IntegracaoMarketplaceError(
        `Item ${index + 1}: informe produtoId.`,
        400,
        'INTEGRACAO_PRODUTO_MISSING'
      )
    }
    if (!ehAcaoCardapio(row.acao)) {
      throw new IntegracaoMarketplaceError(
        `Item ${index + 1}: ação inválida.`,
        400,
        'INTEGRACAO_ACAO_INVALID'
      )
    }
    const idItem = typeof row.idItem === 'string' && row.idItem.trim() ? row.idItem.trim() : null
    if (row.acao === 'VINCULAR' && !idItem) {
      throw new IntegracaoMarketplaceError(
        `Item ${index + 1}: VINCULAR exige idItem.`,
        400,
        'INTEGRACAO_ID_ITEM_MISSING'
      )
    }
    return {
      produtoId,
      acao: row.acao,
      idItem,
      sku: typeof row.sku === 'string' ? row.sku : null,
      categoriaId: typeof row.categoriaId === 'string' ? row.categoriaId : null,
    }
  })
}

function lerItensAplicarCategoria(value: unknown): ItemAplicarCategoria[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new IntegracaoMarketplaceError('Informe ao menos uma categoria.', 400, 'INTEGRACAO_ITENS_MISSING')
  }
  return value.map((raw, index) => {
    const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    const grupoId = typeof row.grupoId === 'string' ? row.grupoId.trim() : ''
    if (!grupoId) {
      throw new IntegracaoMarketplaceError(
        `Categoria ${index + 1}: informe grupoId.`,
        400,
        'INTEGRACAO_GRUPO_MISSING'
      )
    }
    if (!ehAcaoCardapio(row.acao)) {
      throw new IntegracaoMarketplaceError(
        `Categoria ${index + 1}: ação inválida.`,
        400,
        'INTEGRACAO_ACAO_INVALID'
      )
    }
    const categoriaId =
      typeof row.categoriaId === 'string' && row.categoriaId.trim() ? row.categoriaId.trim() : null
    if (row.acao === 'VINCULAR' && !categoriaId) {
      throw new IntegracaoMarketplaceError(
        `Categoria ${index + 1}: VINCULAR exige categoriaId.`,
        400,
        'INTEGRACAO_CATEGORIA_MISSING'
      )
    }
    return { grupoId, acao: row.acao, categoriaId }
  })
}

function lerItensAplicarPagamento(value: unknown): ItemAplicarPagamento[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new IntegracaoMarketplaceError(
      'Informe ao menos uma forma de pagamento.',
      400,
      'INTEGRACAO_ITENS_MISSING'
    )
  }
  return value.map((raw, index) => {
    const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    const meioId = typeof row.meioId === 'string' ? row.meioId.trim() : ''
    if (!meioId) {
      throw new IntegracaoMarketplaceError(
        `Pagamento ${index + 1}: informe meioId.`,
        400,
        'INTEGRACAO_MEIO_MISSING'
      )
    }
    if (!ehAcaoCardapio(row.acao)) {
      throw new IntegracaoMarketplaceError(
        `Pagamento ${index + 1}: ação inválida.`,
        400,
        'INTEGRACAO_ACAO_INVALID'
      )
    }
    const pagamentoId =
      typeof row.pagamentoId === 'string' && row.pagamentoId.trim() ? row.pagamentoId.trim() : null
    if (row.acao === 'CRIAR') {
      throw new IntegracaoMarketplaceError(
        `Pagamento ${index + 1}: forma de pagamento só pode vincular ou ignorar.`,
        400,
        'INTEGRACAO_ACAO_INVALID'
      )
    }
    if (row.acao === 'VINCULAR' && !pagamentoId) {
      throw new IntegracaoMarketplaceError(
        `Pagamento ${index + 1}: VINCULAR exige pagamentoId.`,
        400,
        'INTEGRACAO_PAGAMENTO_MISSING'
      )
    }
    return { meioId, acao: row.acao, pagamentoId }
  })
}

function lerItensImportar(value: unknown): ItemImportarCardapio[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new IntegracaoMarketplaceError('Informe ao menos um item.', 400, 'INTEGRACAO_ITENS_MISSING')
  }
  return value.map((raw, index) => {
    const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    const idItem = typeof row.idItem === 'string' ? row.idItem.trim() : ''
    const nome = typeof row.nome === 'string' ? row.nome.trim() : ''
    const preco = typeof row.preco === 'number' ? row.preco : Number(row.preco)
    if (!idItem || !nome || !Number.isFinite(preco) || preco <= 0) {
      throw new IntegracaoMarketplaceError(
        `Item ${index + 1}: informe idItem, nome e preço.`,
        400,
        'INTEGRACAO_IMPORTAR_INVALID'
      )
    }
    return {
      idItem,
      nome,
      descricao: typeof row.descricao === 'string' ? row.descricao : null,
      preco,
      sku: typeof row.sku === 'string' ? row.sku : null,
    }
  })
}
