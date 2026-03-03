'use client'

import { useState } from 'react'
import { chamarGarcom } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import { showToast } from '@/src/shared/utils/toast'
import { MdRoomService, MdSend } from 'react-icons/md'

interface ChamarGarcomModalProps {
  mesaId: string
  onClose: () => void
  onSuccess: () => void
}

/**
 * Modal premium para chamar garçom
 */
export default function ChamarGarcomModal({ mesaId, onClose, onSuccess }: ChamarGarcomModalProps) {
  const [motivo, setMotivo] = useState<string>('PRECISO_AJUDA')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  const motivos = [
    { value: 'PRECISO_AJUDA', label: 'Preciso de ajuda' },
    { value: 'PEDIDO_ESPECIAL', label: 'Quero fazer um pedido especial' },
    { value: 'PROBLEMA_PEDIDO', label: 'Problema com o pedido' },
    { value: 'OUTRO', label: 'Outro motivo' },
  ]

  const handleEnviar = async () => {
    setEnviando(true)
    try {
      const sessionId = sessionStorage.getItem('cardapio_session_token') || mesaId
      await chamarGarcom(sessionId, motivo, mensagem)
      showToast.success('Garçom foi chamado! Aguarde alguns instantes.')
      onSuccess()
    } catch (error) {
      console.error('Erro ao chamar garçom:', error)
      showToast.error('Erro ao chamar garçom. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-3xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MdRoomService className="w-10 h-10 text-orange-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Chamar Garçom</h2>
          <p className="text-gray-600">Como podemos ajudar?</p>
        </div>

        {/* Motivo */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Motivo
          </label>
          <div className="grid grid-cols-2 gap-3">
            {motivos.map((m) => (
              <button
                key={m.value}
                onClick={() => setMotivo(m.value)}
                className={`
                  px-4 py-3 rounded-xl border-2 transition-all
                  ${
                    motivo === m.value
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }
                `}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mensagem */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Mensagem (opcional)
          </label>
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Descreva como podemos ajudar..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            rows={4}
          />
        </div>

        {/* Ações */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleEnviar}
            disabled={enviando}
            className="flex-1 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {enviando ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <MdSend className="w-5 h-5" />
                <span>Chamar Garçom</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
