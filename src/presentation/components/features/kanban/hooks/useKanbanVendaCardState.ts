'use client'

import { useCallback, useEffect, useState } from 'react'
import { abrirDocumentoFiscalPdf } from '@/src/presentation/utils/abrirDocumentoFiscalPdf'
import { abrirNotaFiscalPublica } from '@/src/shared/utils/notaFiscalPublicaUrl'
import { showToast } from '@/src/shared/utils/toast'
import { kanbanVendaUsaCupomPublicoNfce } from '../rules/fiscalFlowKanban.rules'
import type { Venda } from '../types'

export interface UseKanbanVendaCardStateParams {
  abrirEntregadorSolicitado?: boolean
  exibirAtribuirEntregador: boolean
  onAbrirEntregadorConsumido?: () => void
}

export function useKanbanVendaCardState(params: UseKanbanVendaCardStateParams) {
  const { abrirEntregadorSolicitado = false, exibirAtribuirEntregador, onAbrirEntregadorConsumido } =
    params

  const [entregaQuickViewAnchor, setEntregaQuickViewAnchor] = useState<HTMLElement | null>(null)
  const [atribuirEntregadorOpen, setAtribuirEntregadorOpen] = useState(false)
  const [observacaoPedidoOpen, setObservacaoPedidoOpen] = useState(false)
  const [enderecoEntregaOpen, setEnderecoEntregaOpen] = useState(false)

  useEffect(() => {
    if (!abrirEntregadorSolicitado) return
    if (exibirAtribuirEntregador) {
      setAtribuirEntregadorOpen(true)
    }
    onAbrirEntregadorConsumido?.()
  }, [abrirEntregadorSolicitado, exibirAtribuirEntregador, onAbrirEntregadorConsumido])

  const quickViewAberto = Boolean(entregaQuickViewAnchor)
  const bloquearDragCard =
    quickViewAberto || atribuirEntregadorOpen || observacaoPedidoOpen || enderecoEntregaOpen

  const abrirDocumentoVendaKanban = useCallback((venda: Venda) => {
    if (kanbanVendaUsaCupomPublicoNfce(venda)) {
      try {
        abrirNotaFiscalPublica(venda.id)
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : 'Não foi possível abrir o cupom público.'
        showToast.error(msg)
      }
      return
    }
    if (venda.documentoFiscalId) {
      void abrirDocumentoFiscalPdf(venda.documentoFiscalId, venda.tipoDocFiscal)
    }
  }, [])

  return {
    entregaQuickViewAnchor,
    setEntregaQuickViewAnchor,
    atribuirEntregadorOpen,
    setAtribuirEntregadorOpen,
    observacaoPedidoOpen,
    setObservacaoPedidoOpen,
    enderecoEntregaOpen,
    setEnderecoEntregaOpen,
    bloquearDragCard,
    abrirDocumentoVendaKanban,
  }
}
