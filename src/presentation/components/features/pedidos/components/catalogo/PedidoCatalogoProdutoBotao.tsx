'use client'

import { useEffect, useState } from 'react'
import { Produto } from '@/src/domain/entities/Produto'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { resolverLayoutCatalogoProdutoPedido } from './pedidoCatalogoLayout'

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
  const layout = resolverLayoutCatalogoProdutoPedido(imagemUrl, imagemFalhou)

  useEffect(() => {
    setImagemFalhou(false)
  }, [imagemUrl])

  const nome = produto.getNome()
  const preco = transformarParaReal(produto.getValor())

  if (layout === 'foto') {
    return (
      <button
        type="button"
        title={nome}
        data-layout="foto"
        onClick={() => onSelect(produto.getId())}
        className="group flex w-full min-w-0 cursor-pointer flex-col items-stretch gap-1 rounded-xl bg-transparent p-0.5 text-center transition-transform active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ outlineColor: corHex }}
      >
        <span className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element -- foto do snapshot do menu */}
          <img
            src={imagemUrl ?? undefined}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            onError={() => setImagemFalhou(true)}
          />
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

  return (
    <div className="aspect-square w-full min-w-0">
      <button
        type="button"
        title={nome}
        data-layout="quadradinho"
        onClick={() => onSelect(produto.getId())}
        className="flex h-full w-full min-h-0 cursor-pointer flex-col items-center rounded-md border-2 px-1 py-1.5 text-center transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          borderColor: corHex,
          backgroundColor: '#ffffff',
          outlineColor: corHex,
        }}
      >
        <span className="flex min-h-0 w-full flex-1 items-end justify-center pb-0.5">
          <span className="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight text-gray-900">
            {nome}
          </span>
        </span>
        <span className="w-full shrink-0 text-center text-[14px] font-semibold tabular-nums text-gray-900">
          {preco}
        </span>
        <span className="min-h-0 w-full flex-1" aria-hidden="true" />
      </button>
    </div>
  )
}
