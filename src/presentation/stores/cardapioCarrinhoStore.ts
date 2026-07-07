'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CarrinhoComplementoPublico = {
  complementoId: string
  grupoComplementoId: string
  quantidade: number
  nome: string
  valor: number
  tipoImpactoPreco: string
}

export type CarrinhoItemPublico = {
  id: string
  produtoId: string
  produtoNome: string
  produtoImagemUrl: string | null
  quantidade: number
  valorUnitario: number
  valorTotal: number
  observacoes: string[]
  complementos: CarrinhoComplementoPublico[]
  adicionadoEm: string
}

type CarrinhosPorSlug = Record<string, CarrinhoItemPublico[]>

function calcularTotais(itens: CarrinhoItemPublico[]) {
  const totalItens = itens.reduce((acc, item) => acc + item.quantidade, 0)
  const total = itens.reduce((acc, item) => acc + item.valorTotal, 0)
  return { totalItens, total, subtotal: total }
}

const CARRINHO_VAZIO: CarrinhoItemPublico[] = []

/** Itens do carrinho por slug — referência estável quando vazio (evita loop no React 19). */
export function useCardapioCarrinhoItens(slug: string): CarrinhoItemPublico[] {
  return useCardapioCarrinhoStore(s => s.carrinhos[slug] ?? CARRINHO_VAZIO)
}

/** Total de unidades no carrinho (primitivo — seguro como selector). */
export function useCardapioCarrinhoTotalItens(slug: string): number {
  return useCardapioCarrinhoStore(s => {
    const itens = s.carrinhos[slug]
    if (!itens?.length) return 0
    return itens.reduce((acc, item) => acc + item.quantidade, 0)
  })
}

/** Valor total do carrinho (primitivo — seguro como selector). */
export function useCardapioCarrinhoTotal(slug: string): number {
  return useCardapioCarrinhoStore(s => {
    const itens = s.carrinhos[slug]
    if (!itens?.length) return 0
    return itens.reduce((acc, item) => acc + item.valorTotal, 0)
  })
}

interface CardapioCarrinhoState {
  carrinhos: CarrinhosPorSlug
  getItens: (slug: string) => CarrinhoItemPublico[]
  /** Apenas fora de selectors React — retorna novo objeto a cada chamada. */
  getResumo: (slug: string) => { itens: CarrinhoItemPublico[]; totalItens: number; total: number; subtotal: number }
  adicionarItem: (
    slug: string,
    item: Omit<CarrinhoItemPublico, 'id' | 'adicionadoEm'>
  ) => void
  atualizarQuantidade: (slug: string, itemId: string, quantidade: number) => void
  removerItem: (slug: string, itemId: string) => void
  substituirItem: (
    slug: string,
    itemId: string,
    item: Omit<CarrinhoItemPublico, 'id' | 'adicionadoEm'>
  ) => void
  limpar: (slug: string) => void
}

function gerarIdItem(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const useCardapioCarrinhoStore = create<CardapioCarrinhoState>()(
  persist(
    (set, get) => ({
      carrinhos: {},

      getItens: slug => get().carrinhos[slug] ?? CARRINHO_VAZIO,

      getResumo: slug => {
        const itens = get().carrinhos[slug] ?? CARRINHO_VAZIO
        const { totalItens, total, subtotal } = calcularTotais(itens)
        return { itens, totalItens, total, subtotal }
      },

      adicionarItem: (slug, item) =>
        set(state => {
          const atuais = state.carrinhos[slug] ?? []
          const novo: CarrinhoItemPublico = {
            ...item,
            id: gerarIdItem(),
            adicionadoEm: new Date().toISOString(),
          }
          return {
            carrinhos: { ...state.carrinhos, [slug]: [...atuais, novo] },
          }
        }),

      atualizarQuantidade: (slug, itemId, quantidade) =>
        set(state => {
          const atuais = state.carrinhos[slug] ?? []
          const itens = atuais.map(item => {
            if (item.id !== itemId) return item
            const valorTotal = item.valorUnitario * quantidade
            return { ...item, quantidade, valorTotal }
          })
          return { carrinhos: { ...state.carrinhos, [slug]: itens } }
        }),

      removerItem: (slug, itemId) =>
        set(state => ({
          carrinhos: {
            ...state.carrinhos,
            [slug]: (state.carrinhos[slug] ?? []).filter(i => i.id !== itemId),
          },
        })),

      substituirItem: (slug, itemId, item) =>
        set(state => {
          const atuais = state.carrinhos[slug] ?? []
          const itens = atuais.map(existing => {
            if (existing.id !== itemId) return existing
            return {
              ...item,
              id: existing.id,
              adicionadoEm: existing.adicionadoEm,
            }
          })
          return { carrinhos: { ...state.carrinhos, [slug]: itens } }
        }),

      limpar: slug =>
        set(state => {
          const { [slug]: _removed, ...restantes } = state.carrinhos
          return { carrinhos: restantes }
        }),
    }),
    {
      name: 'cardapio-publico-carrinhos',
      partialize: state => ({ carrinhos: state.carrinhos }),
    }
  )
)
