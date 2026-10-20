'use client'

import type { RefObject } from 'react'
import type { CatalogoPublicoProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { GrupoComplementoResolvido } from '../../../shared/utils/produtoComplementosUtils'
import { DeliveryProdutoCabecalho } from './DeliveryProdutoCabecalho'
import { DeliveryProdutoComplementosLista } from './DeliveryProdutoComplementosLista'
import { DeliveryProdutoFooter } from './DeliveryProdutoFooter'
import { DeliveryProdutoObservacao } from './DeliveryProdutoObservacao'
import { DeliveryProdutoPainelHeader } from './DeliveryProdutoPainelHeader'

type DeliveryProdutoPainelAmploProps = {
  produto: CatalogoPublicoProdutoDTO
  precisaComplementos: boolean
  carregandoOpcoes: boolean
  grupos: GrupoComplementoResolvido[]
  valorComplementosUnitario: number
  getQuantidadeComplemento: (grupoId: string, complementoId: string) => number
  ajustarQuantidadeComplemento: (
    grupo: GrupoComplementoResolvido,
    complementoId: string,
    delta: number
  ) => void
  scrollRef: RefObject<HTMLDivElement | null>
  bannerComplementosRef: RefObject<HTMLDivElement | null>
  observacao: string
  onObservacaoChange: (value: string) => void
  quantidade: number
  onQuantidadeChange: (value: number) => void
  valorTotal: number
  salvando: boolean
  isEdicao: boolean
  disabledSalvar: boolean
  onSalvar: () => void
  onClose: () => void
  onIrParaComplementos: () => void
  onCompartilhar: () => void
}

function BannerMelhoreProduto({ nome }: { nome: string }) {
  return (
    <div className="px-4 py-3" style={{ backgroundColor: 'var(--delivery-surface-muted)' }}>
      <p className="delivery-font-title text-sm font-bold delivery-text-primary">
        Melhore ainda mais seu {nome}!
      </p>
      <p className="delivery-text-secondary mt-0.5 text-sm">escolha os complementos abaixo.</p>
    </div>
  )
}

export function DeliveryProdutoPainelAmplo({
  produto,
  precisaComplementos,
  carregandoOpcoes,
  grupos,
  valorComplementosUnitario,
  getQuantidadeComplemento,
  ajustarQuantidadeComplemento,
  scrollRef,
  bannerComplementosRef,
  observacao,
  onObservacaoChange,
  quantidade,
  onQuantidadeChange,
  valorTotal,
  salvando,
  isEdicao,
  disabledSalvar,
  onSalvar,
  onClose,
  onIrParaComplementos,
  onCompartilhar,
}: DeliveryProdutoPainelAmploProps) {
  const lista = (
    <DeliveryProdutoComplementosLista
      grupos={grupos}
      valorComplementosUnitario={valorComplementosUnitario}
      getQuantidadeComplemento={getQuantidadeComplemento}
      ajustarQuantidadeComplemento={ajustarQuantidadeComplemento}
    />
  )

  const carregando = carregandoOpcoes ? (
    <p className="delivery-text-secondary px-4 pt-4 text-sm">Carregando opções...</p>
  ) : null

  const cabecalho = (
    <DeliveryProdutoCabecalho
      produto={produto}
      precisaComplementos={precisaComplementos}
      onIrParaComplementos={onIrParaComplementos}
      onCompartilhar={onCompartilhar}
    />
  )

  const footer = (
    <DeliveryProdutoFooter
      quantidade={quantidade}
      onQuantidadeChange={onQuantidadeChange}
      valorTotal={valorTotal}
      salvando={salvando}
      isEdicao={isEdicao}
      disabledSalvar={disabledSalvar}
      onSalvar={onSalvar}
    />
  )

  return (
    <>
      {/* Desktop: complementos à esquerda + produto à direita */}
      <div className="hidden min-h-0 flex-1 lg:flex">
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col border-r"
          style={{ borderColor: 'var(--delivery-border)' }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y">
            <BannerMelhoreProduto nome={produto.nome} />
            {carregando}
            {lista}
            <div className="h-4" />
          </div>
        </div>

        <div className="flex w-[min(100%,24rem)] shrink-0 flex-col">
          <DeliveryProdutoPainelHeader onClose={onClose} />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y">
            {cabecalho}
            <DeliveryProdutoObservacao value={observacao} onChange={onObservacaoChange} />
          </div>
          {footer}
        </div>
      </div>

      {/* Mobile: coluna única */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <DeliveryProdutoPainelHeader onClose={onClose} />

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y max-sm:scrollbar-hide"
        >
          <div className="flex flex-col">
            <div className="flex flex-col">{cabecalho}</div>

            <div ref={bannerComplementosRef} className="sticky top-0 z-10">
              <BannerMelhoreProduto nome={produto.nome} />
            </div>

            {carregando}
            {lista}
            <DeliveryProdutoObservacao value={observacao} onChange={onObservacaoChange} />
          </div>
        </div>

        {footer}
      </div>
    </>
  )
}
