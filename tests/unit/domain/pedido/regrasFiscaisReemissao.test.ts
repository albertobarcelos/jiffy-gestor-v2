import { describe, expect, it } from 'vitest'
import {
  COOLDOWN_REEMISSAO_FISCAL_PENDENTE_MS,
  fiscalPendentePodeReemitirAposCooldown,
  fiscalPendenteTravadoLimiteTentativas,
  fiscalPendenteTravadoParaReemissao,
  isRetornoSefazLimiteTentativasExcedido,
} from '@/src/domain/services/pedido/RegrasFiscaisVenda'
import {
  fiscalKanbanPodeReemitirAposCooldown,
  deveExibirBotaoEmitirNotaNoKanban,
  kanbanVendaUsaCupomPublicoNfce,
  statusFiscalAguardandoSefaz,
  vendaBloqueadaParaEmissaoInterativa,
} from '@/src/presentation/components/features/kanban/rules/vendasKanban.rules'
import { VendaUnificadaDTO } from '@/features/kanban/hooks/useVendasUnificadas'

const RETORNO_LIMITE = 'Número máximo de tentativas excedido'

function criarVendaKanban(partial: Partial<VendaUnificadaDTO> = {}): VendaUnificadaDTO {
  const base = new VendaUnificadaDTO(
    'venda-1',
    74,
    'V0074',
    'entrega',
    'GESTOR',
    'venda_gestor',
    50,
    0,
    0,
    '2026-06-08T12:00:00.000Z',
    '2026-06-08T12:00:00.000Z',
    null,
    { id: 'c1', nome: 'Cliente' },
    false,
    'PENDENTE',
    'doc-fiscal-1',
    { id: '', nome: '—' }
  )
  return Object.assign(base, {
    retornoSefaz: RETORNO_LIMITE,
    dataUltimaModificacao: '2026-06-08T12:38:00.000Z',
    tipoDocFiscal: 'NFCE' as const,
    modelo: 65 as const,
    ...partial,
  })
}

describe('RegrasFiscaisVenda — reemissão após limite de tentativas', () => {
  it('detecta retorno SEFAZ de limite de tentativas', () => {
    expect(isRetornoSefazLimiteTentativasExcedido(RETORNO_LIMITE)).toBe(true)
    expect(isRetornoSefazLimiteTentativasExcedido('numero maximo de tentativas excedido')).toBe(
      true
    )
    expect(isRetornoSefazLimiteTentativasExcedido('Rejeição: 539')).toBe(false)
  })

  it('identifica PENDENTE travado por limite de tentativas', () => {
    expect(
      fiscalPendenteTravadoParaReemissao({
        statusFiscal: 'PENDENTE',
        retornoSefaz: RETORNO_LIMITE,
      })
    ).toBe(true)
    expect(
      fiscalPendenteTravadoParaReemissao({
        statusFiscal: 'REJEITADA',
        retornoSefaz: RETORNO_LIMITE,
      })
    ).toBe(false)
  })

  it('identifica PENDENTE travado sem retornoSefaz na listagem (documento sem emissão)', () => {
    expect(
      fiscalPendenteTravadoParaReemissao({
        statusFiscal: 'PENDENTE',
        documentoFiscalId: 'doc-1',
        dataEmissaoFiscal: null,
        numeroFiscal: 74,
      })
    ).toBe(true)
    expect(
      fiscalPendenteTravadoParaReemissao({
        statusFiscal: 'PENDENTE',
        documentoFiscalId: null,
        dataEmissaoFiscal: null,
        numeroFiscal: null,
      })
    ).toBe(false)
  })

  it('libera reemissão somente após 10 minutos da última modificação', () => {
    const referencia = '2026-06-08T12:00:00.000Z'
    const antesDoCooldown = new Date('2026-06-08T12:09:59.000Z').getTime()
    const aposCooldown = new Date('2026-06-08T12:10:00.000Z').getTime()

    const input = {
      statusFiscal: 'PENDENTE',
      retornoSefaz: RETORNO_LIMITE,
      dataUltimaModificacao: referencia,
    }

    expect(fiscalPendentePodeReemitirAposCooldown(input, antesDoCooldown)).toBe(false)
    expect(fiscalPendentePodeReemitirAposCooldown(input, aposCooldown)).toBe(true)
    expect(COOLDOWN_REEMISSAO_FISCAL_PENDENTE_MS).toBe(10 * 60 * 1000)
  })
})

describe('vendasKanban.rules — desbloqueio no Kanban', () => {
  it('deixa de aguardar SEFAZ e desbloqueia botão após cooldown', () => {
    const agora = Date.now()
    const vendaRecente = criarVendaKanban({
      dataUltimaModificacao: new Date(agora - 5 * 60 * 1000).toISOString(),
    })
    const vendaAposCooldown = criarVendaKanban({
      dataUltimaModificacao: new Date(agora - 11 * 60 * 1000).toISOString(),
    })

    expect(fiscalKanbanPodeReemitirAposCooldown(vendaRecente)).toBe(false)
    expect(statusFiscalAguardandoSefaz(vendaRecente)).toBe(true)
    expect(vendaBloqueadaParaEmissaoInterativa(vendaRecente, {})).toBe(true)

    expect(fiscalKanbanPodeReemitirAposCooldown(vendaAposCooldown)).toBe(true)
    expect(statusFiscalAguardandoSefaz(vendaAposCooldown)).toBe(false)
    expect(vendaBloqueadaParaEmissaoInterativa(vendaAposCooldown, {})).toBe(false)
    expect(
      deveExibirBotaoEmitirNotaNoKanban('COM_FISCAL', vendaAposCooldown, {})
    ).toBe(true)
  })

  it('libera reemissão para PENDENTE com documento mesmo sem retornoSefaz na listagem', () => {
    const agora = Date.now()
    const venda = criarVendaKanban({
      retornoSefaz: null,
      documentoFiscalId: 'doc-fiscal-1',
      numeroFiscal: 74,
      dataEmissaoFiscal: null,
      dataFinalizacao: new Date(agora - 11 * 60 * 1000).toISOString(),
    })

    expect(fiscalKanbanPodeReemitirAposCooldown(venda)).toBe(true)
    expect(deveExibirBotaoEmitirNotaNoKanban('COM_FISCAL', venda, {})).toBe(true)
  })

  it('move card para pendente emissão após cooldown', () => {
    const venda = criarVendaKanban({
      dataUltimaModificacao: '2026-06-08T12:00:00.000Z',
    })

    const agoraAnterior = Date.now
    Date.now = () => new Date('2026-06-08T12:11:00.000Z').getTime()
    expect(venda.getEtapaKanban()).toBe('PENDENTE_EMISSAO')
    Date.now = agoraAnterior
  })

  it('exibe botão reemitir em Com Nota Solicitada para REJEITADA', () => {
    const venda = criarVendaKanban({
      statusFiscal: 'REJEITADA',
      numeroFiscal: 333,
      serieFiscal: '2',
    })
    expect(deveExibirBotaoEmitirNotaNoKanban('COM_FISCAL', venda, {})).toBe(true)
  })
})

describe('getEtapaKanban — REJEITADA com numeração', () => {
  it('coloca REJEITADA com número e série em Com Nota Solicitada', () => {
    const venda = criarVendaKanban({
      statusFiscal: 'REJEITADA',
      numeroFiscal: 333,
      serieFiscal: '2',
      retornoSefaz: null,
    })
    expect(venda.getEtapaKanban()).toBe('COM_FISCAL')
  })

  it('mantém REJEITADA sem numeração em Pendente Emissão', () => {
    const venda = criarVendaKanban({
      statusFiscal: 'REJEITADA',
      numeroFiscal: null,
      serieFiscal: null,
      retornoSefaz: null,
    })
    expect(venda.getEtapaKanban()).toBe('PENDENTE_EMISSAO')
  })
})

describe('kanbanVendaUsaCupomPublicoNfce', () => {
  it('habilita cupom público para NFC-e de PDV, gestor e delivery Jiffy', () => {
    expect(
      kanbanVendaUsaCupomPublicoNfce(
        criarVendaKanban({ origem: 'PDV', tipoDocFiscal: 'NFCE' })
      )
    ).toBe(true)
    expect(
      kanbanVendaUsaCupomPublicoNfce(
        criarVendaKanban({ origem: 'GESTOR', tipoDocFiscal: 'NFCE' })
      )
    ).toBe(true)
    expect(
      kanbanVendaUsaCupomPublicoNfce(
        criarVendaKanban({ origem: 'JIFFY_DELIVERY', tipoDocFiscal: 'NFCE' })
      )
    ).toBe(true)
    expect(
      kanbanVendaUsaCupomPublicoNfce(
        criarVendaKanban({ origem: 'PDV', tipoDocFiscal: 'NFE' })
      )
    ).toBe(false)
    expect(
      kanbanVendaUsaCupomPublicoNfce(
        criarVendaKanban({ origem: 'DELIVERY_IFOOD', tipoDocFiscal: 'NFCE' })
      )
    ).toBe(false)
  })
})
