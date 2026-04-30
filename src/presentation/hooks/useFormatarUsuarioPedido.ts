'use client'

import { useCallback } from 'react'

/**
 * Resolve nome amigável para IDs de usuário retornados pela API do pedido.
 */
export function useFormatarUsuarioPedido(nomesUsuariosPedido: Record<string, string>) {
  return useCallback(
    (usuarioId: string | null | undefined): string => {
      const id = String(usuarioId || '').trim()
      if (!id) return '—'
      return nomesUsuariosPedido[id] || 'Usuário não identificado'
    },
    [nomesUsuariosPedido]
  )
}
