'use client'

import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { useNovoPedidoFormContext } from '../context/NovoPedidoFormContext'

export function PedidoProdutosCategoriasColuna() {
  const {
    buscaProdutoTexto,
    grupoSelecionadoId,
    grupos,
    isLoadingGruposVenda,
    setGrupoSelecionadoId,
  } = useNovoPedidoFormContext()

  const emBusca = buscaProdutoTexto.length >= 2

  return (
    <nav
      className="flex w-[100px] shrink-0 flex-col overflow-hidden rounded-lg border bg-gray-50"
      aria-label="Categorias de produtos"
    >
      <div className="shrink-0 border-b border-gray-200 px-2 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
          Categorias
        </span>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-1">
        {isLoadingGruposVenda ? (
          <div className="flex justify-center py-4">
            <JiffyLoading />
          </div>
        ) : grupos.length === 0 ? (
          <p className="px-1 py-4 text-center text-[10px] text-gray-500">Nenhum grupo</p>
        ) : (
          <div className="flex flex-col gap-1">
            {grupos.map((grupo: { getId: () => string; getCorHex: () => string; getIconName: () => string; getNome: () => string }) => {
              const corHex = grupo.getCorHex()
              const iconName = grupo.getIconName()
              const isSelected = !emBusca && grupoSelecionadoId === grupo.getId()

              return (
                <button
                  key={grupo.getId()}
                  type="button"
                  onClick={() => setGrupoSelecionadoId(grupo.getId())}
                  className="flex flex-col items-center justify-center rounded-lg border-2 p-1.5 pt-2 text-center transition-all active:scale-95 hover:opacity-90"
                  style={{
                    borderColor: corHex,
                    backgroundColor: isSelected ? corHex : `${corHex}15`,
                    color: isSelected ? '#ffffff' : '#1f2937',
                  }}
                  aria-pressed={isSelected}
                  aria-label={`Categoria ${grupo.getNome()}`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                    <DinamicIcon
                      iconName={iconName}
                      color={isSelected ? '#ffffff' : corHex}
                      size={28}
                    />
                  </div>
                  <span
                    className={`mt-1 line-clamp-2 w-full text-[9px] font-medium leading-tight ${
                      isSelected ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {grupo.getNome()}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </nav>
  )
}
