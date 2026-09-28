'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { agendarRemedicaoLayout } from '@/src/presentation/layout/agendarRemedicaoLayout'
import { medirLarguraNatural } from '@/src/presentation/layout/medirLarguraNatural'
import { toolbarPrecisaQuebrar } from '@/src/presentation/layout/toolbarPrecisaQuebrar'

/**
 * @param conteudoChave muda quando filtro/período altera — força nova medição.
 */
export function useKanbanToolbarQuebra(conteudoChave: string) {
  const containerRef = useRef<HTMLDivElement>(null)
  const filtrosRef = useRef<HTMLDivElement>(null)
  const acoesCimaRef = useRef<HTMLDivElement>(null)
  const acoesBaixoRef = useRef<HTMLDivElement>(null)
  const quebraRef = useRef(true)
  const medindoRef = useRef(false)
  const [quebra, setQuebra] = useState(true)

  const aplicarQuebra = useCallback((proximo: boolean) => {
    quebraRef.current = proximo
    setQuebra(proximo)
  }, [])

  const medir = useCallback(() => {
    if (medindoRef.current) {
      return
    }
    const container = containerRef.current
    const filtros = filtrosRef.current
    const cima = acoesCimaRef.current
    const baixo = acoesBaixoRef.current
    if (!container || !filtros || !cima || !baixo) {
      return
    }

    medindoRef.current = true
    try {
      aplicarQuebra(
        toolbarPrecisaQuebrar({
          disponivel: container.clientWidth,
          larguraFiltros: medirLarguraNatural(filtros),
          larguraAcoesCima: medirLarguraNatural(cima),
          larguraAcoesBaixo: medirLarguraNatural(baixo),
          jaQuebrou: quebraRef.current,
          scrollWidth: container.scrollWidth,
          clientWidth: container.clientWidth,
          gap:
            Number.parseFloat(getComputedStyle(container).columnGap || getComputedStyle(container).gap || '') ||
            undefined,
        })
      )
    } finally {
      medindoRef.current = false
    }
  }, [aplicarQuebra])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const observer = new ResizeObserver(() => {
      if (!medindoRef.current) {
        medir()
      }
    })
    observer.observe(container)
    if (filtrosRef.current) {
      observer.observe(filtrosRef.current)
    }
    if (acoesCimaRef.current) {
      observer.observe(acoesCimaRef.current)
    }
    if (acoesBaixoRef.current) {
      observer.observe(acoesBaixoRef.current)
    }

    const mutacao = new MutationObserver(() => {
      medir()
    })
    mutacao.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    medir()
    const cancelar = agendarRemedicaoLayout(medir)
    return () => {
      observer.disconnect()
      mutacao.disconnect()
      cancelar()
    }
  }, [medir, conteudoChave])

  return { containerRef, filtrosRef, acoesCimaRef, acoesBaixoRef, quebra }
}
