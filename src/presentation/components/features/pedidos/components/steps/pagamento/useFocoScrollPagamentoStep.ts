import { useCallback, useEffect, useRef } from 'react'

function containerScrollMaisProximo(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement
  while (parent) {
    const overflowY = getComputedStyle(parent).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') return parent
    parent = parent.parentElement
  }
  return null
}

function scrollAteElemento(el: HTMLElement, block: 'start' | 'end') {
  const container = containerScrollMaisProximo(el)
  if (!container) {
    el.scrollIntoView({ behavior: 'smooth', block })
    return
  }

  const parentRect = container.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const delta = elRect.top - parentRect.top
  const folga = 12
  const top =
    block === 'end'
      ? container.scrollTop + delta - container.clientHeight + elRect.height + folga
      : container.scrollTop + delta - folga

  container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

/**
 * No passo 3: após 1s revela Forma de Pagamento no rodapé da área visível
 * (sem cortar o resumo no topo). Após lançar um meio, desce até os cartões.
 */
export function useFocoScrollPagamentoStep(quantidadeLancamentos: number) {
  const secaoPagamentoRef = useRef<HTMLDivElement>(null)
  const lancamentosRef = useRef<HTMLDivElement>(null)
  const focarLancamentoRef = useRef(false)
  const cancelarScrollEntradaRef = useRef(false)
  const quantidadeAnteriorRef = useRef(quantidadeLancamentos)

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (cancelarScrollEntradaRef.current) return
      const alvo = secaoPagamentoRef.current
      if (alvo) scrollAteElemento(alvo, 'end')
    }, 1000)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    const aumentou = quantidadeLancamentos > quantidadeAnteriorRef.current
    quantidadeAnteriorRef.current = quantidadeLancamentos
    if (!focarLancamentoRef.current || !aumentou) {
      if (!aumentou) focarLancamentoRef.current = false
      return
    }
    focarLancamentoRef.current = false
    const alvo = lancamentosRef.current
    if (!alvo) return
    const id = window.requestAnimationFrame(() => scrollAteElemento(alvo, 'end'))
    return () => window.cancelAnimationFrame(id)
  }, [quantidadeLancamentos])

  const marcarFocoAposLancamento = useCallback(() => {
    cancelarScrollEntradaRef.current = true
    focarLancamentoRef.current = true
  }, [])

  return { secaoPagamentoRef, lancamentosRef, marcarFocoAposLancamento }
}
