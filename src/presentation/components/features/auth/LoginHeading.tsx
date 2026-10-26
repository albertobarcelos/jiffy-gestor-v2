'use client'

import { useSearchParams } from 'next/navigation'
import { isSuperficieExpedicaoApp } from '@/src/presentation/expedicao/sessao/sinalExpedicao'

export function LoginHeading() {
  const search = useSearchParams()
  const appEntregador = isSuperficieExpedicaoApp({
    pathname: '/login',
    search: search.toString(),
    host: typeof window !== 'undefined' ? window.location.host : '',
  })

  if (appEntregador) {
    return (
      <>
        <h1 className="mb-4 text-center font-heading text-2xl font-semibold text-primary-text">
          JiffyGO
        </h1>
        <p className="mb-8 text-center text-base font-semibold text-secondary">
          Entre com a conta da loja para ver seus pedidos
        </p>
      </>
    )
  }

  return (
    <>
      <h1 className="mb-4 text-center font-heading text-2xl font-semibold text-primary-text">
        Sua operação mais inteligente
        <span className="block">começa aqui!</span>
      </h1>
      <p className="mb-8 text-center text-base font-semibold text-secondary">
        Faça login para acessar o sistema
      </p>
    </>
  )
}
