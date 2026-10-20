import { describe, expect, it } from 'vitest'
import {
  contarDigitosAtePosicao,
  formatarCepMascara,
  mapearPosicaoCaretMascaraCep,
} from '@/src/shared/utils/consultaCep'
import {
  erroGeocodeEhSemResultado,
  mensagemAmigavelErroGeolocalizacao,
} from '@/src/shared/utils/geolocalizacaoEnderecoShared'

describe('consultaCep máscara e caret', () => {
  it('formata CEP com hífen após 5 dígitos', () => {
    expect(formatarCepMascara('78390000')).toBe('78390-000')
    expect(formatarCepMascara('78390')).toBe('78390')
  })

  it('mantém caret no meio ao mapear dígitos na máscara', () => {
    // Digitando no meio de 78390-000: 3 dígitos antes do caret → posição 3 em "783"
    expect(mapearPosicaoCaretMascaraCep('78390-000', 3)).toBe(3)
    // Após o 5º dígito o caret fica depois do hífen
    expect(mapearPosicaoCaretMascaraCep('78390-000', 5)).toBe(5)
    expect(mapearPosicaoCaretMascaraCep('78390-000', 6)).toBe(7)
  })

  it('conta dígitos até a posição ignorando o hífen', () => {
    expect(contarDigitosAtePosicao('78390-000', 6)).toBe(5) // caret no hífen
    expect(contarDigitosAtePosicao('78390-000', 7)).toBe(6)
  })
})

describe('mensagem amigável de geocode', () => {
  it('detecta ZERO_RESULTS e mensagens amigáveis de não encontrado', () => {
    expect(erroGeocodeEhSemResultado(new Error('ZERO_RESULTS'))).toBe(true)
    expect(
      erroGeocodeEhSemResultado(
        new Error('Não achamos esse endereço exato no mapa. Confira os dados ou marque o local arrastando o pin.')
      )
    ).toBe(true)
    expect(erroGeocodeEhSemResultado(new Error('Timeout na rede'))).toBe(false)
  })

  it('humaniza falha sem resultado sem travar o cliente no formulário', () => {
    const msg = mensagemAmigavelErroGeolocalizacao(new Error('ZERO_RESULTS'), 'geocode')
    expect(msg.toLowerCase()).toContain('mapa')
    expect(msg.toLowerCase()).toMatch(/pin|dados/)
  })
})
