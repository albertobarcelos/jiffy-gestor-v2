'use client'

import { normalizeTipoImpactoPreco } from '@/src/shared/utils/normalizeTipoImpactoPreco'
import { formatarValorComplemento } from '@/src/presentation/components/features/delivery-publico/shared/utils/formatPedidoLinhaDisplay'
import { DeliveryQuantidadeStepper } from '../../../shared/components/DeliveryQuantidadeStepper'
import { formatDeliveryCurrency } from '../../../shared/utils/formatDeliveryCurrency'
import type { GrupoComplementoResolvido } from '../../../shared/utils/produtoComplementosUtils'
import { DeliveryProdutoComplementoThumb } from './DeliveryProdutoComplementoThumb'

type DeliveryProdutoComplementosListaProps = {
  grupos: GrupoComplementoResolvido[]
  valorComplementosUnitario: number
  getQuantidadeComplemento: (grupoId: string, complementoId: string) => number
  ajustarQuantidadeComplemento: (
    grupo: GrupoComplementoResolvido,
    complementoId: string,
    delta: number
  ) => void
}

export function DeliveryProdutoComplementosLista({
  grupos,
  valorComplementosUnitario,
  getQuantidadeComplemento,
  ajustarQuantidadeComplemento,
}: DeliveryProdutoComplementosListaProps) {
  if (grupos.length === 0) return null

  return (
    <div className="space-y-4 px-4 pt-4">
      {grupos.map(grupo => (
        <div key={grupo.id}>
          <div
            className="mb-1.5 flex items-baseline justify-between gap-2 rounded-md px-2.5 py-1.5"
            style={{
              backgroundColor: 'var(--delivery-primary-dark)',
              color: 'var(--delivery-btn-text, #ffffff)',
            }}
          >
            <p className="delivery-font-title min-w-0 text-sm font-semibold uppercase tracking-wide">
              {grupo.nome}
              {grupo.obrigatorio ? <span className="ml-1 text-red-400">*</span> : null}
            </p>
            <span className="shrink-0 text-xs font-medium tabular-nums opacity-90">
              Min: {grupo.qtdMinima} - Max: {grupo.qtdMaxima}
            </span>
          </div>
          <div
            className={
              grupo.complementos.length > 1
                ? 'grid grid-cols-1 gap-x-3 gap-y-0 lg:grid-cols-2 lg:gap-y-1'
                : undefined
            }
          >
            {grupo.complementos.map(comp => {
              const qtdComp = getQuantidadeComplemento(grupo.id, comp.id)
              const tipoIp = normalizeTipoImpactoPreco(comp.tipoImpactoPreco)
              const valorTxt = formatarValorComplemento(comp.valor, tipoIp)

              return (
                <div
                  key={comp.id}
                  className="flex min-w-0 items-center justify-between gap-2 py-0.5 lg:py-1.5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <DeliveryProdutoComplementoThumb
                      imagemUrl={comp.imagemUrl}
                      nome={comp.nome}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-medium leading-snug delivery-text-primary"
                        title={comp.nome}
                      >
                        {comp.nome}
                      </p>
                      {comp.descricao?.trim() ? (
                        <p
                          className="mt-0.5 line-clamp-2 text-[11px] leading-snug delivery-text-secondary"
                          title={comp.descricao}
                        >
                          {comp.descricao}
                        </p>
                      ) : null}
                      {valorTxt ? (
                        <p className="mt-0.5 text-xs font-semibold tabular-nums delivery-text-accent sm:text-sm">
                          {valorTxt}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <DeliveryQuantidadeStepper
                    size="sm"
                    value={qtdComp}
                    min={0}
                    disabledDecrease={qtdComp <= 0}
                    decreaseLabel={`Diminuir quantidade de ${comp.nome}`}
                    increaseLabel={`Aumentar quantidade de ${comp.nome}`}
                    onDecrease={() => ajustarQuantidadeComplemento(grupo, comp.id, -1)}
                    onIncrease={() => ajustarQuantidadeComplemento(grupo, comp.id, 1)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <p className="delivery-text-secondary text-right text-sm font-medium">
        Total dos complementos:{' '}
        <span className="delivery-text-accent">
          {formatDeliveryCurrency(valorComplementosUnitario)}
        </span>
      </p>
    </div>
  )
}
