import { describe, expect, it } from 'vitest'
import { validarTurnosAgendamentoDelivery } from '@/src/domain/services/delivery/ValidarTurnosAgendamentoDelivery'
import { validarConfigAgendamentoDelivery } from '@/src/application/services/delivery/validarConfigAgendamentoDelivery'
import { isOpcaoEntregaDisponivel } from '@/src/presentation/components/features/delivery-publico/public/components/checkout/DeliveryCheckoutTipoEntregaOpcoes'

describe('validarTurnosAgendamentoDelivery', () => {
  it('aceita turnos sem sobreposição', () => {
    expect(
      validarTurnosAgendamentoDelivery([
        {
          diaSemana: 1,
          horaInicio: '11:00',
          horaFim: '14:00',
          ativo: true,
        },
        {
          diaSemana: 1,
          horaInicio: '18:00',
          horaFim: '22:00',
          ativo: true,
        },
      ])
    ).toBeNull()
  })

  it('rejeita turnos sobrepostos no mesmo dia', () => {
    expect(
      validarTurnosAgendamentoDelivery([
        {
          diaSemana: 1,
          horaInicio: '11:00',
          horaFim: '15:00',
          ativo: true,
        },
        {
          diaSemana: 1,
          horaInicio: '14:00',
          horaFim: '18:00',
          ativo: true,
        },
      ])
    ).toMatch(/sobrepostos/i)
  })

  it('rejeita hora inválida', () => {
    expect(
      validarTurnosAgendamentoDelivery([
        {
          diaSemana: 1,
          horaInicio: '25:00',
          horaFim: '18:00',
          ativo: true,
        },
      ])
    ).toMatch(/HH:mm/i)
  })
})

describe('validarConfigAgendamentoDelivery', () => {
  it('aceita config válida', () => {
    const result = validarConfigAgendamentoDelivery({
      timezone: 'America/Sao_Paulo',
      aceitaAgendamento: true,
      intervaloSlotMinutos: 15,
      leadTimeMinutos: 45,
      diasAntecedenciaMax: 3,
      turnos: [
        {
          diaSemana: 1,
          horaInicio: '18:00',
          horaFim: '23:00',
          ativo: true,
        },
      ],
    })
    expect(result.ok).toBe(true)
  })

  it('rejeita antecedência fora de 1..7', () => {
    const result = validarConfigAgendamentoDelivery({
      timezone: 'America/Sao_Paulo',
      aceitaAgendamento: true,
      intervaloSlotMinutos: 15,
      leadTimeMinutos: 45,
      diasAntecedenciaMax: 9,
      turnos: [],
    })
    expect(result.ok).toBe(false)
  })
})

describe('isOpcaoEntregaDisponivel', () => {
  it('bloqueia imediato quando permiteImediato=false', () => {
    expect(
      isOpcaoEntregaDisponivel({
        modoTempo: 'imediato',
        permiteImediato: false,
        aceitaAgendamento: true,
      })
    ).toBe(false)
  })

  it('bloqueia agendado quando aceitaAgendamento=false', () => {
    expect(
      isOpcaoEntregaDisponivel({
        modoTempo: 'agendado',
        permiteImediato: true,
        aceitaAgendamento: false,
      })
    ).toBe(false)
  })

  it('em erro de disponibilidade bloqueia opções', () => {
    expect(
      isOpcaoEntregaDisponivel({
        modoTempo: 'imediato',
        permiteImediato: true,
        aceitaAgendamento: true,
        isError: true,
      })
    ).toBe(false)
  })
})
