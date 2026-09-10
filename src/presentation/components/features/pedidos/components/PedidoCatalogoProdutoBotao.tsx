'use client'

import { useEffect, useState } from 'react'
import { Produto } from '@/src/domain/entities/Produto'
import { transformarParaReal } from '@/src/shared/utils/formatters'

type PedidoCatalogoProdutoBotaoProps = {
  produto: Produto
  corHex: string
  onSelect: (produtoId: string) => void
}

export function PedidoCatalogoProdutoBotao({
  produto,
  corHex,
  onSelect,
}: PedidoCatalogoProdutoBotaoProps) {
  const imagemUrl = produto.getImagemUrl()
  const [imagemFalhou, setImagemFalhou] = useState(false)
  const mostrarFoto = Boolean(imagemUrl) && !imagemFalhou

  useEffect(() => {
    setImagemFalhou(false)
  }, [imagemUrl])
  const nome = produto.getNome()
  const preco = transformarParaReal(produto.getValor())

  return (
    <button
      type="button"
      title={nome}
      onClick={() => onSelect(produto.getId())}
      className="group flex w-full min-w-0 cursor-pointer flex-col items-stretch gap-1 rounded-xl bg-transparent p-0.5 text-center transition-transform active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ outlineColor: corHex }}
    >
      <span className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
        {mostrarFoto ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto do snapshot do menu
          <img
            src={imagemUrl ?? undefined}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            onError={() => setImagemFalhou(true)}
          />
        ) : null}
      </span>
      <span className="flex flex-col items-center gap-0.5 px-0.5">
        <span className="line-clamp-2 text-[12px] font-semibold leading-tight text-gray-900">
          {nome}
        </span>
        <span className="text-[13px] font-medium tabular-nums leading-none text-gray-700">
          {preco}
        </span>
      </span>
    </button>
  )
}
