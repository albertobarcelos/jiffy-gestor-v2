'use client'

import {
  AlertCircle,
  Clock3,
  SearchX,
  ServerCrash,
  Store,
} from 'lucide-react'
import type { TipoErroCatalogoPublicoUi } from '@/src/application/errors/resolverMensagemErroCatalogoPublico'

type DeliveryCatalogoErroScreenProps = {
  tipo: TipoErroCatalogoPublicoUi
  titulo: string
  descricao: string
}

function IconePorTipo({ tipo }: { tipo: TipoErroCatalogoPublicoUi }) {
  const className = 'h-8 w-8'
  switch (tipo) {
    case 'loja_nao_encontrada':
      return <SearchX className={className} strokeWidth={2} aria-hidden />
    case 'loja_indisponivel':
      return <Store className={className} strokeWidth={2} aria-hidden />
    case 'muitas_requisicoes':
      return <Clock3 className={className} strokeWidth={2} aria-hidden />
    case 'instabilidade':
      return <ServerCrash className={className} strokeWidth={2} aria-hidden />
    default:
      return <AlertCircle className={className} strokeWidth={2} aria-hidden />
  }
}

/** Tela de erro humanizada do catálogo público: ícone + textos centralizados. */
export function DeliveryCatalogoErroScreen({
  tipo,
  titulo,
  descricao,
}: DeliveryCatalogoErroScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--delivery-primary, #6b7280) 12%, white)',
          color: 'var(--delivery-primary, #4b5563)',
        }}
        aria-hidden
      >
        <IconePorTipo tipo={tipo} />
      </div>
      <h1 className="mt-5 max-w-md text-xl font-semibold tracking-tight text-gray-900">
        {titulo}
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">{descricao}</p>
    </div>
  )
}
