'use client'

import { useState } from 'react'
import { MdRoomService, MdSend } from 'react-icons/md'
import { chamarGarcom } from '@/src/infrastructure/api/cardapio-mesa/cardapioMesaApiService'
import { showToast } from '@/src/shared/utils/toast'
import { lerMesaQrSession } from './mesaQrSession'

type Props = {
  mesaId: string
  onClose: () => void
  onSuccess: () => void
}

export default function ChamarGarcomModal({ mesaId, onClose, onSuccess }: Props) {
  const [motivo, setMotivo] = useState('PRECISO_AJUDA')
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
      const sessionId = lerMesaQrSession()?.sessionToken || mesaId
      await chamarGarcom(sessionId, motivo, mensagem)
      showToast.success('Garçom foi chamado! (mock)')
      onSuccess()
    } catch {
      showToast.error('Erro ao chamar garçom.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
            <MdRoomService className="h-10 w-10 text-orange-600" />
          </div>
          <h2 className="mb-2 text-3xl font-bold text-gray-900">Chamar Garçom</h2>
          <p className="text-gray-600">Como podemos ajudar?</p>
        </div>

        <div className="mb-6">
          <label className="mb-3 block text-sm font-semibold text-gray-700">Motivo</label>
          <div className="grid grid-cols-2 gap-3">
            {motivos.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMotivo(m.value)}
                className={`rounded-xl border-2 px-4 py-3 transition-all ${
                  motivo === m.value
                    ? 'border-orange-500 bg-orange-50 font-semibold text-orange-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-gray-700">Mensagem (opcional)</label>
          <textarea
            value={mensagem}
            onChange={e => setMensagem(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            placeholder="Detalhes adicionais..."
          />
        </div>

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
            disabled={enviando}
            onClick={handleEnviar}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-semibold text-white disabled:opacity-60"
          >
            <MdSend className="h-5 w-5" />
            {enviando ? 'Enviando...' : 'Chamar'}
          </button>
        </div>
      </div>
    </div>
  )
}
