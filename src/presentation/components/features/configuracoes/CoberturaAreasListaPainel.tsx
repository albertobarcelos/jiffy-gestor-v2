'use client'

import { MdDeleteOutline } from 'react-icons/md'
import type { AreaEntregaDTO } from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import { CampoPrazoInline } from '@/src/presentation/components/features/configuracoes/CampoPrazoInline'
import { CampoTaxaInline } from '@/src/presentation/components/features/configuracoes/CampoTaxaInline'
import { CoberturaBotaoSalvarTaxasLote } from '@/src/presentation/components/features/configuracoes/CoberturaBotaoSalvarTaxasLote'
import { NomeAreaInline } from '@/src/presentation/components/features/configuracoes/NomeAreaInline'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import type { DestaqueCobertura } from '@/src/shared/utils/coberturaMapaDestaque'

export type CoberturaAreasListaPainelProps = {
  areas: AreaEntregaDTO[]
  carregando: boolean
  salvando: boolean
  salvandoLote: boolean
  pendente: boolean
  criacaoPendentes: boolean
  taxasDraft: Record<string, string>
  prazosDraft: Record<string, string>
  ativosDraft: Record<string, boolean>
  areaDestacadaId: string | null
  destacarTodasAreas: boolean
  onTaxaChange: (areaId: string, value: string) => void
  onPrazoChange: (areaId: string, value: string) => void
  onToggleAtivo: (areaId: string, ativo: boolean) => void
  onSalvarNome: (area: AreaEntregaDTO, nome: string) => Promise<void>
  onExcluir: (area: AreaEntregaDTO) => void
  onSalvarLote: () => void
  onDestacar: (destaque: DestaqueCobertura | null) => void
}

export function CoberturaAreasListaPainel({
  areas,
  carregando,
  salvando,
  salvandoLote,
  pendente,
  criacaoPendentes,
  taxasDraft,
  prazosDraft,
  ativosDraft,
  areaDestacadaId,
  destacarTodasAreas,
  onTaxaChange,
  onPrazoChange,
  onToggleAtivo,
  onSalvarNome,
  onExcluir,
  onSalvarLote,
  onDestacar,
}: CoberturaAreasListaPainelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="px-4 pt-2 text-[11px] leading-snug text-secondary-text">
        Cada área tem nome, taxa e prazo próprios. Clique no nome para editar. Desenhe ou mova no
        mapa com os atalhos à direita.
      </p>
      <div className="grid grid-cols-[minmax(3.2rem,0.9fr)_minmax(3.1rem,1fr)_minmax(2.6rem,0.8fr)_1.4rem_auto] items-center gap-1 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
        <span>Nome</span>
        <span>Taxa</span>
        <span>Prazo</span>
        <span className="sr-only">Ativo</span>
        <span className="text-right">Ações</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto border-t border-gray-100">
        {carregando ? (
          <div className="flex justify-center p-6">
            <JiffyLoading />
          </div>
        ) : (
          <>
            {areas.length === 0 ? (
              <p className="p-4 text-center text-xs text-secondary-text">
                Nenhuma área salva. Use o polígono ou o círculo à direita. A área pode ficar fora do
                raio e tem nome e taxa próprios.
              </p>
            ) : (
              <div>
                {areas.map(area => (
                  <div
                    key={area.id}
                    className={`grid grid-cols-[minmax(3.2rem,0.9fr)_minmax(3.1rem,1fr)_minmax(2.6rem,0.8fr)_1.4rem_auto] items-center gap-1 px-3 py-2 text-sm ${
                      destacarTodasAreas || areaDestacadaId === area.id
                        ? 'bg-gray-100'
                        : 'hover:bg-gray-100'
                    }`}
                    onMouseEnter={() => onDestacar({ tipo: 'area', id: area.id })}
                    onMouseLeave={() => onDestacar(null)}
                  >
                    <NomeAreaInline
                      area={area}
                      salvando={salvando}
                      onSalvar={nome => onSalvarNome(area, nome)}
                    />
                    <CampoTaxaInline
                      label={`Taxa ${area.nome?.trim() || area.id}`}
                      value={taxasDraft[area.id] ?? ''}
                      disabled={salvando}
                      onChange={value => onTaxaChange(area.id, value)}
                    />
                    <CampoPrazoInline
                      label={`Prazo ${area.nome?.trim() || area.id}`}
                      value={prazosDraft[area.id] ?? ''}
                      disabled={salvando}
                      onChange={value => onPrazoChange(area.id, value)}
                    />
                    <JiffyIconSwitch
                      checked={ativosDraft[area.id] ?? area.ativo}
                      onChange={e => onToggleAtivo(area.id, e.target.checked)}
                      disabled={salvando}
                      size="xs"
                      inputProps={{
                        'aria-label': `Ativar área ${area.nome ?? area.id}`,
                      }}
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => onExcluir(area)}
                        disabled={salvando}
                        className="rounded-lg p-1.5 text-secondary-text hover:bg-red-50 hover:text-red-600"
                        aria-label="Excluir área"
                        title="Excluir área"
                      >
                        <MdDeleteOutline className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="shrink-0 space-y-2 border-t border-gray-100 px-3 py-2">
        <CoberturaBotaoSalvarTaxasLote
          pendente={pendente}
          disabled={salvando || !pendente || (areas.length === 0 && !criacaoPendentes)}
          salvando={salvandoLote}
          onClick={onSalvarLote}
        />
      </div>
    </div>
  )
}
