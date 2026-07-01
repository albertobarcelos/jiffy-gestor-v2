'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useMarcarEmissaoFiscal } from '@/src/presentation/hooks/useVendas'
import { showToast } from '@/src/shared/utils/toast'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type { Venda } from '../types'
import type { VendasUnificadasQueryParams } from './useKanbanDataQueries'

export interface UseFiscalReativacaoRejeitadaParams {
  isLoading: boolean
  todasVendasCarregadas: Venda[]
  modoKanbanVendas: ModoKanbanVendas
  vendasUnificadasQueryParams: VendasUnificadasQueryParams
  terminalFilter: string
}

/**
 * Reativa automaticamente solicitarEmissaoFiscal para vendas com nota REJEITADA
 * (mesmo PATCH de "marcar emissão", silent).
 */
export function useFiscalReativacaoRejeitada({
  isLoading,
  todasVendasCarregadas,
  modoKanbanVendas,
  vendasUnificadasQueryParams,
  terminalFilter,
}: UseFiscalReativacaoRejeitadaParams) {
  const rejeitadaReativacaoEmAndamentoRef = useRef(false)
  const rejeitadaReativacaoJaTentadaIdsRef = useRef<Set<string>>(new Set())
  const marcarEmissaoFiscal = useMarcarEmissaoFiscal()

  const queryKeyFingerprint = useMemo(
    () =>
      JSON.stringify({
        modo: modoKanbanVendas,
        params: vendasUnificadasQueryParams,
        terminal: terminalFilter || undefined,
      }),
    [modoKanbanVendas, vendasUnificadasQueryParams, terminalFilter]
  )

  useEffect(() => {
    rejeitadaReativacaoJaTentadaIdsRef.current = new Set()
  }, [queryKeyFingerprint])

  useEffect(() => {
    if (isLoading || !todasVendasCarregadas.length || rejeitadaReativacaoEmAndamentoRef.current)
      return

    const pendentes = todasVendasCarregadas.filter(v => {
      const rejeitada =
        String(v.statusFiscal ?? '')
          .trim()
          .toUpperCase() === 'REJEITADA'
      return (
        rejeitada &&
        !v.solicitarEmissaoFiscal &&
        !v.isPedidoEntregaGestor() &&
        !rejeitadaReativacaoJaTentadaIdsRef.current.has(v.id)
      )
    })
    if (pendentes.length === 0) return

    rejeitadaReativacaoEmAndamentoRef.current = true
    let cancelled = false
    void (async () => {
      try {
        let sucesso = 0
        for (const v of pendentes) {
          if (cancelled) break
          try {
            await marcarEmissaoFiscal.mutateAsync({
              id: v.id,
              tabelaOrigem: v.tabelaOrigem,
              silent: true,
            })
            rejeitadaReativacaoJaTentadaIdsRef.current.add(v.id)
            sucesso += 1
          } catch {
            rejeitadaReativacaoJaTentadaIdsRef.current.add(v.id)
          }
        }
        if (!cancelled && sucesso > 0) {
          showToast.info(
            sucesso === 1
              ? 'Solicitação de emissão reativada para a venda com nota rejeitada.'
              : `Solicitação de emissão reativada para ${sucesso} vendas com nota rejeitada.`
          )
        }
      } finally {
        rejeitadaReativacaoEmAndamentoRef.current = false
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoading, todasVendasCarregadas, marcarEmissaoFiscal])
}
