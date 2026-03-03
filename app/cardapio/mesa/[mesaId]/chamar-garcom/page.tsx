'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ChamarGarcomModal from '@/src/presentation/components/features/cardapio-digital/ChamarGarcomModal'
import { MdArrowBack } from 'react-icons/md'

/**
 * Página para chamar garçom
 */
export default function ChamarGarcomPage() {
  const params = useParams()
  const router = useRouter()
  const mesaId = params.mesaId as string
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    const sessionToken = sessionStorage.getItem('cardapio_session_token')
    const storedMesaId = sessionStorage.getItem('cardapio_mesa_id')

    if (!sessionToken || storedMesaId !== mesaId) {
      router.push('/cardapio/instrucoes')
      return
    }

    setIsValid(true)
  }, [mesaId, router])

  const handleClose = () => {
    router.push(`/cardapio/mesa/${mesaId}`)
  }

  const handleSuccess = () => {
    router.push(`/cardapio/mesa/${mesaId}`)
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MdArrowBack className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Chamar Garçom</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <div className="container mx-auto px-4 py-8">
        <ChamarGarcomModal mesaId={mesaId} onClose={handleClose} onSuccess={handleSuccess} />
      </div>
    </div>
  )
}
