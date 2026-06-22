import { describe, it, expect } from 'vitest'
import {
  extrairDigitosDocumento,
  formatarCpfCnpjInput,
  detectarTipoDocumento,
  documentoParcialInvalido,
  mapearDocumentoParaApi,
  documentoClienteExibicao,
} from '@/src/shared/utils/cpfCnpj'

describe('cpfCnpj', () => {
  describe('extrairDigitosDocumento', () => {
    it('remove não-dígitos e limita a 14', () => {
      expect(extrairDigitosDocumento('12.345.678/9012-34')).toBe('12345678901234')
      expect(extrairDigitosDocumento('123456789012345678')).toBe('12345678901234')
    })
  })

  describe('formatarCpfCnpjInput', () => {
    it('formata CPF parcial e completo', () => {
      expect(formatarCpfCnpjInput('123')).toBe('123')
      expect(formatarCpfCnpjInput('123456')).toBe('123.456')
      expect(formatarCpfCnpjInput('123456789')).toBe('123.456.789')
      expect(formatarCpfCnpjInput('12345678901')).toBe('123.456.789-01')
    })

    it('transição 11→12 dígitos usa máscara de CNPJ', () => {
      expect(formatarCpfCnpjInput('123456789012')).toBe('12.345.678/9012')
    })

    it('formata CNPJ completo', () => {
      expect(formatarCpfCnpjInput('12345678901234')).toBe('12.345.678/9012-34')
    })
  })

  describe('detectarTipoDocumento', () => {
    it('identifica cpf, cnpj, parcial e vazio', () => {
      expect(detectarTipoDocumento('')).toBe('vazio')
      expect(detectarTipoDocumento('12345678901')).toBe('cpf')
      expect(detectarTipoDocumento('12345678901234')).toBe('cnpj')
      expect(detectarTipoDocumento('12345')).toBe('parcial')
    })
  })

  describe('documentoParcialInvalido', () => {
    it('vazio ou completo não é inválido', () => {
      expect(documentoParcialInvalido('')).toBe(false)
      expect(documentoParcialInvalido('123.456.789-01')).toBe(false)
      expect(documentoParcialInvalido('12.345.678/9012-34')).toBe(false)
    })

    it('parcial é inválido', () => {
      expect(documentoParcialInvalido('12345')).toBe(true)
      expect(documentoParcialInvalido('123456789012')).toBe(true)
    })
  })

  describe('mapearDocumentoParaApi', () => {
    it('criação: envia só o campo preenchido', () => {
      expect(mapearDocumentoParaApi('', 'criar')).toEqual({})
      expect(mapearDocumentoParaApi('12345678901', 'criar')).toEqual({ cpf: '12345678901' })
      expect(mapearDocumentoParaApi('12345678901234', 'criar')).toEqual({ cnpj: '12345678901234' })
    })

    it('edição: limpa o campo oposto ao trocar tipo', () => {
      expect(mapearDocumentoParaApi('', 'editar')).toEqual({ cpf: '', cnpj: '' })
      expect(mapearDocumentoParaApi('12345678901', 'editar')).toEqual({
        cpf: '12345678901',
        cnpj: '',
      })
      expect(mapearDocumentoParaApi('12345678901234', 'editar')).toEqual({
        cnpj: '12345678901234',
        cpf: '',
      })
    })
  })

  describe('documentoClienteExibicao', () => {
    it('prioriza cpf ou cnpj e formata', () => {
      expect(documentoClienteExibicao('12345678901', null)).toBe('123.456.789-01')
      expect(documentoClienteExibicao(null, '12345678901234')).toBe('12.345.678/9012-34')
      expect(documentoClienteExibicao(null, null)).toBe('-')
    })
  })
})
