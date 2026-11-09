'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { validarQRCode } from '@/src/infrastructure/api/cardapio-mesa/cardapioMesaApiService'
import { gravarMesaQrSession } from '@/src/presentation/components/features/cardapio-mesa/mesaQrSession'

export default function CardapioMesaQrPage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string
  const [status, setStatus] = useState<'validando' | 'sucesso' | 'erro'>('validando')
  const [mensagem, setMensagem] = useState('Validando QR Code...')

  useEffect(() => {
    const validar = async () => {
      try {
        const resultado = await validarQRCode(token)
        if (resultado.valid && resultado.sessionToken && resultado.mesaId) {
          gravarMesaQrSession({
            sessionToken: resultado.sessionToken,
            mesaId: resultado.mesaId,
            numeroMesa: String(resultado.numeroMesa ?? '?'),
            empresaId: resultado.empresaId || '',
            menuId: resultado.menuId ?? null,
          })
          setStatus('sucesso')
          setMensagem('Redirecionando para o cardápio...')
          setTimeout(() => {
            router.push(`/cardapio-mesa/mesa/${resultado.mesaId}`)
          }, 700)
        } else {
          setStatus('erro')
          setMensagem(resultado.error || 'Token inválido')
        }
      } catch {
        setStatus('erro')
        setMensagem('Erro ao validar QR Code. Tente novamente.')
      }
    }

    if (token) validar()
    else {
      setStatus('erro')
      setMensagem('Token não encontrado')
    }
  }, [token, router])

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        {status === 'validando' && (
          <>
            <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-orange-500" />
            <h2 className="mb-2 text-xl font-semibold text-gray-900">Validando...</h2>
            <p className="text-gray-600">{mensagem}</p>
          </>
        )}
        {status === 'sucesso' && (
          <>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">Sucesso!</h2>
            <p className="text-gray-600">{mensagem}</p>
          </>
        )}
        {status === 'erro' && (
          <>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">Erro</h2>
            <p className="mb-6 text-gray-600">{mensagem}</p>
            <button
              type="button"
              onClick={() => router.push('/cardapio-mesa/instrucoes')}
              className="w-full rounded-lg bg-orange-500 py-3 font-semibold text-white"
            >
              Voltar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
