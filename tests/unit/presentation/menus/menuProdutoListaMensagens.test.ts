import { describe, expect, it } from 'vitest'
import { mensagemSucessoPatchMenu } from '@/src/presentation/hooks/menus/menuProdutoListaMensagens'

describe('mensagemSucessoPatchMenu', () => {
  it('favorece o recado de favorito', () => {
    expect(mensagemSucessoPatchMenu({ favorito: true })).toBe(
      'Marcado como favorito neste cardápio'
    )
    expect(mensagemSucessoPatchMenu({ favorito: false })).toBe('Removido dos favoritos')
  })

  it('usa recado específico de nome e preço', () => {
    expect(mensagemSucessoPatchMenu({ nome: 'X-TUDO' })).toBe('Nome atualizado neste cardápio')
    expect(mensagemSucessoPatchMenu({ valor: 26 })).toBe('Preço atualizado neste cardápio')
  })

  it('usa recado do cadastro quando a permissão for no snapshot', () => {
    expect(mensagemSucessoPatchMenu({ permiteAcrescimo: true })).toBe(
      'Acréscimo habilitado para o produto!'
    )
    expect(mensagemSucessoPatchMenu({ incideTaxa: false })).toBe(
      'Incidência de taxa desabilitada!'
    )
  })

  it('cai no recado genérico quando o campo não tem mensagem própria', () => {
    expect(mensagemSucessoPatchMenu({ ordem: 2 })).toBe('Produto atualizado neste cardápio')
  })
})
