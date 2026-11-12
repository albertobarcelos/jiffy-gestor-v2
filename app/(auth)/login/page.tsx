import type { Viewport } from 'next'
import { headers } from 'next/headers'
import { Suspense } from 'react'
import { isSuperficieExpedicaoApp } from '@/src/application/expedicao/app/detectarSuperficieExpedicao'
import {
  EXPEDICAO_APP_CHROME_MARCA,
  VIEWPORT_ESCALA_APP_ENTREGADOR,
} from '@/src/presentation/expedicao/app/pwa/viewportExpedicaoApp'
import { LoginPageGate } from '@/src/presentation/components/features/auth/LoginPageGate'

function searchDaPagina(params: Record<string, string | string[] | undefined>): string {
  const search = new URLSearchParams()
  for (const [chave, valor] of Object.entries(params)) {
    if (Array.isArray(valor)) {
      for (const item of valor) search.append(chave, item)
    } else if (typeof valor === 'string') {
      search.set(chave, valor)
    }
  }
  return search.toString()
}

export async function generateViewport({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Viewport> {
  const [params, headerList] = await Promise.all([searchParams, headers()])
  if (
    isSuperficieExpedicaoApp({
      pathname: '/login',
      search: searchDaPagina(params),
      host: headerList.get('host'),
    })
  ) {
    return {
      themeColor: EXPEDICAO_APP_CHROME_MARCA,
      ...VIEWPORT_ESCALA_APP_ENTREGADOR,
    }
  }

  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  }
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-zinc-50 text-sm text-zinc-500">
          Carregando…
        </div>
      }
    >
      <LoginPageGate />
    </Suspense>
  )
}
