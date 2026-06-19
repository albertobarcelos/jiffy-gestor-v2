import { useCallback, useRef } from 'react'

const DEFAULT_THRESHOLD_PX = 120

/**
 * Dispara `onLoadMore` quando o scroll da coluna do Kanban chega perto do fim.
 * Usado em todas as colunas: a paginação é global (mesma lista unificada).
 */
export function useKanbanColumnScrollLoadMore(
  onLoadMore: () => void,
  thresholdPx = DEFAULT_THRESHOLD_PX
) {
  const tickingRef = useRef(false)

  const onColumnScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (tickingRef.current) return
      /** Capturar antes do rAF: React zera `currentTarget` após o handler síncrono. */
      const el = event.currentTarget
      if (!el) return
      tickingRef.current = true
      requestAnimationFrame(() => {
        tickingRef.current = false
        const distanciaDoFim = el.scrollHeight - el.scrollTop - el.clientHeight
        if (distanciaDoFim <= thresholdPx) {
          onLoadMore()
        }
      })
    },
    [onLoadMore, thresholdPx]
  )

  return { onColumnScroll }
}
