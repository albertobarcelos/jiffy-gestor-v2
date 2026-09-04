import { describe, expect, it } from 'vitest'
import {
  clienteTelefoneContem,
  normalizarTelefoneComparacao,
  telefonesCorrespondem,
  termoBuscaClientePorTelefone,
} from '@/src/shared/utils/telefoneClienteMatch'

describe('telefoneClienteMatch', () => {
  it('iguala cadastro sem DDI e WhatsApp com 55', () => {
    expect(telefonesCorrespondem('65992934536', '5565992934536')).toBe(true)
    expect(telefonesCorrespondem('(65) 99293-4536', '5565992934536')).toBe(true)
  })

  it('não iguala só pelos 8 finais de DDDs diferentes', () => {
    expect(telefonesCorrespondem('65992934536', '11992934536')).toBe(false)
  })

  it('monta termo de busca sem DDI', () => {
    expect(termoBuscaClientePorTelefone('5565992934536')).toBe('65992934536')
    expect(normalizarTelefoneComparacao('5565992934536')).toBe('65992934536')
  })

  it('reconhece dígitos no cadastro', () => {
    expect(clienteTelefoneContem('65992934536', '99293')).toBe(true)
    expect(clienteTelefoneContem('65992934536', 'alb')).toBe(false)
  })
})
