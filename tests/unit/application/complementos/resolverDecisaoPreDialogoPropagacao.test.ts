import { describe, expect, it } from 'vitest'
import { resolverDecisaoPreDialogoPropagacao } from '@/src/application/complementos/resolverDecisaoPreDialogoPropagacao'

describe('resolverDecisaoPreDialogoPropagacao', () => {
  it('grava só a origem se outro pedido já está aberto', () => {
    expect(
      resolverDecisaoPreDialogoPropagacao({
        pedidoAberto: true,
        temToken: true,
        listagemOk: true,
        quantidadeUsos: 2,
      })
    ).toBe('so-origem')
  })

  it('grava só a origem sem token — não cancela a alteração local', () => {
    expect(
      resolverDecisaoPreDialogoPropagacao({
        pedidoAberto: false,
        temToken: false,
      })
    ).toBe('so-origem')
  })

  it('grava só a origem se a listagem de usos falhar', () => {
    expect(
      resolverDecisaoPreDialogoPropagacao({
        pedidoAberto: false,
        temToken: true,
        listagemOk: false,
      })
    ).toBe('so-origem')
  })

  it('grava só a origem quando não há outros usos', () => {
    expect(
      resolverDecisaoPreDialogoPropagacao({
        pedidoAberto: false,
        temToken: true,
        listagemOk: true,
        quantidadeUsos: 0,
      })
    ).toBe('so-origem')
  })

  it('abre o diálogo quando a listagem traz outros usos', () => {
    expect(
      resolverDecisaoPreDialogoPropagacao({
        pedidoAberto: false,
        temToken: true,
        listagemOk: true,
        quantidadeUsos: 3,
      })
    ).toBe('abrir-dialogo')
  })
})
