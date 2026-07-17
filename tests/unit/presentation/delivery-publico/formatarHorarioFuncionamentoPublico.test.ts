import { describe, expect, it } from 'vitest'
import {
  formatarGradeSemanal,
  formatarHorarioHoje,
  resolverExibicaoHorarioHome,
} from '@/src/presentation/components/features/delivery-publico/shared/utils/formatarHorarioFuncionamentoPublico'

describe('formatarHorarioFuncionamentoPublico', () => {
  it('formata grade semanal ordenada', () => {
    const texto = formatarGradeSemanal([
      { diaSemana: 2, horaInicio: '11:00', horaFim: '14:00' },
      { diaSemana: 1, horaInicio: '18:00', horaFim: '02:00' },
      { diaSemana: 1, horaInicio: '11:00', horaFim: '14:30' },
    ])
    expect(texto).toBe('Seg 11:00–14:30 · Seg 18:00–02:00 · Ter 11:00–14:00')
  })

  it('formata horário de hoje com turnos', () => {
    // Segunda 2026-07-13 10:00 America/Sao_Paulo
    const agora = new Date('2026-07-13T13:00:00.000Z')
    const texto = formatarHorarioHoje(
      {
        timezone: 'America/Sao_Paulo',
        proximaAbertura: null,
        turnos: [
          { diaSemana: 1, horaInicio: '11:00', horaFim: '14:30' },
          { diaSemana: 1, horaInicio: '18:00', horaFim: '02:00' },
        ],
      },
      agora
    )
    expect(texto).toBe('Hoje 11:00 às 14:30 · 18:00 às 02:00')
  })

  it('resolve fallback sem turnos como disponível', () => {
    const result = resolverExibicaoHorarioHome({
      timezone: 'America/Sao_Paulo',
      abertaAgora: false,
      proximaAbertura: null,
      turnos: [],
    })
    expect(result.disponivel).toBe(true)
    expect(result.horarioTexto).toBe('Horário não informado')
    expect(result.horarioSemanalTexto).toBe('Horário não informado')
  })
})
