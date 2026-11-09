'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdDelete, MdRemove, MdAdd } from 'react-icons/md'
import {
  enviarPedido,
  modificarItemCarrinho,
  obterCarrinho,
  removerItemCarrinho,
  type Carrinho,
} from '@/src/infrastructure/api/cardapio-mesa/cardapioMesaApiService'
import { showToast } from '@/src/shared/utils/toast'
import { lerMesaQrSession } from './mesaQrSession'

type Props = { mesaId: string }

function formatarPreco(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export default function CarrinhoCompleto({ mesaId }: Props) {
  const router = useRouter()
  const sessionId = lerMesaQrSession()?.sessionToken || mesaId
  const [carrinho, setCarrinho] = useState<Carrinho | null>(null)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      setCarrinho(await obterCarrinho(sessionId))
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    carregar()
  }, [carregar])

  const handleQty = async (itemId: string, quantidade: number) => {
    if (quantidade < 1) return
    const next = await modificarItemCarrinho(sessionId, itemId, { quantidade })
    setCarrinho(next)
  }

  const handleRemove = async (itemId: string) => {
    const next = await removerItemCarrinho(sessionId, itemId)
    setCarrinho(next)
  }

  const handleEnviar = async () => {
    if (!carrinho || carrinho.itens.length === 0) return
    setEnviando(true)
    try {
      const result = await enviarPedido(sessionId)
      showToast.success(result.mensagem)
      setCarrinho({ itens: [], subtotal: 0, total: 0, totalItens: 0 })
      router.push(`/cardapio-mesa/mesa/${mesaId}`)
    } catch {
      showToast.error('Erro ao enviar pedido')
    } finally {
      setEnviando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-orange-500" />
      </div>
    )
  }

  if (!carrinho || carrinho.itens.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow">
        <p className="mb-4 text-gray-600">Seu carrinho está vazio.</p>
        <button
          type="button"
          onClick={() => router.push(`/cardapio-mesa/mesa/${mesaId}/cardapio`)}
          className="rounded-xl bg-orange-500 px-4 py-2 font-semibold text-white"
        >
          Ver cardápio
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl bg-white shadow">
        <ul className="divide-y divide-gray-100">
          {carrinho.itens.map(item => (
            <li key={item.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">{item.produtoNome}</p>
                <p className="text-sm text-gray-500">{formatarPreco(item.valorUnitario)} / un.</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full border p-1"
                    onClick={() => handleQty(item.id, item.quantidade - 1)}
                    disabled={item.quantidade <= 1}
                  >
                    <MdRemove className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantidade}</span>
                  <button
                    type="button"
                    className="rounded-full border p-1"
                    onClick={() => handleQty(item.id, item.quantidade + 1)}
                  >
                    <MdAdd className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="ml-2 rounded-full p-1 text-red-500"
                    onClick={() => handleRemove(item.id)}
                    aria-label="Remover"
                  >
                    <MdDelete className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <p className="shrink-0 font-semibold text-gray-900">{formatarPreco(item.valorTotal)}</p>
            </li>
          ))}
        </ul>
        <div className="border-t border-gray-100 p-4">
          <div className="mb-3 flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatarPreco(carrinho.total)}</span>
          </div>
          <button
            type="button"
            disabled={enviando}
            onClick={handleEnviar}
            className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white disabled:opacity-60"
          >
            {enviando ? 'Enviando...' : 'Enviar pedido (mock)'}
          </button>
        </div>
      </div>
    </div>
  )
}
