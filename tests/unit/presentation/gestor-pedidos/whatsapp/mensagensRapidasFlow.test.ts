/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import {
  aplicarVariaveisMensagem,
  gravarPacoteMensagensFlow,
  lerPacoteMensagensFlow,
  mensagensRapidasPadrao,
} from '@/src/presentation/gestor-pedidos/whatsapp/mensagensRapidasFlow'
import {
  avisoAposInserirMensagem,
  mensagemPixSemChave,
} from '@/src/presentation/gestor-pedidos/whatsapp/enviarMensagemRapidaWhatsApp'

describe('mensagens rápidas do Flow', () => {
  it('substitui a chave PIX', () => {
    expect(aplicarVariaveisMensagem('PIX: {pix}', '65992934536')).toBe('PIX: 65992934536')
  })

  it('grava e lê o pacote da empresa', () => {
    const empresa = 'emp-teste-mensagens'
    gravarPacoteMensagensFlow(empresa, {
      chavePix: 'chave-pix-1',
      mensagens: mensagensRapidasPadrao(),
    })
    expect(lerPacoteMensagensFlow(empresa).chavePix).toBe('chave-pix-1')
  })

  it('pede a chave PIX antes de enviar a mensagem pix', () => {
    const pix = mensagensRapidasPadrao().find(m => m.id === 'pix')!
    expect(mensagemPixSemChave(pix, '')).toBe(true)
    expect(mensagemPixSemChave(pix, '  ')).toBe(true)
    expect(mensagemPixSemChave(pix, 'chave')).toBe(false)
    expect(mensagemPixSemChave(mensagensRapidasPadrao()[1], '')).toBe(false)
  })

  it('explica se a mensagem entrou na conversa ou só foi copiada', () => {
    expect(avisoAposInserirMensagem(true)).toContain('Confira e envie')
    expect(avisoAposInserirMensagem(false)).toContain('Ctrl+V')
  })
})
