'use client'

import { useEffect, useRef } from 'react'

/**
 * Leitor USB/Bluetooth entra como teclado e termina com Enter.
 * Fica sempre ligado: desmontar o listener a cada busca faz o HID cair.
 * Sequência lenta (digitação humana fora do campo) não dispara.
 */
const JANELA_MS = 800

export function useLeitorCodigoBarras(onCodigo: (codigo: string) => void, ativo = true) {
  const bufferRef = useRef('')
  const ultimoRef = useRef(0)
  const onCodigoRef = useRef(onCodigo)
  onCodigoRef.current = onCodigo

  useEffect(() => {
    if (!ativo) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const alvo = event.target
      if (
        (alvo instanceof HTMLInputElement || alvo instanceof HTMLTextAreaElement) &&
        alvo.dataset.expedicaoLeitor === 'off'
      ) {
        return
      }

      const agora = Date.now()
      if (agora - ultimoRef.current > JANELA_MS) {
        bufferRef.current = ''
      }

      if (event.key === 'Enter') {
        const codigo = bufferRef.current.trim()
        bufferRef.current = ''
        ultimoRef.current = agora
        if (codigo.length >= 4) {
          event.preventDefault()
          onCodigoRef.current(codigo)
        }
        return
      }

      if (event.key.length === 1 && /[0-9A-Za-z]/.test(event.key)) {
        bufferRef.current += event.key
        ultimoRef.current = agora
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [ativo])
}
