import { describe, expect, it } from 'vitest'
import {
  COBERTURA_PAINEL_ABAS,
  ativoCoberturaPendente,
  camadasMapaCobertura,
  mensagemFalhaLoteCobertura,
  linhaTaxaPrazoPendente,
  parsePrazoDraftCobertura,
  parseTaxaDraftCobertura,
} from '@/src/presentation/components/features/configuracoes/coberturaPainelAbas'

describe('coberturaPainelAbas', () => {
  it('expõe taxas por raio primeiro, depois área e resumo', () => {
    expect(COBERTURA_PAINEL_ABAS.map(aba => aba.id)).toEqual(['raios', 'areas', 'resumo'])
    expect(COBERTURA_PAINEL_ABAS.map(aba => aba.label)).toEqual([
      'Taxas por Raio',
      'Taxas por Área',
      'Resumo',
    ])
  })

  it('mostra no mapa só a camada da aba, e as duas no resumo', () => {
    expect(camadasMapaCobertura('raios')).toEqual({ raios: true, areas: false })
    expect(camadasMapaCobertura('areas')).toEqual({ raios: false, areas: true })
    expect(camadasMapaCobertura('resumo')).toEqual({ raios: true, areas: true })
  })

  it('aceita taxa com vírgula e prazo inteiro', () => {
    expect(parseTaxaDraftCobertura('8,50')).toBe(8.5)
    expect(parsePrazoDraftCobertura('45')).toBe(45)
    expect(parsePrazoDraftCobertura('45,5')).toBeNull()
    expect(linhaTaxaPrazoPendente('8,00', '45', 8, 45)).toBe(false)
    expect(linhaTaxaPrazoPendente('9,00', '45', 8, 45)).toBe(true)
    expect(ativoCoberturaPendente(undefined, true)).toBe(false)
    expect(ativoCoberturaPendente(true, true)).toBe(false)
    expect(ativoCoberturaPendente(false, true)).toBe(true)
    expect(mensagemFalhaLoteCobertura({ ok: 2, total: 5 })).toBe(
      'Salvamos 2 de 5. Tente de novo nas que falharam.'
    )
  })
})
