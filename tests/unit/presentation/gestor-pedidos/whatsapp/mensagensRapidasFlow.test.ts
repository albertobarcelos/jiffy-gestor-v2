/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import {
  aplicarVariaveisMensagem,
  gravarPacoteMensagensFlow,
  lerPacoteMensagensFlow,
  mensagensRapidasPadrao,
} from '@/src/presentation/gestor-pedidos/whatsapp/mensagensRapidasFlow'

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
})
