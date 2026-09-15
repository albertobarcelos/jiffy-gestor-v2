import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import {
  createDebouncedKanbanInvalidator,
  KANBAN_INVALIDATE_DEBOUNCE_MS,
} from '@/src/presentation/realtime/debouncedInvalidateKanban'

const invalidateMock = vi.fn()

vi.mock('@/features/kanban/hooks/kanbanListagemQueryCache', () => ({
  invalidateKanbanVendasListagens: (...args: unknown[]) => invalidateMock(...args),
}))

describe('createDebouncedKanbanInvalidator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    invalidateMock.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('coalesce varios schedule em um invalidate apos o delay', () => {
    const queryClient = new QueryClient()
    const invalidator = createDebouncedKanbanInvalidator()

    invalidator.schedule(queryClient)
    invalidator.schedule(queryClient)
    invalidator.schedule(queryClient)

    expect(invalidateMock).not.toHaveBeenCalled()
    vi.advanceTimersByTime(KANBAN_INVALIDATE_DEBOUNCE_MS)
    expect(invalidateMock).toHaveBeenCalledTimes(1)
    expect(invalidateMock).toHaveBeenCalledWith(queryClient)
  })

  it('cancel impede o invalidate pendente', () => {
    const queryClient = new QueryClient()
    const invalidator = createDebouncedKanbanInvalidator()
    invalidator.schedule(queryClient)
    invalidator.cancel()
    vi.advanceTimersByTime(KANBAN_INVALIDATE_DEBOUNCE_MS)
    expect(invalidateMock).not.toHaveBeenCalled()
  })
})
