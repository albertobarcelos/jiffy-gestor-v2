'use client'

import { useCallback, useEffect, useState } from 'react'
import { CircularProgress, Popover } from '@mui/material'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { PedidoKanbanQuickViewConteudo } from './PedidoKanbanQuickViewConteudo'
import {
  carregarPedidoKanbanQuickView,
  obterPedidoKanbanQuickViewCache,
  type PedidoKanbanQuickViewData,
} from './carregarPedidoKanbanQuickView'
import type { ColunaKanbanId } from './types'

interface PedidoEntregaQuickViewPopoverProps {
  vendaId: string
  tabelaOrigem: 'venda' | 'venda_gestor'
  colunaAtual: ColunaKanbanId
  tipoVenda: 'entrega' | 'retirada'
  observacaoPedidoHint?: string | null
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
}

function impedirPropagacaoParaCardKanban(
  event: React.MouseEvent | React.PointerEvent | React.TouchEvent
) {
  event.stopPropagation()
}

export function PedidoEntregaQuickViewPopover({
  vendaId,
  tabelaOrigem,
  colunaAtual,
  tipoVenda,
  observacaoPedidoHint,
  anchorEl,
  open,
  onClose,
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

    const cacheLocal = obterPedidoKanbanQuickViewCache({ vendaId, tabelaOrigem })
    if (cacheLocal) {
      setDados(cacheLocal)
      setErro(null)
      setLoading(false)
    } else {
      setDados(null)
      setLoading(true)
      setErro(null)
    }

    try {
      const resultado = await carregarPedidoKanbanQuickView({
        vendaId,
        tabelaOrigem,
        token,
        tipoVenda,
        observacaoPedidoHint,
        forcarAtualizacao: Boolean(cacheLocal),
      })
      setDados(resultado)
    } catch (error) {
      if (!cacheLocal) {
        setDados(null)
      }
      setErro(error instanceof Error ? error.message : 'Erro ao carregar dados do pedido')
    } finally {
      setLoading(false)
    }
  }, [auth, observacaoPedidoHint, tabelaOrigem, tipoVenda, vendaId])

  useEffect(() => {
    if (!open) {
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
          onPointerDown: impedirPropagacaoParaCardKanban,
          onMouseDown: impedirPropagacaoParaCardKanban,
          onTouchStart: impedirPropagacaoParaCardKanban,
          sx: {
            mt: 0.5,
            width: 320,
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: 'min(75vh, 560px)',
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 1.5,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          },
        },
      }}
    >
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2"
        onPointerDown={impedirPropagacaoParaCardKanban}
        onMouseDown={impedirPropagacaoParaCardKanban}
        onTouchStart={impedirPropagacaoParaCardKanban}
      >
        {loading && (
          <div className="flex min-h-[120px] flex-1 items-center justify-center">
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
            enderecoEmpresa={empresa?.endereco ?? null}
            colunaAtual={colunaAtual}
            tipoVenda={tipoVenda}
          />
        )}
      </div>
    </Popover>
  )
}
