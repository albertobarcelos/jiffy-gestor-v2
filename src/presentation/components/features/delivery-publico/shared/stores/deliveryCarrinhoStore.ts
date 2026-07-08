'use client'

import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'

export type DeliveryCarrinhoComplemento = {
  complementoId: string
  grupoComplementoId: string
  quantidade: number
  nome: string
  valor: number
  tipoImpactoPreco: string
}

export type DeliveryCarrinhoItem = {
  id: string
  produtoId: string
  produtoNome: string
  produtoImagemUrl: string | null
  quantidade: number
  valorUnitario: number
  valorTotal: number
  observacoes: string[]
  complementos: DeliveryCarrinhoComplemento[]
  adicionadoEm: string
}

/** @deprecated Use DeliveryCarrinhoComplemento */
export type CarrinhoComplementoPublico = DeliveryCarrinhoComplemento

/** @deprecated Use DeliveryCarrinhoItem */
export type CarrinhoItemPublico = DeliveryCarrinhoItem

type CarrinhosPorSlug = Record<string, DeliveryCarrinhoItem[]>

const STORAGE_KEY = 'jiffy:delivery-publico-carrinhos'
const LEGACY_STORAGE_KEY = 'cardapio-publico-carrinhos'

const CARRINHO_VAZIO: DeliveryCarrinhoItem[] = []

function calcularTotais(itens: DeliveryCarrinhoItem[]) {
  const totalItens = itens.reduce((acc, item) => acc + item.quantidade, 0)
  const total = itens.reduce((acc, item) => acc + item.valorTotal, 0)
  return { totalItens, total, subtotal: total }
}

function gerarIdItem(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const deliveryCarrinhoStorage: StateStorage = {
  getItem: name => {
    if (typeof window === 'undefined') return null
    const current = localStorage.getItem(name)
    if (current) return current

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacy) return null

    localStorage.setItem(name, legacy)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    return legacy
  },
  setItem: (name, value) => {
    localStorage.setItem(name, value)
  },
  removeItem: name => {
    localStorage.removeItem(name)
  },
}

/** Itens do carrinho por slug — referência estável quando vazio (evita loop no React 19). */
export function useDeliveryCarrinhoItens(slug: string): DeliveryCarrinhoItem[] {
  return useDeliveryCarrinhoStore(s => s.carrinhos[slug] ?? CARRINHO_VAZIO)
}

/** @deprecated Use useDeliveryCarrinhoItens */
export const useCardapioCarrinhoItens = useDeliveryCarrinhoItens

/** Total de unidades no carrinho (primitivo — seguro como selector). */
export function useDeliveryCarrinhoTotalItens(slug: string): number {
  return useDeliveryCarrinhoStore(s => {
    const itens = s.carrinhos[slug]
    if (!itens?.length) return 0
    return itens.reduce((acc, item) => acc + item.quantidade, 0)
  })
}

/** @deprecated Use useDeliveryCarrinhoTotalItens */
export const useCardapioCarrinhoTotalItens = useDeliveryCarrinhoTotalItens

/** Valor total do carrinho (primitivo — seguro como selector). */
export function useDeliveryCarrinhoTotal(slug: string): number {
  return useDeliveryCarrinhoStore(s => {
    const itens = s.carrinhos[slug]
    if (!itens?.length) return 0
    return itens.reduce((acc, item) => acc + item.valorTotal, 0)
  })
}

/** @deprecated Use useDeliveryCarrinhoTotal */
export const useCardapioCarrinhoTotal = useDeliveryCarrinhoTotal

interface DeliveryCarrinhoState {
  carrinhos: CarrinhosPorSlug
  getItens: (slug: string) => DeliveryCarrinhoItem[]
  getResumo: (slug: string) => {
    itens: DeliveryCarrinhoItem[]
    totalItens: number
    total: number
    subtotal: number
  }
  adicionarItem: (
    slug: string,
    item: Omit<DeliveryCarrinhoItem, 'id' | 'adicionadoEm'>
  ) => void
  atualizarQuantidade: (slug: string, itemId: string, quantidade: number) => void
  removerItem: (slug: string, itemId: string) => void
  substituirItem: (
    slug: string,
    itemId: string,
    item: Omit<DeliveryCarrinhoItem, 'id' | 'adicionadoEm'>
  ) => void
  limpar: (slug: string) => void
}

export const useDeliveryCarrinhoStore = create<DeliveryCarrinhoState>()(
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
          const novo: DeliveryCarrinhoItem = {
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
      name: STORAGE_KEY,
      storage: createJSONStorage(() => deliveryCarrinhoStorage),
      partialize: state => ({ carrinhos: state.carrinhos }),
    }
  )
)

/** @deprecated Use useDeliveryCarrinhoStore */
export const useCardapioCarrinhoStore = useDeliveryCarrinhoStore
