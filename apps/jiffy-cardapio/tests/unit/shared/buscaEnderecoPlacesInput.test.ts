import { describe, expect, it } from 'vitest'
import {
  digitosCepDaBuscaEnderecoPlaces,
  formatarBuscaEnderecoPlacesInput,
  resolverModoMascaraBuscaEnderecoPlaces,
} from '@/src/shared/utils/buscaEnderecoPlacesInput'

describe('buscaEnderecoPlacesInput', () => {
  describe('resolverModoMascaraBuscaEnderecoPlaces', () => {
    it('vazio quando não há caractere significativo', () => {
      expect(resolverModoMascaraBuscaEnderecoPlaces('')).toBe('vazio')
      expect(resolverModoMascaraBuscaEnderecoPlaces('   ')).toBe('vazio')
    })

    it('cep quando começa com dígito', () => {
      expect(resolverModoMascaraBuscaEnderecoPlaces('1')).toBe('cep')
      expect(resolverModoMascaraBuscaEnderecoPlaces('  01310')).toBe('cep')
      expect(resolverModoMascaraBuscaEnderecoPlaces('01310-100')).toBe('cep')
    })

    it('livre quando começa com letra, mesmo com CEP no meio', () => {
      expect(resolverModoMascaraBuscaEnderecoPlaces('R')).toBe('livre')
      expect(resolverModoMascaraBuscaEnderecoPlaces('Rua Augusta, 01310-100')).toBe('livre')
      expect(resolverModoMascaraBuscaEnderecoPlaces('  Av Paulista')).toBe('livre')
    })
  })

  describe('formatarBuscaEnderecoPlacesInput', () => {
    it('aplica máscara CEP só no modo cep', () => {
      expect(formatarBuscaEnderecoPlacesInput('01310100')).toBe('01310-100')
      expect(formatarBuscaEnderecoPlacesInput('01310')).toBe('01310')
      expect(formatarBuscaEnderecoPlacesInput('01310a100')).toBe('01310-100')
    })

    it('no modo livre não mascara CEP embutido', () => {
      expect(formatarBuscaEnderecoPlacesInput('Rua 01310100')).toBe('Rua 01310100')
      expect(
        formatarBuscaEnderecoPlacesInput('rua augusta', { upperCaseLivre: true })
      ).toBe('RUA AUGUSTA')
    })

    it('reinicia ao limpar', () => {
      expect(formatarBuscaEnderecoPlacesInput('')).toBe('')
    })
  })

  describe('digitosCepDaBuscaEnderecoPlaces', () => {
    it('só retorna dígitos em modo cep', () => {
      expect(digitosCepDaBuscaEnderecoPlaces('01310-100')).toBe('01310100')
      expect(digitosCepDaBuscaEnderecoPlaces('Rua 01310-100')).toBe('')
    })
  })
})
