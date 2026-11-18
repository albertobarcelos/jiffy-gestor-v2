'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CarregarPainelDetalheVendaResultDTO,
  MeioPagamentoPainelDTO,
  VendaPainelDetalheDTO,
} from '@/src/application/dto/VendaPainelDetalheDTO'
import { carregarPainelDetalheVendaUseCase } from '@/src/infrastructure/composition/pedidoUseCases'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'

export type UsePainelDetalheVendaParams = {
  vendaId: string | null
  open: boolean
  tabelaOrigem?: 'venda' | 'venda_gestor'
  tipoEntregaLista?: 'entrega' | 'retirada' | null
  onAuthOrLoadError?: () => void
}

export function usePainelDetalheVenda({
  vendaId,
  open,
  tabelaOrigem = 'venda',
  tipoEntregaLista,
  onAuthOrLoadError,
}: UsePainelDetalheVendaParams) {
  const onAuthOrLoadErrorRef = useRef(onAuthOrLoadError)
  onAuthOrLoadErrorRef.current = onAuthOrLoadError

  const [venda, setVenda] = useState<VendaPainelDetalheDTO | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [nomesUsuarios, setNomesUsuarios] = useState<Record<string, string>>({})
  const [nomesMeiosPagamento, setNomesMeiosPagamento] = useState<
    Record<string, MeioPagamentoPainelDTO>
  >({})
  const [nomeCliente, setNomeCliente] = useState<string | null>(null)
  const [nomeTerminalResumoFiscal, setNomeTerminalResumoFiscal] = useState<string | null>(null)
  const [nomeEmpresaResumoFiscal, setNomeEmpresaResumoFiscal] = useState<string | null>(null)

  const clearState = useCallback(() => {
    setVenda(null)
    setNomeCliente(null)
    setNomeTerminalResumoFiscal(null)
    setNomeEmpresaResumoFiscal(null)
    setNomesUsuarios({})
    setNomesMeiosPagamento({})
  }, [])

  const applyResult = useCallback((result: CarregarPainelDetalheVendaResultDTO) => {
    setVenda(result.venda)
    setNomesUsuarios(result.nomesUsuarios)
    setNomesMeiosPagamento(result.nomesMeiosPagamento)
    setNomeCliente(result.nomeCliente)
    setNomeTerminalResumoFiscal(result.nomeTerminalResumoFiscal)
    setNomeEmpresaResumoFiscal(result.nomeEmpresaResumoFiscal)
  }, [])

  const load = useCallback(async () => {
    if (!vendaId || !open) return

    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) {
      showToast.error('Usuário não autenticado.')
      onAuthOrLoadErrorRef.current?.()
      return
    }

    setIsLoading(true)
    clearState()

    try {
      const result = await carregarPainelDetalheVendaUseCase.execute({
        vendaId,
        token,
        tabelaOrigem,
        tipoEntregaLista,
      })
      applyResult(result)
    } catch (error) {
      console.error('Erro ao buscar detalhes da venda:', error)
      showToast.error('Erro ao buscar detalhes da venda')
      clearState()
      onAuthOrLoadErrorRef.current?.()
    } finally {
      setIsLoading(false)
    }
  }, [vendaId, open, tabelaOrigem, tipoEntregaLista, clearState, applyResult])

  useEffect(() => {
    if (open && vendaId) {
      void load()
    }
  }, [open, vendaId, load])

  return {
    venda,
    isLoading,
    nomesUsuarios,
    nomesMeiosPagamento,
    nomeCliente,
    nomeTerminalResumoFiscal,
    nomeEmpresaResumoFiscal,
    clearState,
    reload: load,
  }
}
