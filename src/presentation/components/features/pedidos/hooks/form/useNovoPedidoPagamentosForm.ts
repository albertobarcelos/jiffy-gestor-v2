'use client'

import { useCallback } from 'react'
import { LiaMoneyBillSolid } from 'react-icons/lia'
import { HiOutlineCreditCard } from 'react-icons/hi2'
import { MdPix } from 'react-icons/md'
import type { IconType } from 'react-icons'
import type { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { formatarNumeroComMilhar } from '@/src/domain/services/pedido/CalculadoraPedido'
import { resolverLancamentoPagamento } from '@/src/domain/services/pedido/CalculadoraPagamentoPedido'
import type { PagamentoSelecionado } from '../../types'

function valorDigitadoDoCampo(valorRecebido: string): number | null {
  if (!valorRecebido.trim()) return null
  const valorLimpo = valorRecebido.replace(/\./g, '').replace(',', '.')
  const valor = parseFloat(valorLimpo)
  if (!Number.isFinite(valor) || valor <= 0) return null
  return valor
}

function idUsuarioGestorLogado(): string {
  return useAuthStore.getState().tenantAuth?.getUser()?.getId()?.trim() ?? ''
}

function nomeUsuarioGestorLogado(): string {
  return useAuthStore.getState().tenantAuth?.getUser()?.getName()?.trim() ?? ''
}

function carimboAtorGestorLogado(): { realizadoPorId?: string; realizadoPorNome?: string } {
  const realizadoPorId = idUsuarioGestorLogado()
  const realizadoPorNome = nomeUsuarioGestorLogado()
  return {
    ...(realizadoPorId ? { realizadoPorId } : {}),
    ...(realizadoPorNome ? { realizadoPorNome } : {}),
  }
}

export interface UseNovoPedidoPagamentosFormParams {
  pagamentos: PagamentoSelecionado[]
  setPagamentos: React.Dispatch<React.SetStateAction<PagamentoSelecionado[]>>
  meioPagamentoId: string
  setMeioPagamentoId: React.Dispatch<React.SetStateAction<string>>
  valorRecebido: string
  setValorRecebido: React.Dispatch<React.SetStateAction<string>>
  meiosPagamento: MeioPagamento[]
  totalProdutos: number
  totalPagamentos: number
  entregaComCobrancaPeloEntregador: boolean
}

export function useNovoPedidoPagamentosForm({
  pagamentos,
  setPagamentos,
  meioPagamentoId,
  setMeioPagamentoId,
  valorRecebido,
  setValorRecebido,
  meiosPagamento,
  totalProdutos,
  totalPagamentos,
  entregaComCobrancaPeloEntregador,
}: UseNovoPedidoPagamentosFormParams) {
  const obterIconeMeioPagamento = useCallback((nome: string): IconType => {
    const nomeLower = nome.toLowerCase()
    if (nomeLower.includes('dinheiro') || nomeLower.includes('cash')) {
      return LiaMoneyBillSolid
    }
    if (nomeLower.includes('pix')) {
      return MdPix
    }
    if (
      nomeLower.includes('credito') ||
      nomeLower.includes('debito') ||
      nomeLower.includes('cartão') ||
      nomeLower.includes('cartao')
    ) {
      return HiOutlineCreditCard
    }
    return HiOutlineCreditCard
  }, [])

  const formatarValorRecebido = useCallback((valor: string): string => {
    const apenasNumeros = valor.replace(/\D/g, '')
    if (apenasNumeros === '') return ''
    const valorCentavos = parseInt(apenasNumeros, 10)
    const valorReais = valorCentavos / 100
    return formatarNumeroComMilhar(valorReais)
  }, [])

  const isMeioPagamentoDinheiro = useCallback(
    (meioId: string): boolean => {
      const meio = meiosPagamento.find(m => m.getId() === meioId)
      if (!meio) return false
      const nomeMeio = meio.getNome().toLowerCase()
      return nomeMeio.includes('dinheiro') || nomeMeio.includes('cash')
    },
    [meiosPagamento]
  )

  const adicionarPagamentoPorCard = useCallback(
    (meioPagamentoIdSelecionado: string) => {
      const isDinheiro = isMeioPagamentoDinheiro(meioPagamentoIdSelecionado)
      const valorDigitado = valorDigitadoDoCampo(valorRecebido)
      const preview = resolverLancamentoPagamento({
        totalPedido: totalProdutos,
        pagamentosJaLancados: pagamentos,
        valorDigitado,
        isDinheiro,
      })
      if (!preview.ok) {
        showToast.error(preview.message)
        return
      }

      setPagamentos(prev => {
        const resultado = resolverLancamentoPagamento({
          totalPedido: totalProdutos,
          pagamentosJaLancados: prev,
          valorDigitado,
          isDinheiro,
        })
        if (!resultado.ok) return prev
        return [
          ...prev,
          {
            meioPagamentoId: meioPagamentoIdSelecionado,
            valor: resultado.valor,
            cobrarNaEntrega: entregaComCobrancaPeloEntregador,
            naoEfetivo: entregaComCobrancaPeloEntregador,
            ...carimboAtorGestorLogado(),
          },
        ]
      })
      setValorRecebido('')
    },
    [
      pagamentos,
      totalProdutos,
      valorRecebido,
      isMeioPagamentoDinheiro,
      entregaComCobrancaPeloEntregador,
      setPagamentos,
      setValorRecebido,
    ]
  )

  const adicionarPagamento = useCallback(() => {
    if (!meioPagamentoId) {
      showToast.error('Selecione um meio de pagamento')
      return
    }

    const valorRestante = totalProdutos - totalPagamentos
    if (valorRestante <= 0) {
      showToast.error('Valor já está totalmente pago')
      return
    }

    setPagamentos(prev => [
      ...prev,
      {
        meioPagamentoId,
        valor: valorRestante,
        ...carimboAtorGestorLogado(),
      },
    ])
    setMeioPagamentoId('')
  }, [
    meioPagamentoId,
    totalProdutos,
    totalPagamentos,
    setPagamentos,
    setMeioPagamentoId,
  ])

  const removerPagamento = useCallback(
    (index: number, pagamentoId?: string) => {
      setPagamentos(prev => {
        if (pagamentoId) return prev.filter(p => p.id !== pagamentoId)
        return prev.filter((_, i) => i !== index)
      })
    },
    [setPagamentos]
  )

  return {
    obterIconeMeioPagamento,
    formatarValorRecebido,
    adicionarPagamentoPorCard,
    adicionarPagamento,
    removerPagamento,
  }
}
