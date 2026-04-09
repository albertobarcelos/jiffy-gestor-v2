'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/src/presentation/components/ui/button'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import { MdAdd, MdClose, MdPrint, MdSearch } from 'react-icons/md'

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
}

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
}: ConfiguracoesGeraisStepProps) {
  const { auth } = useAuthStore()
  const [allComplementos, setAllComplementos] = useState<any[]>([])
  const [allImpressoras, setAllImpressoras] = useState<any[]>([])
  const [isLoadingComplementos, setIsLoadingComplementos] = useState(false)
  const [isLoadingImpressoras, setIsLoadingImpressoras] = useState(false)
  const [isComplementosDialogOpen, setIsComplementosDialogOpen] = useState(false)
  const [isImpressorasDialogOpen, setIsImpressorasDialogOpen] = useState(false)
  const [tempComplementosSelection, setTempComplementosSelection] = useState<string[]>([])
  const [tempImpressorasSelection, setTempImpressorasSelection] = useState<string[]>([])
  const [complementoSearch, setComplementoSearch] = useState('')
  const [impressoraSearch, setImpressoraSearch] = useState('')

  useEffect(() => {
    setTempComplementosSelection(grupoComplementosIds)
  }, [grupoComplementosIds])

  useEffect(() => {
    setTempImpressorasSelection(impressorasIds)
  }, [impressorasIds])

  // Carregar grupos de complementos
  useEffect(() => {
    const loadComplementos = async () => {
      setIsLoadingComplementos(true)
      try {
        const token = auth?.getAccessToken()
        if (!token) return

        let allItems: any[] = []
        let offset = 0
        const limit = 10
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
        const limit = 10
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

  const filteredComplementos = useMemo(() => {
    const term = complementoSearch.trim().toLowerCase()
    if (!term) return allComplementos
    return allComplementos.filter(item => (item.nome || '').toLowerCase().includes(term))
  }, [allComplementos, complementoSearch])

  const filteredImpressoras = useMemo(() => {
    const term = impressoraSearch.trim().toLowerCase()
    if (!term) return allImpressoras
    return allImpressoras.filter(item => (item.nome || '').toLowerCase().includes(term))
  }, [allImpressoras, impressoraSearch])

  const selectedComplementos = useMemo(() => {
    return grupoComplementosIds
      .map(id => allComplementos.find(item => item.id === id))
      .filter((item): item is any => Boolean(item))
  }, [grupoComplementosIds, allComplementos])

  const selectedImpressoras = useMemo(() => {
    return impressorasIds
      .map(id => allImpressoras.find(item => item.id === id))
      .filter((item): item is any => Boolean(item))
  }, [impressorasIds, allImpressoras])

  const toggleComplementoSelection = (id: string) => {
    setTempComplementosSelection(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const toggleImpressoraSelection = (id: string) => {
    setTempImpressorasSelection(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleOpenComplementosDialog = () => {
    setComplementoSearch('')
    setTempComplementosSelection(grupoComplementosIds)
    setIsComplementosDialogOpen(true)
  }

  const handleOpenImpressorasDialog = () => {
    setImpressoraSearch('')
    setTempImpressorasSelection(impressorasIds)
    setIsImpressorasDialogOpen(true)
  }

  const handleConfirmComplementos = () => {
    onGrupoComplementosIdsChange(tempComplementosSelection)
    setIsComplementosDialogOpen(false)
  }

  const handleConfirmImpressoras = () => {
    onImpressorasIdsChange(tempImpressorasSelection)
    setIsImpressorasDialogOpen(false)
  }

  const handleCancelComplementos = () => {
    setTempComplementosSelection(grupoComplementosIds)
    setComplementoSearch('')
    setIsComplementosDialogOpen(false)
  }

  const handleCancelImpressoras = () => {
    setTempImpressorasSelection(impressorasIds)
    setImpressoraSearch('')
    setIsImpressorasDialogOpen(false)
  }

  const handleRemoveComplementoChip = (id: string) => {
    onGrupoComplementosIdsChange(grupoComplementosIds.filter(item => item !== id))
  }

  const handleRemoveImpressoraChip = (id: string) => {
    onImpressorasIdsChange(impressorasIds.filter(item => item !== id))
  }

  // Removido: useEffect que apagava grupos quando abreComplementos era desativado
  // Agora os grupos são preservados mesmo quando abreComplementos está desativado

  return (
    <>
      <div className="rounded-lg border border-[#E5E7F2] bg-white p-2 shadow-[0_20px_45px_rgba(15,23,42,0.08)] md:p-4">
        {/* Título */}
        <div className="mb-4 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-exo text-xl font-semibold text-primary">Configurações Gerais</h3>
            <div className="h-px flex-1 bg-primary/60" />
          </div>
          <p className="font-nunito text-sm text-secondary-text">
            Ajuste como o produto se comporta no PDV, habilite complementos e defina as impressoras
            responsáveis.
          </p>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          {/* Cartão Geral */}
          <div className="col-span-full rounded-lg border border-[#E6E9F4] bg-gradient-to-b from-[#F9FAFF] to-white p-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)] xl:col-span-1">
            <h4 className="mb-2 font-exo text-base font-semibold text-primary-text">Geral</h4>
            <div className="space-y-2">
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
                <button
                  key={toggle.label}
                  type="button"
                  onClick={() => toggle.onChange(!toggle.checked)}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-transparent bg-white px-2 py-2 text-left transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <span className="font-nunito text-sm text-primary-text">{toggle.label}</span>
                  <span
                    className={`relative inline-flex h-5 w-12 items-center rounded-full transition-colors ${
                      toggle.checked ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        toggle.checked ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </span>
                </button>
              ))}

              {canManageAtivo && (
                <button
                  type="button"
                  onClick={() => onAtivoChange(!ativo)}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-transparent bg-white px-4 py-2 text-left transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <span className="font-nunito text-sm text-primary-text">Ativo</span>
                  <span
                    className={`relative inline-flex h-5 w-12 items-center rounded-full transition-colors ${
                      ativo ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        ativo ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Cartão de Grupos */}
          <div className="col-span-full rounded-lg border border-[#E6E9F4] bg-white p-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)] xl:col-span-1">
            <div className="mb-1 flex flex-col gap-2">
              <p className="font-exo text-base font-semibold text-primary-text">
                Grupos de Complementos
              </p>
              <p className="font-nunito text-xs text-secondary-text">
                Selecione os grupos que aparecem quando o produto é vendido.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenComplementosDialog}
              disabled={isLoadingComplementos}
              className="font-nunito flex h-8 w-full items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-white shadow-[0_8px_20px_rgba(10,57,122,0.35)] transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MdAdd size={14} />
              Grupos de Complementos
            </button>
            {grupoComplementosIds.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedComplementos.map(grupo => (
                  <span
                    key={grupo.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                  >
                    {grupo.nome || 'Grupo'}
                    <button
                      type="button"
                      onClick={() => handleRemoveComplementoChip(grupo.id)}
                      className="text-primary transition-colors hover:text-primary/70"
                      aria-label={`Remover ${grupo.nome}`}
                    >
                      <MdClose size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Cartão de Impressoras */}
          <div className="col-span-full rounded-lg border border-[#E6E9F4] bg-info p-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)] xl:col-span-1">
            <div className="mb-1 flex flex-col gap-2">
              <p className="font-exo text-base font-semibold text-primary-text">Impressoras</p>
              <p className="font-nunito text-xs text-secondary-text">
                Escolha em quais impressoras o pedido deve ser enviado.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenImpressorasDialog}
              disabled={isLoadingImpressoras}
              className="font-nunito flex h-8 w-full items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-info shadow-[0_8px_20px_rgba(10,57,122,0.35)] transition-all hover:bg-[#0b458f] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MdPrint size={14} />
              Selecionar Impressoras
            </button>
            {impressorasIds.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedImpressoras.map(impressora => (
                  <span
                    key={impressora.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                  >
                    {impressora.nome || 'Impressora'}
                    <button
                      type="button"
                      onClick={() => handleRemoveImpressoraChip(impressora.id)}
                      className="text-secondary-text transition-colors hover:text-secondary-text/70"
                      aria-label={`Remover ${impressora.nome}`}
                    >
                      <MdClose size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Botões de ação */}
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
      </div>
      {/* Dialog de grupos de complementos */}
      <Dialog
        open={isComplementosDialogOpen}
        onOpenChange={openState => {
          if (!openState) {
            handleCancelComplementos()
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogHeader>
          <DialogTitle>Selecionar grupos de complementos</DialogTitle>
        </DialogHeader>
        <DialogContent sx={{ padding: '16px 24px' }}>
          <div className="relative mb-4">
            <MdSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
              size={18}
            />
            <input
              type="text"
              value={complementoSearch}
              onChange={event => setComplementoSearch(event.target.value)}
              placeholder="Buscar grupo..."
              className="font-nunito h-11 w-full rounded-[24px] border border-gray-200 bg-white pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {isLoadingComplementos ? (
              <p className="py-6 text-center text-sm text-secondary-text">Carregando grupos...</p>
            ) : filteredComplementos.length ? (
              filteredComplementos.map(grupo => {
                const isSelected = tempComplementosSelection.includes(grupo.id)
                return (
                  <label
                    key={grupo.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleComplementoSelection(grupo.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-primary-text">{grupo.nome}</p>
                      {grupo.obrigatorio && (
                        <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Obrigatório
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-xs font-semibold text-primary">Selecionado</span>
                    )}
                  </label>
                )
              })
            ) : (
              <p className="py-6 text-center text-sm text-secondary-text">
                Nenhum grupo encontrado.
              </p>
            )}
          </div>
        </DialogContent>
        <DialogFooter sx={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={handleCancelComplementos}
            className="h-10 rounded-[24px] border border-gray-300 px-5 text-sm font-semibold text-primary-text transition-colors hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmComplementos}
            className="h-10 rounded-[24px] bg-primary px-6 text-sm font-semibold text-info transition-colors hover:bg-primary/90"
          >
            Aplicar seleção
          </button>
        </DialogFooter>
      </Dialog>

      {/* Dialog de impressoras */}
      <Dialog
        open={isImpressorasDialogOpen}
        onOpenChange={openState => {
          if (!openState) {
            handleCancelImpressoras()
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogHeader>
          <DialogTitle>Selecionar impressoras</DialogTitle>
        </DialogHeader>
        <DialogContent sx={{ padding: '16px 24px' }}>
          <div className="relative mb-4">
            <MdSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
              size={18}
            />
            <input
              type="text"
              value={impressoraSearch}
              onChange={event => setImpressoraSearch(event.target.value)}
              placeholder="Buscar impressora..."
              className="font-nunito h-11 w-full rounded-[24px] border border-gray-200 bg-white pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {isLoadingImpressoras ? (
              <p className="py-6 text-center text-sm text-secondary-text">
                Carregando impressoras...
              </p>
            ) : filteredImpressoras.length ? (
              filteredImpressoras.map(impressora => {
                const isSelected = tempImpressorasSelection.includes(impressora.id)
                return (
                  <label
                    key={impressora.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleImpressoraSelection(impressora.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-primary-text">{impressora.nome}</p>
                      {impressora.local && (
                        <p className="text-xs text-secondary-text">{impressora.local}</p>
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-xs font-semibold text-primary">Selecionada</span>
                    )}
                  </label>
                )
              })
            ) : (
              <p className="py-6 text-center text-sm text-secondary-text">
                Nenhuma impressora encontrada.
              </p>
            )}
          </div>
        </DialogContent>
        <DialogFooter sx={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={handleCancelImpressoras}
            className="h-10 rounded-[24px] border border-gray-300 px-5 text-sm font-semibold text-primary-text transition-colors hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmImpressoras}
            className="h-10 rounded-[24px] bg-primary px-6 text-sm font-semibold text-info transition-colors hover:bg-primary/90"
          >
            Aplicar seleção
          </button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
