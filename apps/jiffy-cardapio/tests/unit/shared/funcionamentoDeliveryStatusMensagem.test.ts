import { describe, expect, it } from 'vitest'
import type { FuncionamentoPublicoDiaDTO } from '@/src/application/dto/delivery/FuncionamentoDeliveryDTO'
import {
  formatarStatusLojaPublica,
  resolverProximaAbertura,
} from '@/src/shared/utils/funcionamentoDelivery'

const agendaSemanal: FuncionamentoPublicoDiaDTO[] = [
  { diaDaSemana: 'SEGUNDA', intervalos: [{ abreEm: '09:00', fechaEm: '22:45' }] },
  { diaDaSemana: 'TERCA', intervalos: [{ abreEm: '09:00', fechaEm: '22:00' }] },
  { diaDaSemana: 'QUARTA', intervalos: [{ abreEm: '09:00', fechaEm: '22:00' }] },
  { diaDaSemana: 'QUINTA', intervalos: [{ abreEm: '09:00', fechaEm: '22:00' }] },
  { diaDaSemana: 'SEXTA', intervalos: [{ abreEm: '09:00', fechaEm: '22:00' }] },
  { diaDaSemana: 'SABADO', intervalos: [{ abreEm: '10:00', fechaEm: '23:00' }] },
  { diaDaSemana: 'DOMINGO', intervalos: [] },
]

describe('formatarStatusLojaPublica', () => {
  it('quando aberta com agenda, separa mensagem e horário de fechamento', () => {
    const agora = new Date(2026, 8, 14, 12, 0, 0)
    expect(
      formatarStatusLojaPublica({
        aberta: true,
        agendaSemanal,
        agora,
      })
    ).toEqual({
      mensagem: 'Aberto, faça seu pedido!',
      detalheHorario: 'até as 22:45',
    })
  })

  it('quando aberta sem intervalo hoje, não exibe detalhe de horário', () => {
    const agora = new Date(2026, 8, 13, 12, 0, 0)
    expect(
      formatarStatusLojaPublica({
        aberta: true,
        agendaSemanal,
        agora,
      })
    ).toEqual({
      mensagem: 'Aberto, faça seu pedido!',
      detalheHorario: null,
    })
  })

  it('quando fechada antes da abertura de hoje, informa o horário de hoje', () => {
    const agora = new Date(2026, 8, 14, 8, 0, 0)
    expect(
      formatarStatusLojaPublica({
        aberta: false,
        agendaSemanal,
        agora,
      })
    ).toEqual({
      mensagem: 'Estamos fechado!',
      detalheHorario: 'Abriremos às 09:00',
    })
  })

  it('quando fechada após o expediente, aponta para o próximo dia', () => {
    const agora = new Date(2026, 8, 14, 23, 0, 0)
    expect(
      formatarStatusLojaPublica({
        aberta: false,
        agendaSemanal,
        agora,
      })
    ).toEqual({
      mensagem: 'Estamos fechado!',
      detalheHorario: 'Abriremos amanhã às 09:00',
    })
  })
})

describe('resolverProximaAbertura', () => {
  it('ignora abertura de hoje se o horário já passou', () => {
    const agora = new Date(2026, 8, 14, 23, 0, 0)
    const proxima = resolverProximaAbertura(agendaSemanal, agora)
    expect(proxima).toEqual({
      abreEm: '09:00',
      diaDaSemana: 'TERCA',
      ehHoje: false,
      ehAmanha: true,
    })
  })
})
