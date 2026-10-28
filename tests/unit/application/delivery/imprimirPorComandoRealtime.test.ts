import { beforeEach, describe, expect, it, vi } from 'vitest'
import { imprimirPorComandoRealtime } from '@/src/application/delivery/imprimirPorComandoRealtime'
import { DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY } from '@/src/shared/types/deliveryImpressao'

const carregarPayload = vi.fn()
const imprimirTickets = vi.fn()

describe('imprimirPorComandoRealtime', () => {
  beforeEach(() => {
    carregarPayload.mockReset()
    imprimirTickets.mockReset()
  })

  it('não busca ticket se a produção automática estiver desligada', async () => {
    const resultado = await imprimirPorComandoRealtime({
      vendaId: 'v-1',
      acao: 'iniciar_preparo',
      accessToken: 'token',
      prefs: { ...DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY, imprimirAoReceber: false },
      carregarPayload,
      imprimirTickets,
    })

    expect(resultado).toBe('skipped_pref')
    expect(carregarPayload).not.toHaveBeenCalled()
    expect(imprimirTickets).not.toHaveBeenCalled()
  })

  it('não busca ticket se a expedição automática estiver desligada', async () => {
    const resultado = await imprimirPorComandoRealtime({
      vendaId: 'v-1',
      acao: 'marcar_pronto',
      accessToken: 'token',
      prefs: {
        ...DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY,
        modo: 'separado',
        imprimirAoFicarPronto: false,
      },
      carregarPayload,
      imprimirTickets,
    })

    expect(resultado).toBe('skipped_pref')
    expect(carregarPayload).not.toHaveBeenCalled()
    expect(imprimirTickets).not.toHaveBeenCalled()
  })
})
