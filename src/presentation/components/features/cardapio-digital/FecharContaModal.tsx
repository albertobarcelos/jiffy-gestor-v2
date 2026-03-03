'use client'

import { useState, useEffect } from 'react'
import { fecharConta, obterCarrinho } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import { showToast } from '@/src/shared/utils/toast'
import { MdReceipt, MdCheckCircle } from 'react-icons/md'

interface FecharContaModalProps {
  mesaId: string
  onClose: () => void
}

/**
 * Modal premium para fechar conta
 */
export default function FecharContaModal({ mesaId, onClose }: FecharContaModalProps) {
  const [resumo, setResumo] = useState<{ totalItens: number; total: number } | null>(null)
  const [fechando, setFechando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    const carregarResumo = async () => {
      try {
        const sessionId = sessionStorage.getItem('cardapio_session_token') || mesaId
        const carrinho = await obterCarrinho(sessionId)
        setResumo({
          totalItens: carrinho.totalItens,
          total: carrinho.total,
        })
      } catch (error) {
        console.error('Erro ao carregar resumo:', error)
      }
    }

    carregarResumo()
  }, [mesaId])

  const handleFecharConta = async () => {
    setFechando(true)
    try {
      const sessionId = sessionStorage.getItem('cardapio_session_token') || mesaId
      const resultado = await fecharConta(sessionId)
      if (resultado.success) {
        setSucesso(true)
        showToast.success(resultado.mensagem)
        setTimeout(() => {
          onClose()
        }, 2000)
      }
    } catch (error) {
      console.error('Erro ao fechar conta:', error)
      showToast.error('Erro ao solicitar fechamento. Tente novamente.')
    } finally {
      setFechando(false)
    }
  }

  const formatarPreco = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  if (sucesso) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MdCheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Solicitação Enviada!</h2>
          <p className="text-gray-600 mb-6">
            Um garçom virá à sua mesa para finalizar o pagamento.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-3xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MdReceipt className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Fechar Conta</h2>
          <p className="text-gray-600">Solicite o fechamento da sua conta</p>
        </div>

        {/* Resumo */}
        {resumo && (
          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Total de itens</span>
                <span className="font-semibold text-gray-900">{resumo.totalItens}</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatarPreco(resumo.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Informação */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Importante:</strong> O pagamento será realizado pelo garçom na sua mesa.
            Um garçom será chamado para finalizar o pagamento.
          </p>
        </div>

        {/* Ações */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={handleFecharConta}
            disabled={fechando}
            className="flex-1 bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {fechando ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Enviando...</span>
              </>
            ) : (
              <span>Fechar Conta</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
