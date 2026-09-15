'use client'

import Image from 'next/image'

export function PedidoCarrinhoVazio() {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center overflow-hidden p-4">
      <div className="flex items-center gap-3">
        <div className="relative h-32 w-28 shrink-0 sm:h-36 sm:w-32">
          <Image
            src="/images/jiffy-acenando.png"
            alt="Jiffy acenando"
            fill
            sizes="128px"
            className="object-contain"
          />
        </div>
        <p className="max-w-[11rem] text-base leading-snug text-gray-600">
          Nada por aqui ainda.
          <br />
          Escolha um produto
          <br />
          para lançar no pedido.
        </p>
      </div>
    </div>
  )
}
