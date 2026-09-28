'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { agendarRemedicaoLayout } from '@/src/presentation/layout/agendarRemedicaoLayout'
import { contarItensQueCabem } from '@/src/presentation/layout/contarItensQueCabem'

const LARGURA_MAIS_FALLBACK_PX = 88

/**
 * Mede a faixa do menu desktop e devolve quantos itens cabem.
 * O restante deve ir para o dropdown "Mais".
 */
export function useTopNavOverflow(totalItens: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const faixaMedicaoRef = useRef<HTMLDivElement>(null)
  const maisMedicaoRef = useRef<HTMLDivElement>(null)
  const [visiveis, setVisiveis] = useState(0)
  const [pronto, setPronto] = useState(false)

  const medir = useCallback(() => {
    const container = containerRef.current
    const faixa = faixaMedicaoRef.current
    if (!container || !faixa) {
      return
    }

    const filhos = Array.from(faixa.children) as HTMLElement[]
    const larguras = filhos.map(el => el.offsetWidth)
    if (larguras.length !== totalItens || larguras.some(largura => largura <= 0)) {
      return
    }

    const gap =
      Number.parseFloat(getComputedStyle(faixa).columnGap || getComputedStyle(faixa).gap || '0') || 0
    const larguraMais = maisMedicaoRef.current?.offsetWidth || LARGURA_MAIS_FALLBACK_PX
    setVisiveis(contarItensQueCabem(larguras, container.clientWidth, larguraMais, gap))
    setPronto(true)
  }, [totalItens])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const observer = new ResizeObserver(() => {
      medir()
    })
    observer.observe(container)
    medir()
    const cancelar = agendarRemedicaoLayout(medir)
    return () => {
      observer.disconnect()
      cancelar()
    }
  }, [medir, totalItens])

  return { containerRef, faixaMedicaoRef, maisMedicaoRef, visiveis, pronto }
}
