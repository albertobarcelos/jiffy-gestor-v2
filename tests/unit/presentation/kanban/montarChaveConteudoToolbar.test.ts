import { describe, expect, it } from 'vitest'
import { montarChaveConteudoToolbar } from '@/src/presentation/components/features/kanban/utils/montarChaveConteudoToolbar'

describe('montarChaveConteudoToolbar', () => {
  it('produz chave estável a partir dos filtros', () => {
    expect(
      montarChaveConteudoToolbar({
        periodoPreset: 'hoje',
        periodoInicioMs: 1,
        periodoFimMs: 2,
        origem: 'PDV',
        tipoEntrega: '',
        tipoCanal: 'GESTOR',
        terminal: 't1',
        coluna: '',
        modo: 'balcao',
      })
    ).toBe('hoje|1|2|PDV||GESTOR|t1||balcao')
  })

  it('muda quando o período muda', () => {
    const base = {
      periodoPreset: 'hoje',
      periodoInicioMs: '' as const,
      periodoFimMs: '' as const,
      origem: '',
      tipoEntrega: '',
      tipoCanal: '',
      terminal: '',
      coluna: '',
      modo: 'delivery',
    }
    expect(montarChaveConteudoToolbar(base)).not.toBe(
      montarChaveConteudoToolbar({ ...base, periodoPreset: 'personalizado' })
    )
  })
})
