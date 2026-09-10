import { beforeEach, describe, expect, it, vi } from 'vitest'
import { validarImpressaoAntesTransicaoKanban } from '@/src/application/delivery/validarImpressaoAntesTransicaoKanban'
import { carregarPayloadTicketsImpressaoDelivery } from '@/src/application/delivery/carregarPayloadTicketsImpressaoDelivery'
import {
  TOAST_IMPRESSORA_PRODUCAO_MAPEAMENTO_WINDOWS,
  TOAST_QUADRO_SEGUE_SEM_EXPEDICAO_ESCOLHIDA,
} from '@/src/shared/utils/deliveryImpressoraExpedicao'
import type { PreferenciasImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'
import type { VendaGestorTicket, VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'

vi.mock('@/src/application/delivery/carregarPayloadTicketsImpressaoDelivery', () => ({
  carregarPayloadTicketsImpressaoDelivery: vi.fn(),
}))

const carregarMock = vi.mocked(carregarPayloadTicketsImpressaoDelivery)

const prefsSeparado: PreferenciasImpressaoDelivery = {
  modo: 'separado',
  copiasCupomUnificado: 1,
  autoIniciarPreparoNovosPedidos: true,
  imprimirAoReceber: true,
  imprimirAoFicarPronto: true,
  impressoraExpedicaoId: 'exp-1',
  impressoraPadraoNome: null,
}

function payloadCom(tickets: VendaGestorTicket[]): VendaGestorTicketsResponse {
  return {
    vendaId: 'v1',
    numeroVenda: 1,
    tickets,
  } as VendaGestorTicketsResponse
}

describe('validarImpressaoAntesTransicaoKanban', () => {
  beforeEach(() => {
    carregarMock.mockReset()
  })

  it('avança e avisa quando a cozinha não está vinculada neste PC', async () => {
    carregarMock.mockResolvedValue({
      ok: true,
      data: payloadCom([
        {
          tipoCupom: 'producao',
          impressoraId: 'cozinha-1',
          impressoraNome: 'COZINHA',
          impressora: { id: 'cozinha-1', nome: 'COZINHA', nomeImpressoraWindows: null },
          copias: 1,
          itens: [{ nomeProduto: 'Espeto' }],
        },
      ]),
    })

    const resultado = await validarImpressaoAntesTransicaoKanban({
      vendaId: 'v1',
      token: 't',
      prefs: prefsSeparado,
      acoes: ['iniciar_preparo'],
    })

    expect(resultado.podeAvancar).toBe(true)
    expect(resultado.abrirModalConfig).toBe(false)
    expect(resultado.toastWarning).toBe(TOAST_IMPRESSORA_PRODUCAO_MAPEAMENTO_WINDOWS('COZINHA'))
    expect(resultado.toastWarning).toContain('fluxo segue mesmo sem o papel')
  })

  it('avança e avisa quando falta impressora de expedição', async () => {
    carregarMock.mockResolvedValue({
      ok: true,
      data: payloadCom([]),
    })

    const resultado = await validarImpressaoAntesTransicaoKanban({
      vendaId: 'v1',
      token: 't',
      prefs: { ...prefsSeparado, impressoraExpedicaoId: null },
      acoes: ['marcar_pronto'],
    })

    expect(resultado.podeAvancar).toBe(true)
    expect(resultado.abrirModalConfig).toBe(false)
    expect(resultado.toastWarning).toBe(TOAST_QUADRO_SEGUE_SEM_EXPEDICAO_ESCOLHIDA)
  })
})
