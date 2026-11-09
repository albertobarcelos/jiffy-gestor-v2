'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MdArrowBack } from 'react-icons/md'
import CarrinhoCompleto from '@/src/presentation/components/features/cardapio-mesa/CarrinhoCompleto'
import { sessaoValidaParaMesa } from '@/src/presentation/components/features/cardapio-mesa/mesaQrSession'

export default function CarrinhoPage() {
  const params = useParams()
  const router = useRouter()
  const mesaId = params.mesaId as string
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    if (!sessaoValidaParaMesa(mesaId)) {
      router.push('/cardapio-mesa/instrucoes')
      return
    }
    setIsValid(true)
  }, [mesaId, router])

  if (!isValid) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-6" style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}>
      <button
        type="button"
        onClick={() => router.push(`/cardapio-mesa/mesa/${mesaId}`)}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium"
        style={{ color: 'var(--cardapio-text-primary)' }}
      >
        <MdArrowBack className="h-5 w-5" />
        Voltar
      </button>
      <h1 className="mb-4 text-2xl font-bold" style={{ color: 'var(--cardapio-text-primary)' }}>
        Carrinho
      </h1>
      <CarrinhoCompleto mesaId={mesaId} />
    </div>
  )
}
