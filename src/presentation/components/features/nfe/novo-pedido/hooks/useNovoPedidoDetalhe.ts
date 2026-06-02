'use client'

import { useState } from 'react'
import type {
  AbaDetalhesPedido,
  DetalhesEntregaPedido,
  DetalhesPedidoMeta,
  ResumoFinanceiroDetalhes,
  ResumoFiscalVenda,
} from '../types'

export function useNovoPedidoDetalhe() {
  const [abaDetalhesPedido, setAbaDetalhesPedido] = useState<AbaDetalhesPedido>('infoPedido')
  const [detalhesPedidoMeta, setDetalhesPedidoMeta] = useState<DetalhesPedidoMeta | null>(null)
  const [detalhesEntregaPedido, setDetalhesEntregaPedido] = useState<DetalhesEntregaPedido | null>(
    null
  )
  const [nomesUsuariosPedido, setNomesUsuariosPedido] = useState<Record<string, string>>({})
  const [nomesMeiosPagamentoPedido, setNomesMeiosPagamentoPedido] =
    useState<Record<string, string>>({})
  const [resumoFinanceiroDetalhes, setResumoFinanceiroDetalhes] =
    useState<ResumoFinanceiroDetalhes | null>(null)
  const [resumoFiscal, setResumoFiscal] = useState<ResumoFiscalVenda | null>(null)
  const [statusFiscalDetalhe, setStatusFiscalDetalhe] = useState<string | null>(null)

  return {
    abaDetalhesPedido,
    setAbaDetalhesPedido,
    detalhesPedidoMeta,
    setDetalhesPedidoMeta,
    detalhesEntregaPedido,
    setDetalhesEntregaPedido,
    nomesUsuariosPedido,
    setNomesUsuariosPedido,
    nomesMeiosPagamentoPedido,
    setNomesMeiosPagamentoPedido,
    resumoFinanceiroDetalhes,
    setResumoFinanceiroDetalhes,
    resumoFiscal,
    setResumoFiscal,
    statusFiscalDetalhe,
    setStatusFiscalDetalhe,
  }
}
