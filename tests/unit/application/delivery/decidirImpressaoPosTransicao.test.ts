import { describe, expect, it } from 'vitest'
import {
  decidirImpressaoAposAcao,
  ehAcaoImpressaoAutomatica,
  tipoDedupePorAcaoAutomatica,
} from '@/src/application/delivery/decidirImpressaoPosTransicao'
import { DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY } from '@/src/shared/types/deliveryImpressao'

const separado = {
  ...DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY,
  modo: 'separado' as const,
  imprimirAoReceber: true,
  imprimirAoFicarPronto: true,
}

const unificado = {
  ...DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY,
  modo: 'unificado' as const,
  imprimirAoReceber: true,
  imprimirAoFicarPronto: true,
  copiasCupomUnificado: 2,
}

describe('decidirImpressaoAposAcao', () => {
  it('não imprime produção se a opção estiver desligada', () => {
    expect(
      decidirImpressaoAposAcao({ ...separado, imprimirAoReceber: false }, 'iniciar_preparo')
    ).toEqual({ imprimir: false, tipoCupom: null, copies: 1 })
    expect(
      decidirImpressaoAposAcao({ ...unificado, imprimirAoReceber: false }, 'iniciar_preparo')
    ).toEqual({ imprimir: false, tipoCupom: null, copies: 1 })
  })

  it('não imprime expedição se a opção estiver desligada', () => {
    expect(
      decidirImpressaoAposAcao({ ...separado, imprimirAoFicarPronto: false }, 'marcar_pronto')
    ).toEqual({ imprimir: false, tipoCupom: null, copies: 1 })
  })

  it('imprime produção e expedição no separado quando as opções estão ligadas', () => {
    expect(decidirImpressaoAposAcao(separado, 'iniciar_preparo')).toEqual({
      imprimir: true,
      tipoCupom: 'producao_cozinha',
      copies: 1,
    })
    expect(decidirImpressaoAposAcao(separado, 'marcar_pronto')).toEqual({
      imprimir: true,
      tipoCupom: 'expedicao',
      copies: 1,
    })
  })

  it('no unificado imprime só o cupom completo ao iniciar preparo', () => {
    expect(decidirImpressaoAposAcao(unificado, 'iniciar_preparo')).toEqual({
      imprimir: true,
      tipoCupom: 'producao_completa',
      copies: 2,
    })
    expect(decidirImpressaoAposAcao(unificado, 'marcar_pronto')).toEqual({
      imprimir: false,
      tipoCupom: null,
      copies: 1,
    })
  })

  it('não imprime em ação que não dispara cupom', () => {
    expect(decidirImpressaoAposAcao(separado, 'despachar')).toEqual({
      imprimir: false,
      tipoCupom: null,
      copies: 1,
    })
  })
})

describe('tipoDedupePorAcaoAutomatica', () => {
  it('separa preparo de expedição só para anti-duplicata', () => {
    expect(tipoDedupePorAcaoAutomatica('iniciar_preparo')).toBe('comando')
    expect(tipoDedupePorAcaoAutomatica('marcar_pronto')).toBe('expedicao')
  })
})

describe('ehAcaoImpressaoAutomatica', () => {
  it('reconhece só iniciar preparo e marcar pronto', () => {
    expect(ehAcaoImpressaoAutomatica('iniciar_preparo')).toBe(true)
    expect(ehAcaoImpressaoAutomatica('marcar_pronto')).toBe(true)
    expect(ehAcaoImpressaoAutomatica('despachar')).toBe(false)
  })
})
