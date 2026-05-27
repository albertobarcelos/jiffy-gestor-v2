'use client'

import { useState } from 'react'
import type {
  AbaDetalhesPedido,
  DetalhesPedidoMeta,
  ResumoFinanceiroDetalhes,
  ResumoFiscalVenda,
} from '../types'

export function useNovoPedidoDetalhe() {
  const [abaDetalhesPedido, setAbaDetalhesPedido] = useState<AbaDetalhesPedido>('infoPedido')
  const [detalhesPedidoMeta, setDetalhesPedidoMeta] = useState<DetalhesPedidoMeta | null>(null)
  const [nomesUsuariosPedido, setNomesUsuariosPedido] = useState<Record<string, string>>({})
  const [nomesMeiosPagamentoPedido, setNomesMeiosPagamentoPedido] =
    useState<Record<string, string>>({})
  const [resumoFinanceiroDetalhes, setResumoFinanceiroDetalhes] =
    useState<ResumoFinanceiroDetalhes | null>(null)
  const [resumoFiscal, setResumoFiscal] = useState<ResumoFiscalVenda | null>(null)
  /** Texto bruto de `origem` no GET de detalhe (GESTOR/PDV/…); PDV muitas vezes omite o campo */
  const [origemTextoApiDetalhe, setOrigemTextoApiDetalhe] = useState<string | null>(null)
  /** Texto bruto de `statusVenda` no GET de detalhe (Gestor pode vir null) */
  const [statusVendaTextoApiDetalhe, setStatusVendaTextoApiDetalhe] = useState<string | null>(null)

  return {
    abaDetalhesPedido,
    setAbaDetalhesPedido,
    detalhesPedidoMeta,
    setDetalhesPedidoMeta,
    nomesUsuariosPedido,
    setNomesUsuariosPedido,
    nomesMeiosPagamentoPedido,
    setNomesMeiosPagamentoPedido,
    resumoFinanceiroDetalhes,
    setResumoFinanceiroDetalhes,
    resumoFiscal,
    setResumoFiscal,
    origemTextoApiDetalhe,
    setOrigemTextoApiDetalhe,
    statusVendaTextoApiDetalhe,
    setStatusVendaTextoApiDetalhe,
  }
}
