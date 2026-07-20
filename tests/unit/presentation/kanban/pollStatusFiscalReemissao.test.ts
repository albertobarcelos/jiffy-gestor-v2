import { describe, expect, it } from 'vitest'
import { deveEncerrarPollComStatus } from '@/src/presentation/components/features/kanban/hooks/useFiscalEmissaoKanban'

describe('poll status fiscal após reemissão', () => {
  it('não encerra no REJEITADA antigo (sem ter visto aguardando)', () => {
    expect(deveEncerrarPollComStatus('REJEITADA', 'REJEITADA', false)).toBe(false)
  })

  it('encerra quando autoriza (EMITIDA)', () => {
    expect(deveEncerrarPollComStatus('EMITIDA', 'REJEITADA', false)).toBe(true)
    expect(deveEncerrarPollComStatus('EMITIDA', 'REJEITADA', true)).toBe(true)
  })

  it('encerra em nova rejeição só depois de ter visto aguardando', () => {
    expect(deveEncerrarPollComStatus('REJEITADA', 'REJEITADA', true)).toBe(true)
  })
})
