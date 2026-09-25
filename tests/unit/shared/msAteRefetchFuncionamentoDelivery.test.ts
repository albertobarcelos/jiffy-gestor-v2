import { describe, expect, it } from 'vitest'
import {
  BUFFER_MS_REFETCH_FUNCIONAMENTO,
  INTERVALO_FALLBACK_REFETCH_FUNCIONAMENTO_MS,
  INTERVALO_MAX_REFETCH_FUNCIONAMENTO_MS,
  msAteRefetchFuncionamentoDelivery,
} from '@/src/shared/utils/funcionamentoDelivery'

describe('msAteRefetchFuncionamentoDelivery', () => {
  const agora = new Date('2026-09-21T18:00:00.000Z')

  it('usa fallback quando o servidor não anuncia transição', () => {
    expect(msAteRefetchFuncionamentoDelivery(null, agora)).toBe(
      INTERVALO_FALLBACK_REFETCH_FUNCIONAMENTO_MS
    )
    expect(msAteRefetchFuncionamentoDelivery({ proximaTransicaoEm: null }, agora)).toBe(
      INTERVALO_FALLBACK_REFETCH_FUNCIONAMENTO_MS
    )
  })

  it('usa fallback quando a data é inválida', () => {
    expect(
      msAteRefetchFuncionamentoDelivery({ proximaTransicaoEm: 'não-é-iso' }, agora)
    ).toBe(INTERVALO_FALLBACK_REFETCH_FUNCIONAMENTO_MS)
  })

  it('refetch logo após a próxima transição automática', () => {
    expect(
      msAteRefetchFuncionamentoDelivery(
        { proximaTransicaoEm: '2026-09-21T18:05:00.000Z' },
        agora
      )
    ).toBe(5 * 60_000 + BUFFER_MS_REFETCH_FUNCIONAMENTO)
  })

  it('refetch imediato (com buffer) se a transição já passou', () => {
    expect(
      msAteRefetchFuncionamentoDelivery(
        { proximaTransicaoEm: '2026-09-21T17:59:00.000Z' },
        agora
      )
    ).toBe(BUFFER_MS_REFETCH_FUNCIONAMENTO)
  })

  it('escolhe o horário mais próximo entre transição e expiração manual', () => {
    expect(
      msAteRefetchFuncionamentoDelivery(
        {
          proximaTransicaoEm: '2026-09-21T19:00:00.000Z',
          alteracaoAtual: { expiraEm: '2026-09-21T18:10:00.000Z' },
        },
        agora
      )
    ).toBe(10 * 60_000 + BUFFER_MS_REFETCH_FUNCIONAMENTO)
  })

  it('limita espera longa a 1 hora e reagenda no próximo ciclo', () => {
    expect(
      msAteRefetchFuncionamentoDelivery(
        { proximaTransicaoEm: '2026-09-22T18:00:00.000Z' },
        agora
      )
    ).toBe(INTERVALO_MAX_REFETCH_FUNCIONAMENTO_MS)
  })
})
