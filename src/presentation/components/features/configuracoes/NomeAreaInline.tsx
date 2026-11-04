'use client'

import { useEffect, useState } from 'react'
import type { AreaEntregaDTO } from '@/src/application/dto/delivery/CoberturaEntregaDTO'

export function NomeAreaInline({
  area,
  salvando,
  onSalvar,
}: {
  area: AreaEntregaDTO
  salvando: boolean
  onSalvar: (nome: string) => Promise<void>
}) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(area.nome ?? '')

  useEffect(() => {
    if (!editando) setTexto(area.nome ?? '')
  }, [area.nome, editando])

  const confirmar = async () => {
    const nome = texto.trim()
    if (!nome || nome === (area.nome ?? '').trim()) {
      setEditando(false)
      setTexto(area.nome ?? '')
      return
    }
    await onSalvar(nome)
    setEditando(false)
  }

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        disabled={salvando}
        title="Clique para editar o nome"
        className="truncate text-left text-xs font-medium text-primary-text hover:underline disabled:opacity-50"
      >
        {area.nome?.trim() || 'Clique para nomear'}
      </button>
    )
  }

  return (
    <input
      autoFocus
      aria-label="Nome da área"
      value={texto}
      disabled={salvando}
      onChange={event => setTexto(event.target.value)}
      onBlur={() => void confirmar()}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
        if (event.key === 'Escape') {
          setEditando(false)
          setTexto(area.nome ?? '')
        }
      }}
      className="w-full min-w-0 rounded-md border border-gray-200 bg-white px-1 py-0.5 text-xs text-primary-text outline-none focus:border-primary"
    />
  )
}
