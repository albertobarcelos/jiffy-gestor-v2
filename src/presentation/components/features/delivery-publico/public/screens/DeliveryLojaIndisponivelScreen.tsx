'use client'

import { MdStorefront } from 'react-icons/md'

type DeliveryLojaIndisponivelScreenProps = {
  mensagens: string[]
}

export function DeliveryLojaIndisponivelScreen({ mensagens }: DeliveryLojaIndisponivelScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-alternate/15 text-alternate">
        <MdStorefront className="h-7 w-7" aria-hidden />
      </div>
      <p className="mt-4 text-lg font-semibold text-gray-800">Loja em configuração</p>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Esta loja online ainda não está disponível. Tente novamente em breve.
      </p>
      {mensagens.length > 0 ? (
        <ul className="mt-4 max-w-md space-y-1 text-left text-sm text-gray-600">
          {mensagens.map(msg => (
            <li key={msg} className="rounded-lg bg-gray-50 px-3 py-2">
              {msg}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
