'use client'

import { useEffect, useState } from 'react'
import { MdCheckCircle, MdReceipt } from 'react-icons/md'
import {
  fecharConta,
  obterCarrinho,
} from '@/src/infrastructure/api/cardapio-mesa/cardapioMesaApiService'
import { showToast } from '@/src/shared/utils/toast'
import { lerMesaQrSession } from './mesaQrSession'

type Props = {
  mesaId: string
  onClose: () => void
}

function formatarPreco(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export default function FecharContaModal({ mesaId, onClose }: Props) {
  const [resumo, setResumo] = useState<{ totalItens: number; total: number } | null>(null)
  const [fechando, setFechando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    const carregar = async () => {
      try {
        const sessionId = lerMesaQrSession()?.sessionToken || mesaId
        const carrinho = await obterCarrinho(sessionId)
        setResumo({ totalItens: carrinho.totalItens, total: carrinho.total })
      } catch {
        /* ignore */
      }
    }
    carregar()
  }, [mesaId])

  const handleFecharConta = async () => {
    setFechando(true)
    try {
      const sessionId = lerMesaQrSession()?.sessionToken || mesaId
      const resultado = await fecharConta(sessionId)
      if (resultado.success) {
        setSucesso(true)
        showToast.success(resultado.mensagem)
        setTimeout(onClose, 1800)
      }
    } catch {
      showToast.error('Erro ao solicitar fechamento.')
    } finally {
      setFechando(false)
    }
  }

  if (sucesso) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <MdCheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="mb-2 text-3xl font-bold text-gray-900">Solicitação Enviada!</h2>
          <p className="text-gray-600">Um garçom virá à sua mesa para finalizar o pagamento.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
            <MdReceipt className="h-10 w-10 text-orange-600" />
          </div>
          <h2 className="mb-2 text-3xl font-bold text-gray-900">Fechar Conta</h2>
          <p className="text-gray-600">Solicitar atendimento para pagamento</p>
        </div>

        {resumo ? (
          <div className="mb-6 rounded-xl bg-gray-50 p-4 text-left">
            <p className="text-sm text-gray-600">
              Itens no carrinho (mock): <strong>{resumo.totalItens}</strong>
            </p>
            <p className="text-lg font-bold text-gray-900">{formatarPreco(resumo.total)}</p>
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 font-semibold text-gray-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={fechando}
            onClick={handleFecharConta}
            className="flex-1 rounded-xl bg-orange-500 py-3 font-semibold text-white disabled:opacity-60"
          >
            {fechando ? 'Enviando...' : 'Solicitar fechamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
