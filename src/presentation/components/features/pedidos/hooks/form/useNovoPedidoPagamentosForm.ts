'use client'

import { useCallback } from 'react'
import { LiaMoneyBillSolid } from 'react-icons/lia'
import { HiOutlineCreditCard } from 'react-icons/hi2'
import { MdPix } from 'react-icons/md'
import type { IconType } from 'react-icons'
import type { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import { showToast } from '@/src/shared/utils/toast'
import { formatarNumeroComMilhar } from '@/src/domain/services/pedido/CalculadoraPedido'
import type { PagamentoSelecionado } from '../../types'

export interface UseNovoPedidoPagamentosFormParams {
  pagamentos: PagamentoSelecionado[]
  setPagamentos: React.Dispatch<React.SetStateAction<PagamentoSelecionado[]>>
  meioPagamentoId: string
  setMeioPagamentoId: React.Dispatch<React.SetStateAction<string>>
  valorRecebido: string
  setValorRecebido: React.Dispatch<React.SetStateAction<string>>
  meiosPagamento: MeioPagamento[]
  pagamentoModoCobranca: boolean
  valorAPagar: number
  valorAPagarLancamento: number
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
  pagamentoModoCobranca,
  valorAPagar,
  valorAPagarLancamento,
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
      const saldoParaLancar = pagamentoModoCobranca ? valorAPagarLancamento : valorAPagar
      let valorParaUsar = 0

      if (valorRecebido && valorRecebido.trim() !== '') {
        const valorLimpo = valorRecebido.replace(/\./g, '').replace(',', '.')
        valorParaUsar = parseFloat(valorLimpo) || 0
      } else {
        valorParaUsar = saldoParaLancar
      }

      if (valorParaUsar <= 0) {
        showToast.error('Valor inválido')
        return
      }

      const isDinheiro = isMeioPagamentoDinheiro(meioPagamentoIdSelecionado)

      if (!isDinheiro && valorParaUsar > saldoParaLancar) {
        showToast.error(`Este meio de pagamento não pode ultrapassar o valor a pagar.`)
        return
      }

      setPagamentos(prev => [
        ...prev,
        {
          meioPagamentoId: meioPagamentoIdSelecionado,
          valor: valorParaUsar,
          cobrarNaEntrega: entregaComCobrancaPeloEntregador,
          naoEfetivo: entregaComCobrancaPeloEntregador,
        },
      ])
      setValorRecebido('')
    },
    [
      pagamentoModoCobranca,
      valorAPagarLancamento,
      valorAPagar,
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
