import { describe, expect, it } from 'vitest'
import { PublicDeliveryApiError } from '@/src/application/errors/publicDeliveryErrors'
import { resolverMensagemErroCatalogoPublicoUi } from '@/src/application/errors/resolverMensagemErroCatalogoPublico'

describe('resolverMensagemErroCatalogoPublicoUi', () => {
  it('loja não encontrada (404 empresa delivery) sem citar slug', () => {
    const erro = new PublicDeliveryApiError('Empresa delivery não encontrada', 404)
    const ui = resolverMensagemErroCatalogoPublicoUi(erro)
    expect(ui.tipo).toBe('loja_nao_encontrada')
    expect(ui.titulo.toLowerCase()).toContain('loja')
    expect(ui.descricao.toLowerCase()).not.toContain('slug')
    expect(ui.descricao.toLowerCase()).not.toContain('frete')
  })

  it('loja indisponível (403)', () => {
    const erro = new PublicDeliveryApiError('Pendências', 403)
    const ui = resolverMensagemErroCatalogoPublicoUi(erro)
    expect(ui.tipo).toBe('loja_indisponivel')
    expect(ui.descricao.toLowerCase()).not.toContain('pendência')
  })

  it('429 com mensagem genérica (sem frete)', () => {
    const erro = new PublicDeliveryApiError(
      'Muitas tentativas de calcular o frete. Aguarde cerca de 1 minuto e tente novamente.',
      429
    )
    const ui = resolverMensagemErroCatalogoPublicoUi(erro)
    expect(ui.tipo).toBe('muitas_requisicoes')
    expect(ui.titulo.toLowerCase()).toContain('indisponível')
    expect(ui.descricao.toLowerCase()).toContain('1 minuto')
    expect(ui.descricao.toLowerCase()).not.toContain('frete')
  })

  it('500 como instabilidade', () => {
    const erro = new PublicDeliveryApiError('Erro interno', 500)
    const ui = resolverMensagemErroCatalogoPublicoUi(erro)
    expect(ui.tipo).toBe('instabilidade')
  })

  it('erro genérico', () => {
    const ui = resolverMensagemErroCatalogoPublicoUi(new Error('Network'))
    expect(ui.tipo).toBe('generico')
  })
})
