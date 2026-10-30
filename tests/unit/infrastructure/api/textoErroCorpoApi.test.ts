import { describe, expect, it } from 'vitest'
import {
  ApiError,
  mensagemLegivelErro,
  textoErroCorpoApi,
} from '@/src/infrastructure/api/apiClient'

describe('textoErroCorpoApi', () => {
  it('lê a mensagem do primeiro item quando o corpo é um array Zod', () => {
    expect(textoErroCorpoApi([{ message: 'Informe o nome do complemento' }])).toBe(
      'Informe o nome do complemento'
    )
  })

  it('lê o JSON stringificado no message do Error', () => {
    expect(
      textoErroCorpoApi('[{"message":"Informe o nome do complemento"}]')
    ).toBe('Informe o nome do complemento')
  })
})

describe('mensagemLegivelErro', () => {
  it('usa o texto do corpo quando o Error traz JSON de validação', () => {
    expect(
      mensagemLegivelErro(
        new Error('[{"message":"Informe o nome do complemento"}]'),
        'Erro ao salvar complemento'
      )
    ).toBe('Informe o nome do complemento')
  })

  it('usa ApiError com issues', () => {
    expect(
      mensagemLegivelErro(
        new ApiError('Erro ao criar', 400, { issues: [{ message: 'Nome obrigatório' }] }),
        'Erro ao salvar complemento'
      )
    ).toBe('Nome obrigatório')
  })

  it('cai no fallback quando não há mensagem', () => {
    expect(mensagemLegivelErro({}, 'Erro ao salvar complemento')).toBe(
      'Erro ao salvar complemento'
    )
  })
})
