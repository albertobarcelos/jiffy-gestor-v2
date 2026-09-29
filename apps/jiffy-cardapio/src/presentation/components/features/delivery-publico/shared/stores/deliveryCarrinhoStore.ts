'use client'

import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type {
  ItemCarrinhoComplemento,
  ItemCarrinhoDelivery,
} from '@/src/domain/types/carrinho'
import { generateUuid } from '@/src/shared/utils/generateUuid'
import {
  encontrarItemIgual,
  normalizarItemCarrinho,
  recalcularLinhaCarrinho,
  valorUnitarioBaseProduto,
} from '../utils/deliveryCarrinhoItemUtils'

/** Alias de presentation sobre o tipo canônico de domínio. */
export type DeliveryCarrinhoComplemento = ItemCarrinhoComplemento
export type DeliveryCarrinhoItem = ItemCarrinhoDelivery

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
  return generateUuid()
}

function mesclarQuantidade(
  existente: DeliveryCarrinhoItem,
  quantidadeExtra: number,
  valorUnitarioBase: number
): DeliveryCarrinhoItem {
  const normalizado = normalizarItemCarrinho(existente)
  const recalculado = recalcularLinhaCarrinho({
    produtoId: normalizado.produtoId,
    produtoNome: normalizado.produtoNome,
    produtoImagemUrl: normalizado.produtoImagemUrl,
    quantidade: normalizado.quantidade + quantidadeExtra,
    observacoes: normalizado.observacoes,
    complementos: normalizado.complementos,
    valorUnitarioBase,
  })
  return {
    ...recalculado,
    id: normalizado.id,
    // Último lançamento — miniaturas do footer seguem esta ordem.
    adicionadoEm: new Date().toISOString(),
  }
}

function montarItemNovo(
  item: Omit<DeliveryCarrinhoItem, 'id' | 'adicionadoEm'>
): DeliveryCarrinhoItem {
  const base = valorUnitarioBaseProduto({
    ...item,
    id: 'tmp',
    adicionadoEm: '',
  })
  const recalculado = recalcularLinhaCarrinho({
    produtoId: item.produtoId,
    produtoNome: item.produtoNome,
    produtoImagemUrl: item.produtoImagemUrl,
    quantidade: item.quantidade,
    observacoes: item.observacoes,
    complementos: item.complementos,
    valorUnitarioBase: base,
  })
  return {
    ...recalculado,
    id: gerarIdItem(),
    adicionadoEm: new Date().toISOString(),
  }
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

/** Total de unidades no carrinho (primitivo — seguro como selector). */
export function useDeliveryCarrinhoTotalItens(slug: string): number {
  return useDeliveryCarrinhoStore(s => {
    const itens = s.carrinhos[slug]
    if (!itens?.length) return 0
    return itens.reduce((acc, item) => acc + item.quantidade, 0)
  })
}

/** Valor total do carrinho (primitivo — seguro como selector). */
export function useDeliveryCarrinhoTotal(slug: string): number {
  return useDeliveryCarrinhoStore(s => {
    const itens = s.carrinhos[slug]
    if (!itens?.length) return 0
    return itens.reduce((acc, item) => acc + item.valorTotal, 0)
  })
}

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
          const candidato = {
            ...item,
            quantidade: Math.max(1, Math.floor(item.quantidade)),
          }
          const igual = encontrarItemIgual(atuais, candidato)
          if (igual) {
            const base = valorUnitarioBaseProduto({
              ...candidato,
              id: 'tmp',
              adicionadoEm: '',
            })
            return {
              carrinhos: {
                ...state.carrinhos,
                [slug]: atuais.map(existing =>
                  existing.id === igual.id
                    ? mesclarQuantidade(existing, candidato.quantidade, base)
                    : existing
                ),
              },
            }
          }

          return {
            carrinhos: { ...state.carrinhos, [slug]: [...atuais, montarItemNovo(candidato)] },
          }
        }),

      atualizarQuantidade: (slug, itemId, quantidade) =>
        set(state => {
          const atuais = state.carrinhos[slug] ?? []
          const qtd = Math.max(1, Math.floor(quantidade))
          const itens = atuais.map(item => {
            if (item.id !== itemId) return item
            const normalizado = normalizarItemCarrinho(item)
            const recalculado = recalcularLinhaCarrinho({
              produtoId: normalizado.produtoId,
              produtoNome: normalizado.produtoNome,
              produtoImagemUrl: normalizado.produtoImagemUrl,
              quantidade: qtd,
              observacoes: normalizado.observacoes,
              complementos: normalizado.complementos,
              valorUnitarioBase: normalizado.valorUnitario,
            })
            return {
              ...recalculado,
              id: normalizado.id,
              adicionadoEm: normalizado.adicionadoEm,
            }
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
          const candidato = {
            ...item,
            quantidade: Math.max(1, Math.floor(item.quantidade)),
          }
          const base = valorUnitarioBaseProduto({
            ...candidato,
            id: 'tmp',
            adicionadoEm: '',
          })
          const igual = encontrarItemIgual(atuais, candidato, itemId)

          if (igual) {
            const mesclado = mesclarQuantidade(igual, candidato.quantidade, base)
            return {
              carrinhos: {
                ...state.carrinhos,
                [slug]: atuais
                  .filter(existing => existing.id !== itemId)
                  .map(existing => (existing.id === igual.id ? mesclado : existing)),
              },
            }
          }

          const recalculado = recalcularLinhaCarrinho({
            produtoId: candidato.produtoId,
            produtoNome: candidato.produtoNome,
            produtoImagemUrl: candidato.produtoImagemUrl,
            quantidade: candidato.quantidade,
            observacoes: candidato.observacoes,
            complementos: candidato.complementos,
            valorUnitarioBase: base,
          })
          const itens = atuais.map(existing => {
            if (existing.id !== itemId) return existing
            return {
              ...recalculado,
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
      onRehydrateStorage: () => state => {
        if (!state?.carrinhos) return
        const next: CarrinhosPorSlug = {}
        for (const [slug, itens] of Object.entries(state.carrinhos)) {
          next[slug] = itens.map(normalizarItemCarrinho)
        }
        state.carrinhos = next
      },
    }
  )
)
