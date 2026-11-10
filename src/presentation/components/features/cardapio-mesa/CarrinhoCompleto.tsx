'use client'

import { useCallback, useEffect, useState } from 'react'
import { MdAdd, MdDelete, MdRemove } from 'react-icons/md'
import {
  enviarPedido,
  modificarItemCarrinho,
  obterCarrinho,
  removerItemCarrinho,
  type Carrinho,
} from '@/src/infrastructure/api/cardapio-mesa/cardapioMesaApiService'
import { showToast } from '@/src/shared/utils/toast'
import { lerMesaQrSession } from './mesaQrSession'
import CardapioMesaSidePanel from './CardapioMesaSidePanel'

type Props = {
  mesaId: string
  /** `panel` = drawer lateral; `page` = conteúdo de página completa. */
  variant?: 'panel' | 'page'
  open?: boolean
  onClose?: () => void
  onChanged?: () => void
  onContinueShopping?: () => void
  onAfterEnviar?: () => void
}

function formatarPreco(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export default function CarrinhoCompleto({
  mesaId,
  variant = 'page',
  open = true,
  onClose,
  onChanged,
  onContinueShopping,
  onAfterEnviar,
}: Props) {
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
    if (variant === 'panel' && !open) return
    void carregar()
  }, [carregar, open, variant])

  const notify = () => onChanged?.()

  const handleQty = async (itemId: string, quantidade: number) => {
    if (quantidade < 1) return
    const next = await modificarItemCarrinho(sessionId, itemId, { quantidade })
    setCarrinho(next)
    notify()
  }

  const handleRemove = async (itemId: string) => {
    const next = await removerItemCarrinho(sessionId, itemId)
    setCarrinho(next)
    notify()
  }

  const handleEnviar = async () => {
    if (!carrinho || carrinho.itens.length === 0) return
    setEnviando(true)
    try {
      const result = await enviarPedido(sessionId)
      showToast.success(result.mensagem)
      setCarrinho({ itens: [], subtotal: 0, total: 0, totalItens: 0 })
      notify()
      onAfterEnviar?.()
      onClose?.()
    } catch {
      showToast.error('Erro ao enviar pedido')
    } finally {
      setEnviando(false)
    }
  }

  const body = (() => {
    if (loading) {
      return (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-orange-500" />
        </div>
      )
    }

    if (!carrinho || carrinho.itens.length === 0) {
      return (
        <div className="p-6 text-center">
          <p className="mb-4" style={{ color: 'var(--cardapio-text-secondary)' }}>
            Seu carrinho está vazio.
          </p>
          <button
            type="button"
            onClick={() => {
              onContinueShopping?.()
              onClose?.()
            }}
            className="rounded-xl px-4 py-2 font-semibold text-white"
            style={{ backgroundColor: 'var(--cardapio-accent-primary, #FF7A00)' }}
          >
            Ver cardápio
          </button>
        </div>
      )
    }

    return (
      <ul className="divide-y" style={{ borderColor: 'var(--cardapio-border, #333)' }}>
        {carrinho.itens.map(item => (
          <li key={item.id} className="flex items-start gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold" style={{ color: 'var(--cardapio-text-primary)' }}>
                {item.produtoNome}
              </p>
              <p className="text-sm" style={{ color: 'var(--cardapio-text-secondary)' }}>
                {formatarPreco(item.valorUnitario)} / un.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border p-1"
                  style={{
                    borderColor: 'var(--cardapio-border, #333)',
                    color: 'var(--cardapio-text-primary)',
                  }}
                  onClick={() => handleQty(item.id, item.quantidade - 1)}
                  disabled={item.quantidade <= 1}
                >
                  <MdRemove className="h-4 w-4" />
                </button>
                <span
                  className="w-6 text-center text-sm font-semibold"
                  style={{ color: 'var(--cardapio-text-primary)' }}
                >
                  {item.quantidade}
                </span>
                <button
                  type="button"
                  className="rounded-full border p-1"
                  style={{
                    borderColor: 'var(--cardapio-border, #333)',
                    color: 'var(--cardapio-text-primary)',
                  }}
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
            <p className="shrink-0 font-semibold" style={{ color: 'var(--cardapio-text-primary)' }}>
              {formatarPreco(item.valorTotal)}
            </p>
          </li>
        ))}
      </ul>
    )
  })()

  const footer =
    !loading && carrinho && carrinho.itens.length > 0 ? (
      <div className="space-y-3">
        <div
          className="flex justify-between text-lg font-bold"
          style={{ color: 'var(--cardapio-text-primary)' }}
        >
          <span>Total</span>
          <span>{formatarPreco(carrinho.total)}</span>
        </div>
        <button
          type="button"
          disabled={enviando}
          onClick={handleEnviar}
          className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: 'var(--cardapio-accent-primary, #FF7A00)' }}
        >
          {enviando ? 'Enviando...' : 'Enviar pedido (mock)'}
        </button>
      </div>
    ) : null

  if (variant === 'panel') {
    return (
      <CardapioMesaSidePanel
        open={open}
        onClose={() => onClose?.()}
        title="Carrinho"
        ariaLabel="Carrinho"
        footer={footer}
      >
        {body}
      </CardapioMesaSidePanel>
    )
  }

  return (
    <div className="space-y-4">
      <div
        className="overflow-hidden rounded-2xl shadow"
        style={{ backgroundColor: 'var(--cardapio-bg-secondary)' }}
      >
        {body}
        {footer ? (
          <div className="border-t p-4" style={{ borderColor: 'var(--cardapio-border, #333)' }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
