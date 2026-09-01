import { describe, expect, it } from 'vitest'
import {
  conversaEhAMesma,
  idConversaWhatsApp,
  nomesCorrespondem,
  tituloConversaGenerico,
} from '@/src/shared/utils/nomeClienteMatch'

describe('nomeClienteMatch', () => {
  it('iguala o nome do contato ao cadastro', () => {
    expect(nomesCorrespondem('Alberto Barcelos', 'ALBERTO BARCELOS')).toBe(true)
    expect(nomesCorrespondem('WhatsApp', 'Alberto Barcelos')).toBe(false)
  })

  it('ignora título genérico do WhatsApp', () => {
    expect(tituloConversaGenerico('WhatsApp')).toBe(true)
    expect(tituloConversaGenerico('Alberto Barcelos')).toBe(false)
  })

  it('mantém a conversa quando o número some e o nome fica', () => {
    const comNumero = idConversaWhatsApp('5565992934536', 'Alberto Barcelos')
    const soNome = idConversaWhatsApp(null, 'Alberto Barcelos')
    expect(comNumero.startsWith('tel:')).toBe(true)
    expect(soNome.startsWith('nome:')).toBe(true)
    expect(conversaEhAMesma(comNumero, soNome)).toBe(true)
    expect(conversaEhAMesma(soNome, comNumero)).toBe(true)
    expect(conversaEhAMesma(comNumero, idConversaWhatsApp('11988887777', 'Outro'))).toBe(false)
  })
})
