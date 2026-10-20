'use client'

import type { RefObject } from 'react'
import type { CatalogoPublicoProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { DeliveryProdutoCabecalho } from './DeliveryProdutoCabecalho'
import { DeliveryProdutoFooter } from './DeliveryProdutoFooter'
import { DeliveryProdutoObservacao } from './DeliveryProdutoObservacao'
import { DeliveryProdutoPainelHeader } from './DeliveryProdutoPainelHeader'

type DeliveryProdutoPainelEstreitoProps = {
  produto: CatalogoPublicoProdutoDTO
  alturaPrimeiraDobra: number | null
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
  onCompartilhar: () => void
}

export function DeliveryProdutoPainelEstreito({
  produto,
  alturaPrimeiraDobra,
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
  onCompartilhar,
}: DeliveryProdutoPainelEstreitoProps) {
  return (
    <>
      <DeliveryProdutoPainelHeader onClose={onClose} />

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y max-sm:scrollbar-hide"
      >
        <div className="flex flex-col">
          <div
            className="flex flex-col"
            style={
              alturaPrimeiraDobra != null
                ? { minHeight: alturaPrimeiraDobra }
                : { minHeight: '100%' }
            }
          >
            <DeliveryProdutoCabecalho
              produto={produto}
              precisaComplementos={false}
              onIrParaComplementos={() => undefined}
              onCompartilhar={onCompartilhar}
            />
          </div>

          <div
            ref={bannerComplementosRef}
            className="px-4 py-3"
            style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
          >
            <p className="delivery-font-title text-sm font-bold delivery-text-primary">
              Esta é uma ótima escolha!
            </p>
          </div>

          <DeliveryProdutoObservacao value={observacao} onChange={onObservacaoChange} />
        </div>
      </div>

      <DeliveryProdutoFooter
        quantidade={quantidade}
        onQuantidadeChange={onQuantidadeChange}
        valorTotal={valorTotal}
        salvando={salvando}
        isEdicao={isEdicao}
        disabledSalvar={disabledSalvar}
        onSalvar={onSalvar}
      />
    </>
  )
}
