import { describe, expect, it } from 'vitest'
import { escolherClienteDaConversa } from '@/src/presentation/gestor-pedidos/whatsapp/escolherClienteDaConversa'

function cliente(nome: string, telefone: string | null) {
  return {
    getNome: () => nome,
    getTelefone: () => telefone,
  }
}

describe('escolherClienteDaConversa', () => {
  it('vincula pelo telefone quando há um único cadastro', () => {
    const lista = [cliente('Ana', '65992934536'), cliente('Bia', '11988887777')]
    expect(escolherClienteDaConversa(lista, '5565992934536', 'WhatsApp')?.getNome()).toBe('Ana')
  })

  it('vincula pelo nome quando o título não é genérico', () => {
    const lista = [cliente('Alberto Barcelos', null)]
    expect(escolherClienteDaConversa(lista, null, 'ALBERTO BARCELOS')?.getNome()).toBe(
      'Alberto Barcelos'
    )
  })

  it('não escolhe pelo telefone quando há dois cadastros iguais', () => {
    const lista = [cliente('Ana', '65992934536'), cliente('Ana 2', '65992934536')]
    expect(escolherClienteDaConversa(lista, '65992934536', 'WhatsApp')).toBeNull()
  })

  it('não vincula título genérico do WhatsApp', () => {
    const lista = [cliente('WhatsApp', '11988887777')]
    expect(escolherClienteDaConversa(lista, null, 'WhatsApp')).toBeNull()
  })
})
