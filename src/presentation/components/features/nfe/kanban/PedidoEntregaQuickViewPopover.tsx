'use client'

import { useCallback, useEffect, useState } from 'react'
import { CircularProgress, Popover } from '@mui/material'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { PedidoKanbanQuickViewConteudo } from './PedidoKanbanQuickViewConteudo'
import {
  carregarPedidoKanbanQuickView,
  type PedidoKanbanQuickViewData,
} from './carregarPedidoKanbanQuickView'
import type { ColunaKanbanId } from './types'

interface PedidoEntregaQuickViewPopoverProps {
  vendaId: string
  tabelaOrigem: 'venda' | 'venda_gestor'
  colunaAtual: ColunaKanbanId
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  podeImprimir?: boolean
  onImprimir?: () => void
}

export function PedidoEntregaQuickViewPopover({
  vendaId,
  tabelaOrigem,
  colunaAtual,
  anchorEl,
  open,
  onClose,
  podeImprimir = false,
  onImprimir,
}: PedidoEntregaQuickViewPopoverProps) {
  const { auth } = useAuthStore()
  const { empresa } = useEmpresaMe()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [dados, setDados] = useState<PedidoKanbanQuickViewData | null>(null)

  const carregar = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) {
      setErro('Sessão expirada. Faça login novamente.')
      return
    }

    setLoading(true)
    setErro(null)
    try {
      const resultado = await carregarPedidoKanbanQuickView({
        vendaId,
        tabelaOrigem,
        token,
      })
      setDados(resultado)
    } catch (error) {
      setDados(null)
      setErro(error instanceof Error ? error.message : 'Erro ao carregar dados do pedido')
    } finally {
      setLoading(false)
    }
  }, [auth, tabelaOrigem, vendaId])

  useEffect(() => {
    if (!open) {
      setDados(null)
      setErro(null)
      setLoading(false)
      return
    }
    void carregar()
  }, [open, carregar])

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            mt: 0.5,
            width: 320,
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: 'min(75vh, 560px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 1.5,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          },
        },
      }}
    >
      <div className="overflow-y-auto px-3 py-2">
        {loading && (
          <div className="flex min-h-[120px] items-center justify-center">
            <CircularProgress size={24} />
          </div>
        )}

        {!loading && erro && (
          <p className="py-3 text-center text-[11px] text-red-600">{erro}</p>
        )}

        {!loading && !erro && dados && (
          <PedidoKanbanQuickViewConteudo
            dados={dados}
            nomeEmpresa={empresa?.nomeExibicao ?? 'Empresa'}
            colunaAtual={colunaAtual}
            podeImprimir={podeImprimir}
            onImprimir={onImprimir}
          />
        )}
      </div>
    </Popover>
  )
}
