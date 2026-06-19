import { describe, expect, it } from 'vitest'
import { createEmissaoFiscalKanbanLock } from '@/src/presentation/components/features/kanban/hooks/useFiscalEmissaoKanban'

describe('createEmissaoFiscalKanbanLock', () => {
  it('bloqueia segunda aquisição para o mesmo vendaId', () => {
    const lock = createEmissaoFiscalKanbanLock()

    expect(lock.tryAcquire('venda-1')).toBe(true)
    expect(lock.isLocked('venda-1')).toBe(true)
    expect(lock.tryAcquire('venda-1')).toBe(false)
  })

  it('permite nova aquisição após release', () => {
    const lock = createEmissaoFiscalKanbanLock()

    expect(lock.tryAcquire('venda-1')).toBe(true)
    lock.release('venda-1')
    expect(lock.isLocked('venda-1')).toBe(false)
    expect(lock.tryAcquire('venda-1')).toBe(true)
  })

  it('mantém locks independentes por vendaId', () => {
    const lock = createEmissaoFiscalKanbanLock()

    expect(lock.tryAcquire('venda-a')).toBe(true)
    expect(lock.tryAcquire('venda-b')).toBe(true)
    expect(lock.tryAcquire('venda-a')).toBe(false)
    expect(lock.tryAcquire('venda-b')).toBe(false)
  })
})
