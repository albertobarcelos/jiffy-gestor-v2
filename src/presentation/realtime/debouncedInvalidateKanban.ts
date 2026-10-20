import type { QueryClient } from '@tanstack/react-query'
import { invalidateKanbanVendasListagens } from '@/features/kanban/hooks/kanbanListagemQueryCache'

export const KANBAN_INVALIDATE_DEBOUNCE_MS = 400

export type DebouncedKanbanInvalidator = {
  schedule: (queryClient: QueryClient) => void
  cancel: () => void
}

/**
 * Coalesces N invalidate requests into one after `delayMs` (default 400ms).
 */
export function createDebouncedKanbanInvalidator(
  delayMs: number = KANBAN_INVALIDATE_DEBOUNCE_MS
): DebouncedKanbanInvalidator {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingClient: QueryClient | null = null

  return {
    schedule(queryClient: QueryClient) {
      pendingClient = queryClient
      if (timer != null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        const client = pendingClient
        pendingClient = null
        if (client) invalidateKanbanVendasListagens(client)
      }, delayMs)
    },
    cancel() {
      if (timer != null) {
        clearTimeout(timer)
        timer = null
      }
      pendingClient = null
    },
  }
}
