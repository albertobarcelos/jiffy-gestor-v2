'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  DEFAULT_DELIVERY_TIPO_ENTREGA,
  type DeliveryTipoEntrega,
} from '@/src/domain/types/entrega'

export type { DeliveryTipoEntrega }
export { DEFAULT_DELIVERY_TIPO_ENTREGA }

const STORAGE_KEY = 'jiffy:delivery-publico-preferencias'

type PreferenciasPorSlug = Record<string, DeliveryTipoEntrega>

interface DeliveryPreferenciaEntregaState {
  preferencias: PreferenciasPorSlug
  getTipoEntrega: (slug: string) => DeliveryTipoEntrega
  setTipoEntrega: (slug: string, tipo: DeliveryTipoEntrega) => void
}

export const useDeliveryPreferenciaEntregaStore = create<DeliveryPreferenciaEntregaState>()(
  persist(
    (set, get) => ({
      preferencias: {},

      getTipoEntrega: slug => {
        const trimmed = slug.trim()
        if (!trimmed) return DEFAULT_DELIVERY_TIPO_ENTREGA
        return get().preferencias[trimmed] ?? DEFAULT_DELIVERY_TIPO_ENTREGA
      },

      setTipoEntrega: (slug, tipo) => {
        const trimmed = slug.trim()
        if (!trimmed) return
        set(state => ({
          preferencias: { ...state.preferencias, [trimmed]: tipo },
        }))
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({ preferencias: state.preferencias }),
    }
  )
)
