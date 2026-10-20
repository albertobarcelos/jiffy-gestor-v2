import { describe, expect, it } from 'vitest'
import {
  atorUsuarioId,
  copiarNomeEntreIdsDoAtor,
  idUsuarioGestorConsultavel,
  idUsuarioParaConsulta,
  idsConsultaveisDoAtor,
  nomeAtorPedido,
  nomeUsuarioDePayloadApi,
  rotuloAtorPedido,
  completarNomesAtoresPedidoDelivery,
} from '@/src/application/mappers/atorPedidoDelivery'

describe('idUsuarioGestorConsultavel', () => {
  it('aceita CUID e UUID', () => {
    expect(idUsuarioGestorConsultavel('cmt3cjakc000cpb01cda6th02')).toBe(true)
    expect(idUsuarioGestorConsultavel('b4484820-9f81-426a-8319-74c4267c5419')).toBe(true)
  })

  it('rejeita telefone do cliente', () => {
    expect(idUsuarioGestorConsultavel('65999745637')).toBe(false)
    expect(idUsuarioGestorConsultavel('6599974563')).toBe(false)
  })

  it('aceita ator migrado pelo CUID real, não pelo prefixo', () => {
    expect(
      idUsuarioParaConsulta('migr_ator_usuario_gestor_cmc6u1ek90012jkwxoft21ykp')
    ).toBe('cmc6u1ek90012jkwxoft21ykp')
    expect(
      idUsuarioGestorConsultavel('migr_ator_usuario_gestor_cmc6u1ek90012jkwxoft21ykp')
    ).toBe(true)
  })
})

describe('atorUsuarioId', () => {
  it('prefere id de funcionário a sourceReference com telefone', () => {
    expect(
      atorUsuarioId({
        id: 'cmt3cjakc000cpb01cda6th02',
        sourceReference: '65999745637',
      })
    ).toBe('cmt3cjakc000cpb01cda6th02')
  })

  it('mantém o telefone quando o ator é o cliente do cardápio', () => {
    expect(atorUsuarioId({ sourceReference: '65999745637' })).toBe('65999745637')
  })

  it('desfaz o prefixo de ator migrado', () => {
    expect(
      atorUsuarioId({
        id: 'migr_ator_usuario_gestor_cmc6u1ek90012jkwxoft21ykp',
        nome: 'Funcionário',
      })
    ).toBe('cmc6u1ek90012jkwxoft21ykp')
  })
})

describe('nomeAtorPedido', () => {
  it('lê nome do payload', () => {
    expect(nomeAtorPedido({ nome: 'Alberto Barcelos' })).toBe('Alberto Barcelos')
  })
})

describe('rotuloAtorPedido', () => {
  it('usa o nome quando o payload traz', () => {
    expect(rotuloAtorPedido({ id: 'cmt3cjakc000cpb01cda6th02', nome: 'Maria' })).toBe('Maria')
  })

  it('rotula cliente do cardápio quando só há telefone', () => {
    expect(rotuloAtorPedido({ sourceReference: '65999745637' })).toBe('Cliente')
  })
})

describe('completarNomesAtoresPedidoDelivery', () => {
  it('preenche ator sem nome em pedido do site com o cliente', () => {
    expect(
      completarNomesAtoresPedidoDelivery(
        {},
        ['cmt3cjakc000cpb01cda6th02'],
        'JIFFY_DELIVERY',
        'Ana Souza'
      )
    ).toEqual({ cmt3cjakc000cpb01cda6th02: 'Ana Souza' })
  })

  it('não preenche id de outro ator que não foi passado como cliente', () => {
    expect(
      completarNomesAtoresPedidoDelivery(
        { cmt3usuario000000000000001: 'Berg Gestor' },
        ['cmt3cjakc000cpb01cda6th02'],
        'DELIVERY',
        'Kleverson Jara'
      )
    ).toEqual({
      cmt3usuario000000000000001: 'Berg Gestor',
      cmt3cjakc000cpb01cda6th02: 'Kleverson Jara',
    })
  })
})

describe('idsConsultaveisDoAtor', () => {
  it('junta vinculo e identidade quando o payload traz os dois', () => {
    expect(
      idsConsultaveisDoAtor({
        id: 'cmt3pessoa00000000000000001',
        usuarioId: 'cmt3usuario000000000000001',
        nome: 'Berg Gestor',
      })
    ).toEqual(['cmt3pessoa00000000000000001', 'cmt3usuario000000000000001'])
  })
})

describe('nomeUsuarioDePayloadApi', () => {
  it('lê nome dentro de data', () => {
    expect(nomeUsuarioDePayloadApi({ data: { nome: 'Berg Gestor' } })).toBe('Berg Gestor')
  })
})

describe('copiarNomeEntreIdsDoAtor', () => {
  it('propaga o nome resolvido de um id para o outro do mesmo ator', () => {
    const map = { cmt3usuario000000000000001: 'Berg Gestor' }
    copiarNomeEntreIdsDoAtor(map, {
      id: 'cmt3pessoa00000000000000001',
      usuarioId: 'cmt3usuario000000000000001',
    })
    expect(map).toEqual({
      cmt3usuario000000000000001: 'Berg Gestor',
      cmt3pessoa00000000000000001: 'Berg Gestor',
    })
  })
})
