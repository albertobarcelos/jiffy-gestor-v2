'use client'

import { useEffect, useState } from 'react'
import { MdAttachMoney, MdRestaurant } from 'react-icons/md'
import { CircularProgress } from '@mui/material'
import { DetalhesVendas } from './DetalhesVendas'
import { MesaAbertaCard } from './MesaAbertaCard'
import { TipoVendaIcon } from './TipoVendaIcon'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useMesasAbertas } from '@/src/presentation/hooks/useMesasAbertas'
import { formatCurrencyBrl } from '@/src/presentation/utils/vendas/detalhesVendaExibicao'

export function MesasAbertas() {
  const {
    vendas,
    metricas,
    usuariosPDV,
    apenasSemMovimentacao,
    setFiltroSemMovimentacao,
    isLoading,
    hasLoadedOnce,
    isLoadingMore,
    scrollContainerRef,
    refetch,
  } = useMesasAbertas()

  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null)
  const [detalhesVendaAberta, setDetalhesVendaAberta] = useState(false)
  const [elapsedTimeUpdateTrigger, setElapsedTimeUpdateTrigger] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTimeUpdateTrigger(prev => prev + 1)
    }, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex h-full max-h-[calc(100vh-100px)] flex-col overflow-hidden">
      <div className="bg-primary-background flex h-full min-h-0 flex-col overflow-hidden rounded-b-lg rounded-t-lg md:px-2">
        <div className="flex w-full flex-row items-center justify-between py-1">
          <p className="text-primary px-[30px] text-lg font-semibold">Todas as Mesas Abertas</p>
          <div className="flex items-center justify-end gap-2">
            <label className="text-primary-text flex items-center gap-2 text-xs md:text-sm">
              <input
                type="checkbox"
                checked={apenasSemMovimentacao}
                onChange={e => setFiltroSemMovimentacao(e.target.checked)}
                className="h-4 w-4"
              />
              Mostrar mesas com +15 min sem movimentação
            </label>
          </div>
        </div>
        <div className="border-primary/70 h-[1px] flex-shrink-0 border-t-2"></div>

        <div className="bg-primary-background sticky top-0 z-10 my-1 flex flex-shrink-0 gap-1 md:gap-2">
          <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border-2 p-1 md:flex-row md:gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full">
              <TipoVendaIcon
                tipoVenda="mesa"
                numeroMesa={vendas.length}
                size={60}
                containerScale={0.9}
                corTexto="var(--color-info)"
              />
            </div>
            <div className="flex flex-1 flex-col items-center justify-between md:items-end">
              <span className="text-secondary-text text-center text-[10px] md:text-end md:text-xs">
                Mesas Abertas
              </span>
              <span className="text-primary text-lg md:text-[22px]">{vendas.length}</span>
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border-2 p-1 md:flex-row md:gap-3">
            <div className="bg-warning flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full">
              <span className="text-info text-xl">
                <MdRestaurant />
              </span>
            </div>
            <div className="flex flex-1 flex-col items-center justify-between md:items-end">
              <span className="text-secondary-text text-center text-[10px] md:text-xs">
                Total de Produtos vendidos
              </span>
              <span className="text-primary text-lg md:text-[22px]">
                {metricas?.countProdutosVendidos || 0}
              </span>
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border-2 p-1 md:flex-row md:gap-3">
            <div className="bg-accent1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full">
              <span className="text-info text-xl">
                <MdAttachMoney />
              </span>
            </div>
            <div className="flex flex-1 flex-col items-center justify-between md:items-end">
              <span className="text-secondary-text text-center text-[10px] md:text-xs">
                Total à faturar
              </span>
              <span className="text-primary text-lg md:text-[22px]">
                {metricas?.totalFaturado
                  ? formatCurrencyBrl(metricas.totalFaturado)
                  : 'R$ 0,00'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-info flex min-h-0 flex-col overflow-hidden rounded-lg">
          <div
            ref={scrollContainerRef}
            className="scrollbar-hide grid h-full grid-cols-2 gap-2 overflow-y-auto overflow-x-hidden px-1 py-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
          >
            {isLoading && vendas.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <JiffyLoading />
              </div>
            )}

            {vendas.length === 0 && !isLoading && hasLoadedOnce && (
              <div className="col-span-full flex items-center justify-center md:py-12">
                <p className="text-secondary-text">Nenhuma mesa em aberto encontrada.</p>
              </div>
            )}

            {vendas.map(venda => {
              void elapsedTimeUpdateTrigger
              const usuarioNome =
                usuariosPDV.find(u => u.id === venda.abertoPorId)?.nome || venda.abertoPorId

              return (
                <MesaAbertaCard
                  key={venda.id}
                  venda={venda}
                  usuarioNome={usuarioNome}
                  onClick={() => {
                    setSelectedVendaId(venda.id)
                    setDetalhesVendaAberta(true)
                  }}
                />
              )
            })}

            {isLoadingMore && (
              <div className="col-span-full flex justify-center py-4">
                <CircularProgress size={24} />
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedVendaId ? (
        <DetalhesVendas
          vendaId={selectedVendaId}
          open={detalhesVendaAberta}
          onClose={() => {
            setDetalhesVendaAberta(false)
            void refetch()
          }}
          onAfterClose={() => setSelectedVendaId(null)}
        />
      ) : null}
    </div>
  )
}
