'use client'

import { useState, useCallback } from 'react'
import { buscarClienteParaEntregaUseCase } from '@/src/infrastructure/composition/pedidoUseCases'
import { Cliente } from '@/src/domain/entities/Cliente'
import type { MoradaTelefone } from '@/src/domain/types/moradaEntrega'
import type { ClientesTabsModalState } from '@/src/presentation/components/features/clientes/ClientesTabsModal'
import type {
  NovoPedidoClienteEntregaVinculado,
  PagamentoSelecionado,
  TipoAtendimentoDelivery,
} from '../../types'
import { resolverEfeitoTrocaTipoAtendimento } from '@/src/application/meios-pagamentos/resolverEfeitoTrocaTipoAtendimento'

export interface UseNovoPedidoClienteParams {
  tipoInicioPedido: 'balcao' | 'delivery'
  clienteEntregaVinculado: NovoPedidoClienteEntregaVinculado
  setClienteEntregaVinculado: React.Dispatch<
    React.SetStateAction<NovoPedidoClienteEntregaVinculado>
  >
  setClienteId: React.Dispatch<React.SetStateAction<string>>
  setClienteNome: React.Dispatch<React.SetStateAction<string>>
  setTelefoneBuscaEntrega: React.Dispatch<React.SetStateAction<string>>
  setTelefoneBuscadoEntrega: React.Dispatch<React.SetStateAction<string | null>>
  setMoradaEntregaSelecionada: React.Dispatch<React.SetStateAction<MoradaTelefone | null>>
  setTaxaEntregaId: React.Dispatch<React.SetStateAction<string>>
  setTipoAtendimentoDelivery: React.Dispatch<React.SetStateAction<TipoAtendimentoDelivery>>
  tipoAtendimentoDelivery: TipoAtendimentoDelivery
  setPagamentos: React.Dispatch<React.SetStateAction<PagamentoSelecionado[]>>
  setMeioPagamentoId: React.Dispatch<React.SetStateAction<string>>
  setValorRecebido: React.Dispatch<React.SetStateAction<string>>
  pedidoExistente: boolean
  getAccessToken: () => string | undefined
}

export function useNovoPedidoCliente({
  tipoInicioPedido,
  clienteEntregaVinculado,
  setClienteEntregaVinculado,
  setClienteId,
  setClienteNome,
  setTelefoneBuscaEntrega,
  setTelefoneBuscadoEntrega,
  setMoradaEntregaSelecionada,
  setTaxaEntregaId,
  setTipoAtendimentoDelivery,
  tipoAtendimentoDelivery,
  setPagamentos,
  setMeioPagamentoId,
  setValorRecebido,
  pedidoExistente,
  getAccessToken,
}: UseNovoPedidoClienteParams) {
  const [clienteTabsModalEntregaState, setClienteTabsModalEntregaState] =
    useState<ClientesTabsModalState>({
      open: false,
      tab: 'cliente',
      mode: 'edit',
    })

  const handleSelectCliente = useCallback(
    (cliente: Cliente) => {
      if (tipoInicioPedido === 'delivery') {
        const telefone = cliente.getTelefone()?.trim() ?? ''
        const telefoneDigitos = telefone.replace(/\D/g, '')

        setClienteEntregaVinculado({ id: cliente.getId(), nome: cliente.getNome() })
        if (telefone) {
          setTelefoneBuscaEntrega(telefone)
          setTelefoneBuscadoEntrega(telefoneDigitos.length >= 8 ? telefoneDigitos : null)
        }
        setMoradaEntregaSelecionada(null)
        return
      }

      setClienteId(cliente.getId())
      setClienteNome(cliente.getNome())
    },
    [
      tipoInicioPedido,
      setClienteEntregaVinculado,
      setTelefoneBuscaEntrega,
      setTelefoneBuscadoEntrega,
      setMoradaEntregaSelecionada,
      setClienteId,
      setClienteNome,
    ]
  )

  const handleRemoveCliente = useCallback(() => {
    setClienteId('')
    setClienteNome('')
  }, [setClienteId, setClienteNome])

  const handleTipoAtendimentoDeliveryChange = useCallback(
    (tipo: TipoAtendimentoDelivery) => {
      const efeito = resolverEfeitoTrocaTipoAtendimento({
        tipoAtual: tipoAtendimentoDelivery,
        tipoNovo: tipo,
        pedidoExistente,
      })
      if (!efeito.trocou) return
      setTipoAtendimentoDelivery(tipo)
      if (efeito.limparPagamentos) {
        setPagamentos([])
        setMeioPagamentoId('')
        setValorRecebido('')
      }
      if (efeito.limparEnderecoTaxa) {
        setTaxaEntregaId('')
        setMoradaEntregaSelecionada(null)
      }
    },
    [
      tipoAtendimentoDelivery,
      setTipoAtendimentoDelivery,
      pedidoExistente,
      setPagamentos,
      setMeioPagamentoId,
      setValorRecebido,
      setTaxaEntregaId,
      setMoradaEntregaSelecionada,
    ]
  )

  const handleAbrirEdicaoClienteEntrega = useCallback(() => {
    const id = clienteEntregaVinculado?.id?.trim()
    if (!id) return
    setClienteTabsModalEntregaState({
      open: true,
      tab: 'cliente',
      mode: 'edit',
      clienteId: id,
    })
  }, [clienteEntregaVinculado?.id])

  const handleFecharClienteTabsModalEntrega = useCallback(() => {
    setClienteTabsModalEntregaState(prev => ({ ...prev, open: false }))
  }, [])

  const handleTabChangeClienteTabsModalEntrega = useCallback(
    (tab: 'cliente' | 'visualizar') => {
      setClienteTabsModalEntregaState(prev => ({ ...prev, tab }))
    },
    []
  )

  const handleReloadClienteEntregaAposEdicao = useCallback(async () => {
    const id = clienteEntregaVinculado?.id?.trim()
    if (!id) return
    const token = getAccessToken()
    if (!token) return
    try {
      const c = await buscarClienteParaEntregaUseCase.execute(id, token)
      if (!c) return
      setClienteEntregaVinculado({ id: c.getId(), nome: c.getNome() })
    } catch {
      /* silencioso */
    }
  }, [clienteEntregaVinculado?.id, getAccessToken, setClienteEntregaVinculado])

  return {
    clienteTabsModalEntregaState,
    setClienteTabsModalEntregaState,
    handleSelectCliente,
    handleRemoveCliente,
    handleTipoAtendimentoDeliveryChange,
    handleAbrirEdicaoClienteEntrega,
    handleFecharClienteTabsModalEntrega,
    handleTabChangeClienteTabsModalEntrega,
    handleReloadClienteEntregaAposEdicao,
  }
}
