import { describe, expect, it } from 'vitest'
import {
  INFORMACOES_ADICIONAIS_NOTA_MAX,
  anexarInformacoesAdicionaisEmitirNota,
  informacoesAdicionaisFromTexto,
  obterRascunhoInformacoesAdicionais,
  salvarRascunhoInformacoesAdicionais,
} from '@/src/shared/helpers/informacoesAdicionaisNota'

describe('informacoesAdicionaisFromTexto', () => {
  it('omite vazio', () => {
    expect(informacoesAdicionaisFromTexto('  ')).toBeUndefined()
  })

  it('trim e respeita o máximo de 3500', () => {
    expect(informacoesAdicionaisFromTexto('  Pedido 123  ')).toBe('Pedido 123')
    const longo = 'a'.repeat(INFORMACOES_ADICIONAIS_NOTA_MAX + 10)
    expect(informacoesAdicionaisFromTexto(longo)?.length).toBe(INFORMACOES_ADICIONAIS_NOTA_MAX)
  })
})

describe('anexarInformacoesAdicionaisEmitirNota', () => {
  it('envia informacoesAdicionais no body do emitir-nota', () => {
    salvarRascunhoInformacoesAdicionais('venda-1', '  Inf. complementar  ')
    const body = anexarInformacoesAdicionaisEmitirNota({ modelo: 65 }, 'venda-1')
    expect(body).toEqual({ modelo: 65, informacoesAdicionais: 'Inf. complementar' })
    expect(obterRascunhoInformacoesAdicionais('venda-1')).toBe('Inf. complementar')
  })

  it('texto explícito prevalece sobre o rascunho', () => {
    salvarRascunhoInformacoesAdicionais('venda-2', 'rascunho')
    const body = anexarInformacoesAdicionaisEmitirNota({ modelo: 55 }, 'venda-2', '  da tela  ')
    expect(body.informacoesAdicionais).toBe('da tela')
  })
})
