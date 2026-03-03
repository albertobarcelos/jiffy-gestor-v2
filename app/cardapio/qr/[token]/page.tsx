'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { validarQRCode } from '@/src/infrastructure/api/cardapio/cardapioApiService'

/**
 * Página de validação do QR Code
 * Valida o token e cria sessão
 */
export default function QRCodeValidationPage() {
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
          // Salvar sessão
          sessionStorage.setItem('cardapio_session_token', resultado.sessionToken)
          sessionStorage.setItem('cardapio_mesa_id', resultado.mesaId)
          sessionStorage.setItem('cardapio_numero_mesa', String(resultado.numeroMesa || ''))
          sessionStorage.setItem('cardapio_empresa_id', resultado.empresaId || '')

          setStatus('sucesso')
          setMensagem('Redirecionando para o cardápio...')

          // Redirecionar para cardápio da mesa
          setTimeout(() => {
            router.push(`/cardapio/mesa/${resultado.mesaId}`)
          }, 1000)
        } else {
          setStatus('erro')
          setMensagem(resultado.error || 'Token inválido')
        }
      } catch (error) {
        setStatus('erro')
        setMensagem('Erro ao validar QR Code. Tente novamente.')
        console.error('Erro ao validar QR Code:', error)
      }
    }

    if (token) {
      validar()
    } else {
      setStatus('erro')
      setMensagem('Token não encontrado')
    }
  }, [token, router])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === 'validando' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Validando...</h2>
            <p className="text-gray-600">{mensagem}</p>
          </>
        )}

        {status === 'sucesso' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sucesso!</h2>
            <p className="text-gray-600">{mensagem}</p>
          </>
        )}

        {status === 'erro' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro</h2>
            <p className="text-gray-600 mb-6">{mensagem}</p>
            <button
              onClick={() => router.push('/cardapio/instrucoes')}
              className="w-full bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Voltar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
