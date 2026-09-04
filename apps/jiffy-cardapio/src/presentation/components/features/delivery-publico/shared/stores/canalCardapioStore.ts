import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CanalPedidoCardapio } from '@/src/shared/types/canalPedidoCardapio'

type CanalCardapioState = {
  /** Canal ativo nesta sessão do Cardápio. */
  canal: CanalPedidoCardapio
  mesaId: string | null
  comandaCodigo: string | null
  /** Tablet / kiosk na mesa (mesmo canal `mesa`, UI maior depois). */
  superficieTablet: boolean
  setCanalEntregaOuRetirada: (canal: 'entrega' | 'retirada') => void
  setCanalMesa: (mesaId: string, opts?: { tablet?: boolean }) => void
  setCanalComanda: (codigo: string) => void
  clearCanalLocal: () => void
}

const INITIAL: Pick<
  CanalCardapioState,
  'canal' | 'mesaId' | 'comandaCodigo' | 'superficieTablet'
> = {
  canal: 'entrega',
  mesaId: null,
  comandaCodigo: null,
  superficieTablet: false,
}

/**
 * Contexto de canal do Cardápio (entrega / retirada / mesa / comanda).
 * Persistido por aba para sobreviver a refresh no QR da mesa.
 */
export const useCanalCardapioStore = create<CanalCardapioState>()(
  persist(
    set => ({
      ...INITIAL,
      setCanalEntregaOuRetirada: canal =>
        set({
          canal,
          mesaId: null,
          comandaCodigo: null,
          superficieTablet: false,
        }),
      setCanalMesa: (mesaId, opts) =>
        set({
          canal: 'mesa',
          mesaId: mesaId.trim(),
          comandaCodigo: null,
          superficieTablet: Boolean(opts?.tablet),
        }),
      setCanalComanda: codigo =>
        set({
          canal: 'comanda',
          comandaCodigo: codigo.trim(),
          mesaId: null,
          superficieTablet: false,
        }),
      clearCanalLocal: () => set({ ...INITIAL }),
    }),
    { name: 'jiffy-cardapio:canal' }
  )
)
