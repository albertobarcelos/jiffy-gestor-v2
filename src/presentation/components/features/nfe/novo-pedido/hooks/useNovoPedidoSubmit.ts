'use client'

import { useCallback, useRef } from 'react'

export function useNovoPedidoSubmitGuard(isPending: boolean) {
  const submitEmAndamentoRef = useRef(false)

  const iniciarSubmit = useCallback(() => {
    if (submitEmAndamentoRef.current || isPending) return false
    submitEmAndamentoRef.current = true
    return true
  }, [isPending])

  const finalizarSubmit = useCallback(() => {
    submitEmAndamentoRef.current = false
  }, [])

  return {
    iniciarSubmit,
    finalizarSubmit,
  }
}

export function useNovoPedidoResetOnExit(resetForm: () => void, onAfterClose?: () => void) {
  const resetFormRef = useRef(resetForm)
  resetFormRef.current = resetForm

  /** Após o Slide de saída: evita reset síncrono que quebra a animação e notifica o pai. */
  return useCallback(() => {
    resetFormRef.current()
    onAfterClose?.()
  }, [onAfterClose])
}
