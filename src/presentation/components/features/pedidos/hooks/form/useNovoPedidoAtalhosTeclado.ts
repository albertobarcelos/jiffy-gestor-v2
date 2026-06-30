'use client'

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'

/** Id do input de busca de produtos — usado pelos atalhos para focar/digitar. */
export const BUSCA_PRODUTO_INPUT_ID = 'novo-pedido-busca-produto'

export interface UseNovoPedidoAtalhosTecladoParams {
  /** Liga os atalhos apenas com o modal aberto e fora do modo visualização. */
  ativo: boolean
  currentStep: 1 | 2 | 3 | 4
  setBuscaProdutoTexto: Dispatch<SetStateAction<string>>
  onNextStep: () => void
  onPreviousStep: () => void
}

function elementoEhEditavel(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false
  const tag = alvo.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || alvo.isContentEditable
}

/** Caractere que inicia a busca ao digitar (letra ou número, com suporte a acentos). */
const CARACTERE_INICIA_BUSCA = /^[\p{L}\p{N}]$/u

/**
 * Atalhos de teclado do modal de pedido:
 * - Digitar no passo Produtos (fora de campos) foca a busca e inicia o texto.
 * - Setas ←/→ alternam entre as etapas (fora de campos editáveis).
 */
export function useNovoPedidoAtalhosTeclado({
  ativo,
  currentStep,
  setBuscaProdutoTexto,
  onNextStep,
  onPreviousStep,
}: UseNovoPedidoAtalhosTecladoParams) {
  const handlersRef = useRef({ setBuscaProdutoTexto, onNextStep, onPreviousStep })
  handlersRef.current = { setBuscaProdutoTexto, onNextStep, onPreviousStep }

  useEffect(() => {
    if (!ativo) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return

      const editavel = elementoEhEditavel(event.target)

      if (!editavel && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
        event.preventDefault()
        if (event.key === 'ArrowRight') handlersRef.current.onNextStep()
        else handlersRef.current.onPreviousStep()
        return
      }

      if (
        currentStep === 1 &&
        !editavel &&
        event.key.length === 1 &&
        CARACTERE_INICIA_BUSCA.test(event.key)
      ) {
        const input = document.getElementById(BUSCA_PRODUTO_INPUT_ID)
        if (input instanceof HTMLInputElement) {
          event.preventDefault()
          input.focus()
          const char = event.key
          handlersRef.current.setBuscaProdutoTexto(prev => prev + char)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [ativo, currentStep])
}
