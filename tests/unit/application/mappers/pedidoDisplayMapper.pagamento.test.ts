import { describe, expect, it } from 'vitest'
import {
  formatarUsuarioPorId,
  montarLinhasResumoPagamentoPedido,
  rotuloUsuarioPagamentoPedido,
  totalCobrarNaEntregaPagamentos,
} from '@/src/application/mappers/PedidoDisplayMapper'

const formatar = (valor: number) => `R$ ${valor.toFixed(2).replace('.', ',')}`

describe('resumo de pagamento misto', () => {
  it('separa já pago de cobrar na entrega com valores', () => {
    const linhas = montarLinhasResumoPagamentoPedido(
      [
        { meioPagamentoId: 'mp-dinheiro', valor: 30 },
        {
          meioPagamentoId: 'mp-credito',
          valor: 15,
          cobrarNaEntrega: true,
          naoEfetivo: true,
        },
      ],
      [
        { getId: () => 'mp-dinheiro', getNome: () => 'DINHEIRO' },
        { getId: () => 'mp-credito', getNome: () => 'CREDITO' },
      ],
      {},
      formatar
    )

    expect(linhas).toEqual([
      { kind: 'ja_pago', texto: 'Já pago: DINHEIRO R$ 30,00' },
      { kind: 'cobrar', texto: 'Cobrar na entrega: CREDITO R$ 15,00' },
    ])
    expect(
      totalCobrarNaEntregaPagamentos([
        { meioPagamentoId: 'mp-dinheiro', valor: 30 },
        { meioPagamentoId: 'mp-credito', valor: 15, cobrarNaEntrega: true, naoEfetivo: true },
      ])
    ).toBe(15)
  })
})

describe('formatarUsuarioPorId', () => {
  it('mostra Cliente quando o id é o telefone do cardápio', () => {
    expect(formatarUsuarioPorId('65999745637', {})).toBe('Cliente')
  })

  it('usa o nome embutido do cliente da cobrança', () => {
    expect(
      formatarUsuarioPorId('cmt3cliente000000000000001', {
        cmt3cliente000000000000001: 'Ana Souza',
      })
    ).toBe('Ana Souza')
  })

  it('não inventa funcionário quando o id parece CUID mas não tem nome', () => {
    expect(formatarUsuarioPorId('cmt3cjakc000cpb01cda6th02', {})).toBe(
      'Usuário não identificado'
    )
  })
})

describe('rotuloUsuarioPagamentoPedido', () => {
  it('usa o nome do cliente quando o ator do site não é funcionário', () => {
    expect(
      rotuloUsuarioPagamentoPedido({
        realizadoPorId: null,
        abertoPorId: 'cmt3cjakc000cpb01cda6th02',
        nomesUsuariosPedido: {},
        clienteNome: 'Ana Souza',
        origem: 'DELIVERY',
      })
    ).toBe('Ana Souza')
  })

  it('cobrança persistida do site continua com o nome do cliente', () => {
    expect(
      rotuloUsuarioPagamentoPedido({
        realizadoPorId: 'cmt3cjakc000cpb01cda6th02',
        pagamentoId: 'cob-site-1',
        abertoPorId: 'cmt3cjakc000cpb01cda6th02',
        nomesUsuariosPedido: {},
        clienteNome: 'Kleverson Jara',
        nomeUsuarioGestor: 'Berg Gestor',
        usuarioGestorId: 'cmt3usuario000000000000001',
        origem: 'DELIVERY',
      })
    ).toBe('Kleverson Jara')
  })

  it('lançamento persistido do gestor usa o nome embutido na cobrança', () => {
    expect(
      rotuloUsuarioPagamentoPedido({
        realizadoPorId: 'cmt3pessoa00000000000000001',
        realizadoPorNome: 'Berg Gestor',
        pagamentoId: 'cob-gestor-1',
        abertoPorId: 'cmt3cjakc000cpb01cda6th02',
        nomesUsuariosPedido: {},
        clienteNome: 'Kleverson Jara',
        nomeUsuarioGestor: 'Berg Gestor',
        usuarioGestorId: 'cmt3usuario000000000000001',
        origem: 'DELIVERY',
      })
    ).toBe('Berg Gestor')
  })

  it('lançamento local do gestor não herda o nome do cliente', () => {
    expect(
      rotuloUsuarioPagamentoPedido({
        realizadoPorId: 'cmt3usuario000000000000001',
        pagamentoId: null,
        abertoPorId: 'cmt3cjakc000cpb01cda6th02',
        nomesUsuariosPedido: { cmt3cjakc000cpb01cda6th02: 'Kleverson Jara' },
        clienteNome: 'Kleverson Jara',
        nomeUsuarioGestor: 'Berg Gestor',
        usuarioGestorId: 'cmt3usuario000000000000001',
        origem: 'DELIVERY',
      })
    ).toBe('Berg Gestor')
  })

  it('lançamento ainda não gravado sem realizadoPorId usa o gestor logado', () => {
    expect(
      rotuloUsuarioPagamentoPedido({
        realizadoPorId: null,
        pagamentoId: null,
        abertoPorId: 'cmt3cjakc000cpb01cda6th02',
        nomesUsuariosPedido: { cmt3cjakc000cpb01cda6th02: 'Kleverson Jara' },
        clienteNome: 'Kleverson Jara',
        nomeUsuarioGestor: 'Berg Gestor',
        usuarioGestorId: 'cmt3usuario000000000000001',
        origem: 'DELIVERY',
      })
    ).toBe('Berg Gestor')
  })
})
