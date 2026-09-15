'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MoradaTelefone } from '@/src/domain/types/moradaEntrega'
import type {
  FluxoPagamentoEntrega,
  PagamentoSelecionado,
  ProdutoSelecionado,
  TipoAtendimentoDelivery,
} from '@/src/domain/types/pedido'
import {
  criarRascunhoPedidoWhatsAppVazio,
  obterRascunhoPedidoWhatsApp,
  type RascunhoPedidoWhatsApp,
  rascunhoPedidoWhatsAppTemItens,
  salvarRascunhoPedidoWhatsApp,
} from '../../rascunho/rascunhoPedidoWhatsAppCache'

type Setters = {
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void
  setProdutos: (produtos: ProdutoSelecionado[]) => void
  setObservacaoPedido: (valor: string) => void
  setPagamentos: (pagamentos: PagamentoSelecionado[]) => void
  setClienteId: (valor: string) => void
  setClienteNome: (valor: string) => void
  setClienteEntregaVinculado: (valor: { id: string; nome: string } | null) => void
  setMoradaEntregaSelecionada: (valor: MoradaTelefone | null) => void
  setTelefoneBuscaEntrega: (valor: string) => void
  setTelefoneBuscadoEntrega: (valor: string | null) => void
  setTipoAtendimentoDelivery: (valor: TipoAtendimentoDelivery) => void
  setFluxoPagamentoEntrega: (valor: FluxoPagamentoEntrega) => void
  setTaxaEntregaId: (valor: string) => void
  setTempoPrevistoMinutos: (valor: number) => void
  setEnderecoEntregaCoberturaStatus: (
    valor: 'ok' | 'fora' | 'pendente' | 'indisponivel' | null
  ) => void
  setEnderecoEntregaCoberturaValorTaxa: (valor: number | null) => void
}

type Params = Setters &
  RascunhoPedidoWhatsApp & {
    ativo: boolean
    chave: string | undefined
    sucessoRef: React.MutableRefObject<boolean>
  }

function capturarRascunho(params: RascunhoPedidoWhatsApp): RascunhoPedidoWhatsApp {
  return {
    currentStep: params.currentStep,
    produtos: params.produtos,
    observacaoPedido: params.observacaoPedido,
    pagamentos: params.pagamentos,
    clienteId: params.clienteId,
    clienteNome: params.clienteNome,
    clienteEntregaVinculado: params.clienteEntregaVinculado,
    moradaEntregaSelecionada: params.moradaEntregaSelecionada,
    telefoneBuscaEntrega: params.telefoneBuscaEntrega,
    telefoneBuscadoEntrega: params.telefoneBuscadoEntrega,
    tipoAtendimentoDelivery: params.tipoAtendimentoDelivery,
    fluxoPagamentoEntrega: params.fluxoPagamentoEntrega,
    taxaEntregaId: params.taxaEntregaId,
    tempoPrevistoMinutos: params.tempoPrevistoMinutos,
    enderecoEntregaCoberturaStatus: params.enderecoEntregaCoberturaStatus,
    enderecoEntregaCoberturaValorTaxa: params.enderecoEntregaCoberturaValorTaxa,
  }
}

function aplicarRascunho(rascunho: RascunhoPedidoWhatsApp, setters: Setters) {
  setters.setCurrentStep(rascunho.currentStep)
  setters.setProdutos(rascunho.produtos)
  setters.setObservacaoPedido(rascunho.observacaoPedido)
  setters.setPagamentos(rascunho.pagamentos)
  setters.setClienteId(rascunho.clienteId)
  setters.setClienteNome(rascunho.clienteNome)
  setters.setClienteEntregaVinculado(rascunho.clienteEntregaVinculado)
  setters.setMoradaEntregaSelecionada(rascunho.moradaEntregaSelecionada)
  setters.setTelefoneBuscaEntrega(rascunho.telefoneBuscaEntrega)
  setters.setTelefoneBuscadoEntrega(rascunho.telefoneBuscadoEntrega)
  setters.setTipoAtendimentoDelivery(rascunho.tipoAtendimentoDelivery)
  setters.setFluxoPagamentoEntrega(rascunho.fluxoPagamentoEntrega)
  setters.setTaxaEntregaId(rascunho.taxaEntregaId)
  setters.setTempoPrevistoMinutos(rascunho.tempoPrevistoMinutos)
  setters.setEnderecoEntregaCoberturaStatus(rascunho.enderecoEntregaCoberturaStatus)
  setters.setEnderecoEntregaCoberturaValorTaxa(rascunho.enderecoEntregaCoberturaValorTaxa)
}

export function useRascunhoPedidoWhatsApp(params: Params) {
  const { ativo, chave, sucessoRef } = params
  const [hidratado, setHidratado] = useState(!ativo)
  const capturarRef = useRef(() => capturarRascunho(params))
  capturarRef.current = () => capturarRascunho(params)
  const settersRef = useRef<Setters>(params)
  settersRef.current = params
  const chaveAnteriorRef = useRef(chave)

  useLayoutEffect(() => {
    if (!ativo) {
      setHidratado(true)
      return
    }
    const chaveAnterior = chaveAnteriorRef.current
    if (chaveAnterior && chaveAnterior !== chave && !sucessoRef.current) {
      const anterior = capturarRef.current()
      if (rascunhoPedidoWhatsAppTemItens(anterior)) {
        salvarRascunhoPedidoWhatsApp(chaveAnterior, anterior)
      }
    }
    chaveAnteriorRef.current = chave
    const id = chave?.trim()
    const existente = id ? obterRascunhoPedidoWhatsApp(id) : null
    if (existente) {
      aplicarRascunho(existente, settersRef.current)
    } else if (chaveAnterior && chaveAnterior !== chave) {
      aplicarRascunho(criarRascunhoPedidoWhatsAppVazio(), settersRef.current)
    }
    setHidratado(true)
  }, [ativo, chave, sucessoRef])

  useEffect(() => {
    if (!ativo || !hidratado || sucessoRef.current) return
    const id = chave?.trim()
    if (!id) return
    salvarRascunhoPedidoWhatsApp(id, capturarRef.current())
  }, [
    ativo,
    chave,
    hidratado,
    sucessoRef,
    params.currentStep,
    params.produtos,
    params.observacaoPedido,
    params.pagamentos,
    params.clienteId,
    params.clienteNome,
    params.clienteEntregaVinculado,
    params.moradaEntregaSelecionada,
    params.telefoneBuscaEntrega,
    params.telefoneBuscadoEntrega,
    params.tipoAtendimentoDelivery,
    params.fluxoPagamentoEntrega,
    params.taxaEntregaId,
    params.tempoPrevistoMinutos,
    params.enderecoEntregaCoberturaStatus,
    params.enderecoEntregaCoberturaValorTaxa,
  ])

  useEffect(() => {
    return () => {
      if (!ativo || sucessoRef.current) return
      const id = chave?.trim()
      if (!id) return
      salvarRascunhoPedidoWhatsApp(id, capturarRef.current())
    }
  }, [ativo, chave, sucessoRef])
}

export { obterRascunhoPedidoWhatsApp }
