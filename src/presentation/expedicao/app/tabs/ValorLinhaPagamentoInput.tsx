'use client'

import { useEffect, useState } from 'react'
import {
  parseValorDigitadoFinalizarApp,
  sanitizarTextoValorFinalizarApp,
  textoValorLinhaFinalizarApp,
} from '@/src/application/expedicao/app/pagamentoFinalizarEntregaApp'

type ValorLinhaPagamentoInputProps = {
  valor: number
  onValor: (valor: number) => void
}

export function ValorLinhaPagamentoInput(props: ValorLinhaPagamentoInputProps) {
  const [texto, setTexto] = useState(() => textoValorLinhaFinalizarApp(props.valor))
  const [focado, setFocado] = useState(false)

  useEffect(() => {
    if (focado) return
    setTexto(textoValorLinhaFinalizarApp(props.valor))
  }, [focado, props.valor])

  return (
    <input
      type="text"
      inputMode="decimal"
      enterKeyHint="done"
      autoComplete="off"
      aria-label="Valor neste meio"
      value={texto}
      onFocus={event => {
        setFocado(true)
        event.currentTarget.select()
      }}
      onChange={event => {
        const next = sanitizarTextoValorFinalizarApp(event.target.value)
        setTexto(next)
        props.onValor(parseValorDigitadoFinalizarApp(next) ?? 0)
      }}
      onBlur={() => {
        setFocado(false)
        const parsed = parseValorDigitadoFinalizarApp(texto)
        props.onValor(parsed ?? 0)
        setTexto(textoValorLinhaFinalizarApp(parsed ?? 0))
      }}
      className="w-28 rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-right text-sm font-semibold text-zinc-900"
    />
  )
}
