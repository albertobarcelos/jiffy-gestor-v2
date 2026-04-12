'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/src/presentation/components/ui/button'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdSearch } from 'react-icons/md'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'

interface ConfiguracoesGeraisStepProps {
  favorito: boolean
  onFavoritoChange: (value: boolean) => void
  permiteDesconto: boolean
  onPermiteDescontoChange: (value: boolean) => void
  permiteAcrescimo: boolean
  onPermiteAcrescimoChange: (value: boolean) => void
  abreComplementos: boolean
  onAbreComplementosChange: (value: boolean) => void
  /** API: `permiteAlterarPreco` */
  permiteAlterarPreco: boolean
  onPermiteAlterarPrecoChange: (value: boolean) => void
  /** API: `incideTaxa` */
  incideTaxa: boolean
  onIncideTaxaChange: (value: boolean) => void
  grupoComplementosIds: string[]
  onGrupoComplementosIdsChange: (value: string[]) => void
  impressorasIds: string[]
  onImpressorasIdsChange: (value: string[]) => void
  ativo: boolean
  onAtivoChange: (value: boolean) => void
  isEditMode: boolean
  canManageAtivo?: boolean
  onBack: () => void
  onSave: () => void
  /** Salva o produto (dados gerais + config.) e encerra, sem ir ao passo fiscal */
  onSaveAndClose: () => void
  saveButtonText?: string
  /** Quando true, botões ficam no rodapé do painel lateral */
  hideStepFooter?: boolean
}

/** Vinculados primeiro; dentro de cada bloco, ordem alfabética por nome */
function ordenarVinculadosPrimeiro<T extends { id: string; nome?: string }>(
  itens: T[],
  idsVinculados: string[]
): T[] {
  const set = new Set(idsVinculados)
  return [...itens].sort((a, b) => {
    const va = set.has(a.id) ? 1 : 0
    const vb = set.has(b.id) ? 1 : 0
    if (va !== vb) return vb - va
    return (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
  })
}

/** Página ao listar grupos de complementos e impressoras (API `limit` / `offset`) */
const LISTAGEM_PAGE_SIZE = 25

/**
 * Step 2: Configurações Gerais
 * Replica exatamente o design do Flutter ConfiguracoesGeraisStepWidget
 */
export function ConfiguracoesGeraisStep({
  favorito,
  onFavoritoChange,
  permiteDesconto,
  onPermiteDescontoChange,
  permiteAcrescimo,
  onPermiteAcrescimoChange,
  abreComplementos,
  onAbreComplementosChange,
  permiteAlterarPreco,
  onPermiteAlterarPrecoChange,
  incideTaxa,
  onIncideTaxaChange,
  grupoComplementosIds,
  onGrupoComplementosIdsChange,
  impressorasIds,
  onImpressorasIdsChange,
  ativo,
  onAtivoChange,
  isEditMode: _isEditMode,
  canManageAtivo = false,
  onBack,
  onSave,
  onSaveAndClose,
  saveButtonText = 'Salvar',
  hideStepFooter = false,
}: ConfiguracoesGeraisStepProps) {
  const { auth } = useAuthStore()
  const [allComplementos, setAllComplementos] = useState<any[]>([])
  const [allImpressoras, setAllImpressoras] = useState<any[]>([])
  const [isLoadingComplementos, setIsLoadingComplementos] = useState(false)
  const [isLoadingImpressoras, setIsLoadingImpressoras] = useState(false)
  const [grupoComplementoSearch, setGrupoComplementoSearch] = useState('')
  const [impressoraSearch, setImpressoraSearch] = useState('')

  // Carregar grupos de complementos
  useEffect(() => {
    const loadComplementos = async () => {
      setIsLoadingComplementos(true)
      try {
        const token = auth?.getAccessToken()
        if (!token) return

        let allItems: any[] = []
        let offset = 0
        const limit = LISTAGEM_PAGE_SIZE
        let hasMore = true

        while (hasMore) {
          const response = await fetch(
            `/api/grupos-complementos?ativo=true&limit=${limit}&offset=${offset}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              cache: 'no-store',
            }
          )

          if (response.ok) {
            const data = await response.json()
            const items = data.items || []
            allItems = [...allItems, ...items]

            const fetchedCount = items.length
            const totalCount = data.count ?? allItems.length
            offset += fetchedCount

            const apiHasNext =
              typeof data.hasNext === 'boolean'
                ? data.hasNext
                : fetchedCount === limit && allItems.length < totalCount

            hasMore = apiHasNext
          } else {
            hasMore = false
          }
        }

        setAllComplementos(allItems)
      } catch (error) {
        console.error('Erro ao carregar complementos:', error)
      } finally {
        setIsLoadingComplementos(false)
      }
    }

    loadComplementos()
  }, [auth])

  // Carregar impressoras
  useEffect(() => {
    const loadImpressoras = async () => {
      setIsLoadingImpressoras(true)
      try {
        const token = auth?.getAccessToken()
        if (!token) return

        let allItems: any[] = []
        let offset = 0
        const limit = LISTAGEM_PAGE_SIZE
        let hasMore = true

        while (hasMore) {
          const response = await fetch(`/api/impressoras?limit=${limit}&offset=${offset}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
          })

          if (response.ok) {
            const data = await response.json()
            const items = data.items || []
            allItems = [...allItems, ...items]

            const fetchedCount = items.length
            const totalCount = data.count ?? allItems.length
            offset += fetchedCount

            const apiHasNext =
              typeof data.hasNext === 'boolean'
                ? data.hasNext
                : fetchedCount === limit && allItems.length < totalCount

            hasMore = apiHasNext
          } else {
            hasMore = false
          }
        }

        setAllImpressoras(allItems)
      } catch (error) {
        console.error('Erro ao carregar impressoras:', error)
      } finally {
        setIsLoadingImpressoras(false)
      }
    }

    loadImpressoras()
  }, [auth])

  const gruposParaLista = useMemo(() => {
    const term = grupoComplementoSearch.trim().toLowerCase()
    const filtrados =
      !term ?
        allComplementos
      : allComplementos.filter(item => (item.nome || '').toLowerCase().includes(term))
    return ordenarVinculadosPrimeiro(filtrados, grupoComplementosIds)
  }, [allComplementos, grupoComplementoSearch, grupoComplementosIds])

  const impressorasParaLista = useMemo(() => {
    const term = impressoraSearch.trim().toLowerCase()
    const filtrados =
      !term ?
        allImpressoras
      : allImpressoras.filter(
          item =>
            (item.nome || '').toLowerCase().includes(term) ||
            (item.local || '').toLowerCase().includes(term)
        )
    return ordenarVinculadosPrimeiro(filtrados, impressorasIds)
  }, [allImpressoras, impressoraSearch, impressorasIds])

  /** Liga/desliga o vínculo do produto com o grupo (sem modal) */
  const toggleGrupoVinculado = (id: string) => {
    if (grupoComplementosIds.includes(id)) {
      onGrupoComplementosIdsChange(grupoComplementosIds.filter(g => g !== id))
    } else {
      onGrupoComplementosIdsChange([...grupoComplementosIds, id])
    }
  }

  /** Liga/desliga o vínculo do produto com a impressora (sem modal) */
  const toggleImpressoraVinculada = (id: string) => {
    if (impressorasIds.includes(id)) {
      onImpressorasIdsChange(impressorasIds.filter(p => p !== id))
    } else {
      onImpressorasIdsChange([...impressorasIds, id])
    }
  }

  // Removido: useEffect que apagava grupos quando abreComplementos era desativado
  // Agora os grupos são preservados mesmo quando abreComplementos está desativado

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col rounded-[10px] bg-info p-2 md:p-4">
          {/* Título — mesmo padrão de Informações / NovoComplemento */}
          <div className="mb-4 flex shrink-0 flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-exo text-xl font-semibold text-primary">Configurações Gerais</h2>
              <div className="h-px flex-1 bg-primary/70" />
            </div>
            <p className="font-nunito text-sm text-secondary-text">
              Ajuste como o produto se comporta no PDV, habilite complementos e defina as impressoras
              responsáveis.
            </p>
          </div>

          {/* Grade: mesma altura nos 3 cards (xl), expande até o espaço útil da área de scroll */}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-3 xl:items-stretch xl:gap-3">
          {/* Cartão Geral — padding compacto + JiffyIconSwitch (mesmo padrão de outras telas) */}
          <div className="col-span-full flex min-h-0 flex-col rounded-lg border border-[#E6E9F4] bg-gradient-to-b from-[#F9FAFF] to-white px-2 py-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] xl:col-span-1 xl:h-full">
            <h4 className="mb-2 shrink-0 font-exo text-sm font-semibold text-primary-text">Geral</h4>
            <div className="flex min-h-0 flex-1 flex-col gap-2.5">
              {[
                {
                  label: 'Favorito',
                  checked: favorito,
                  onChange: onFavoritoChange,
                },
                {
                  label: 'Permite Desconto',
                  checked: permiteDesconto,
                  onChange: onPermiteDescontoChange,
                },
                {
                  label: 'Permite Acréscimo',
                  checked: permiteAcrescimo,
                  onChange: onPermiteAcrescimoChange,
                },
                {
                  label: 'Permitir Alterar Preço',
                  checked: permiteAlterarPreco,
                  onChange: onPermiteAlterarPrecoChange,
                },
                {
                  label: 'Incide Taxa',
                  checked: incideTaxa,
                  onChange: onIncideTaxaChange,
                },
                {
                  label: 'Abre Complementos',
                  checked: abreComplementos,
                  onChange: onAbreComplementosChange,
                },
              ].map(toggle => (
                <JiffyIconSwitch
                  key={toggle.label}
                  checked={toggle.checked}
                  onChange={e => toggle.onChange(e.target.checked)}
                  label={
                    <span className="font-nunito text-[11px] font-medium leading-tight text-primary-text">
                      {toggle.label}
                    </span>
                  }
                  labelPosition="start"
                  bordered={false}
                  size="sm"
                  className="w-full justify-between rounded-md bg-white/80 py-0.5 pr-0.5 pl-0"
                  inputProps={{ 'aria-label': toggle.label }}
                />
              ))}

              {canManageAtivo && (
                <JiffyIconSwitch
                  checked={ativo}
                  onChange={e => onAtivoChange(e.target.checked)}
                  label={
                    <span className="font-nunito text-[11px] font-medium leading-tight text-primary-text">
                      Ativo
                    </span>
                  }
                  labelPosition="start"
                  bordered={false}
                  size="sm"
                  className="w-full justify-between rounded-md bg-white/80 py-0.5 pr-0.5 pl-0"
                  inputProps={{ 'aria-label': 'Produto ativo' }}
                />
              )}
              {/* Ocupa o restante da altura do card para alinhar com os outros na grade xl */}
              <div className="min-h-0 flex-1" aria-hidden />
            </div>
          </div>

          {/* Cartão de Grupos — lista completa com switch (vinculado ao produto), sem modal */}
          <div className="col-span-full flex min-h-0 flex-col rounded-lg border border-[#E6E9F4] bg-white p-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)] xl:col-span-1 xl:h-full">
            <div className="mb-2 flex shrink-0 flex-col gap-1.5">
              <p className="font-exo text-sm font-semibold text-primary-text">
                Grupos de Comple.
              </p>
              
            </div>
            <div className="relative mb-2 shrink-0">
              <MdSearch
                className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-secondary-text"
                size={16}
              />
              <input
                type="text"
                value={grupoComplementoSearch}
                onChange={e => setGrupoComplementoSearch(e.target.value)}
                placeholder="Buscar grupo..."
                className="font-nunito h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain rounded-lg border border-gray-100 bg-gray-50/50">
              {isLoadingComplementos ? (
                <p className="py-8 text-center font-nunito text-xs text-secondary-text">
                  Carregando grupos...
                </p>
              ) : gruposParaLista.length ? (
                <ul className="divide-y divide-gray-100">
                  {gruposParaLista.map(grupo => {
                    const vinculado = grupoComplementosIds.includes(grupo.id)
                    return (
                      <li
                        key={grupo.id}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-white/80"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-nunito text-xs font-medium text-primary-text">
                            {grupo.nome || 'Grupo'}
                          </p>
                          {grupo.obrigatorio ? (
                            <span className="mt-0.5 inline-flex rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary">
                              Obrigatório
                            </span>
                          ) : null}
                        </div>
                        <div
                          className="shrink-0"
                          onClick={e => e.stopPropagation()}
                          onMouseDown={e => e.stopPropagation()}
                        >
                          <JiffyIconSwitch
                            checked={vinculado}
                            onChange={e => {
                              e.stopPropagation()
                              toggleGrupoVinculado(grupo.id)
                            }}
                            labelPosition="start"
                            bordered={false}
                            size="xs"
                            className="shrink-0"
                            inputProps={{
                              'aria-label': vinculado
                                ? `Desvincular grupo ${grupo.nome ?? ''}`
                                : `Vincular grupo ${grupo.nome ?? ''}`,
                              onClick: e => e.stopPropagation(),
                            }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="py-8 text-center font-nunito text-xs text-secondary-text">
                  {allComplementos.length === 0
                    ? 'Nenhum grupo de complementos cadastrado.'
                    : 'Nenhum grupo encontrado para a busca.'}
                </p>
              )}
            </div>
          </div>

          {/* Cartão de Impressoras — lista completa com switch, mesmo padrão dos grupos */}
          <div className="col-span-full flex min-h-0 flex-col rounded-lg border border-[#E6E9F4] bg-info p-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)] xl:col-span-1 xl:h-full">
            <div className="mb-2 flex shrink-0 flex-col gap-1.5">
              <p className="font-exo text-sm font-semibold text-primary-text">Impressoras</p>
              
            </div>
            <div className="relative mb-2 shrink-0">
              <MdSearch
                className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-secondary-text"
                size={16}
              />
              <input
                type="text"
                value={impressoraSearch}
                onChange={e => setImpressoraSearch(e.target.value)}
                placeholder="Buscar impressora..."
                className="font-nunito h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain rounded-lg border border-gray-100 bg-gray-50/50">
              {isLoadingImpressoras ? (
                <p className="py-8 text-center font-nunito text-xs text-secondary-text">
                  Carregando impressoras...
                </p>
              ) : impressorasParaLista.length ? (
                <ul className="divide-y divide-gray-100">
                  {impressorasParaLista.map(impressora => {
                    const vinculada = impressorasIds.includes(impressora.id)
                    return (
                      <li
                        key={impressora.id}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-white/80"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-nunito text-xs font-medium text-primary-text">
                            {impressora.nome || 'Impressora'}
                          </p>
                          {impressora.local ? (
                            <p className="truncate font-nunito text-[10px] text-secondary-text">
                              {impressora.local}
                            </p>
                          ) : null}
                        </div>
                        <div
                          className="shrink-0"
                          onClick={e => e.stopPropagation()}
                          onMouseDown={e => e.stopPropagation()}
                        >
                          <JiffyIconSwitch
                            checked={vinculada}
                            onChange={e => {
                              e.stopPropagation()
                              toggleImpressoraVinculada(impressora.id)
                            }}
                            labelPosition="start"
                            bordered={false}
                            size="xs"
                            className="shrink-0"
                            inputProps={{
                              'aria-label': vinculada
                                ? `Desvincular impressora ${impressora.nome ?? ''}`
                                : `Vincular impressora ${impressora.nome ?? ''}`,
                              onClick: e => e.stopPropagation(),
                            }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="py-8 text-center font-nunito text-xs text-secondary-text">
                  {allImpressoras.length === 0
                    ? 'Nenhuma impressora cadastrada.'
                    : 'Nenhuma impressora encontrada para a busca.'}
                </p>
              )}
            </div>
          </div>
          </div>

        {!hideStepFooter ? (
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Button
              onClick={onBack}
              className="h-8 rounded-lg border-2 px-10 font-exo text-sm font-semibold hover:bg-primary/20"
              sx={{
                backgroundColor: 'var(--color-info)',
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                border: '1px solid',
              }}
            >
              Voltar
            </Button>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end md:w-auto">
              <Button
                type="button"
                onClick={onSaveAndClose}
                className="h-8 rounded-lg border-2 px-6 font-exo text-sm font-semibold hover:bg-primary/10 sm:px-8"
                sx={{
                  backgroundColor: 'var(--color-info)',
                  color: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)',
                  border: '1px solid',
                }}
              >
                Salvar e fechar
              </Button>
              <Button
                onClick={onSave}
                className="h-8 rounded-lg px-10 font-exo text-sm font-semibold text-white hover:bg-primary/90"
                sx={{
                  backgroundColor: 'var(--color-primary)',
                }}
              >
                {saveButtonText}
              </Button>
            </div>
          </div>
        ) : null}
        </div>
      </div>
    </>
  )
}
