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
  grupoComplementosIds: string[]
  onGrupoComplementosIdsChange: (value: string[]) => void
  impressorasIds: string[]
  onImpressorasIdsChange: (value: string[]) => void
  ativo: boolean
  onAtivoChange: (value: boolean) => void
  isEditMode: boolean
  onBack: () => void
  onSave: () => void
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
  grupoComplementosIds,
  onGrupoComplementosIdsChange,
  impressorasIds,
  onImpressorasIdsChange,
  ativo,
  onAtivoChange,
  isEditMode,
  onBack,
  onSave,
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
            }
          )

          if (response.ok) {
            const data = await response.json()
            const items = data.items || []
            allItems = [...allItems, ...items]

            hasMore = data.hasNext && allItems.length < (data.count || 0)
            offset += items.length
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
          const response = await fetch(
            `/api/impressoras?limit=${limit}&offset=${offset}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )

          if (response.ok) {
            const data = await response.json()
            const items = data.items || []
            allItems = [...allItems, ...items]

            hasMore = data.hasNext && allItems.length < (data.count || 0)
            offset += items.length
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
    return allComplementos.filter((item) =>
      (item.nome || '').toLowerCase().includes(term)
    )
  }, [allComplementos, complementoSearch])

  const filteredImpressoras = useMemo(() => {
    const term = impressoraSearch.trim().toLowerCase()
    if (!term) return allImpressoras
    return allImpressoras.filter((item) =>
      (item.nome || '').toLowerCase().includes(term)
    )
  }, [allImpressoras, impressoraSearch])

  const selectedComplementos = useMemo(() => {
    return grupoComplementosIds
      .map((id) => allComplementos.find((item) => item.id === id))
      .filter((item): item is any => Boolean(item))
  }, [grupoComplementosIds, allComplementos])

  const selectedImpressoras = useMemo(() => {
    return impressorasIds
      .map((id) => allImpressoras.find((item) => item.id === id))
      .filter((item): item is any => Boolean(item))
  }, [impressorasIds, allImpressoras])

  const toggleComplementoSelection = (id: string) => {
    setTempComplementosSelection((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleImpressoraSelection = (id: string) => {
    setTempImpressorasSelection((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
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
    onGrupoComplementosIdsChange(grupoComplementosIds.filter((item) => item !== id))
  }

  const handleRemoveImpressoraChip = (id: string) => {
    onImpressorasIdsChange(impressorasIds.filter((item) => item !== id))
  }

  useEffect(() => {
    if (!abreComplementos && grupoComplementosIds.length) {
      onGrupoComplementosIdsChange([])
    }
  }, [abreComplementos, grupoComplementosIds, onGrupoComplementosIdsChange])

  return (
    <>
      <div className="rounded-[24px] border border-[#E5E7F2] bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
        {/* Título */}
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-[#4F1D8C] text-xl font-semibold font-exo">
              Configurações Gerais
            </h3>
            <div className="flex-1 h-px bg-[#CBA4FF]/60" />
          </div>
          <p className="text-sm text-secondary-text font-nunito">
            Ajuste como o produto se comporta no PDV, habilite complementos e defina as impressoras responsáveis.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          {/* Cartão Geral */}
          <div className="col-span-full xl:col-span-1 rounded-[24px] border border-[#E6E9F4] bg-gradient-to-b from-[#F9FAFF] to-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] p-5">
            <h4 className="text-primary-text font-semibold font-exo text-base mb-4">
              Geral
            </h4>
            <div className="space-y-5">
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
                  label: 'Abre Complementos',
                  checked: abreComplementos,
                  onChange: onAbreComplementosChange,
                },
              ].map((toggle) => (
                <button
                  key={toggle.label}
                  type="button"
                  onClick={() => toggle.onChange(!toggle.checked)}
                  className="w-full flex items-center justify-between gap-4 rounded-2xl border border-transparent bg-white px-4 py-3 text-left transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <span className="text-primary-text font-nunito text-sm">
                    {toggle.label}
                  </span>
                  <span
                    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                      toggle.checked ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        toggle.checked ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </span>
                </button>
              ))}

              {isEditMode && (
                <button
                  type="button"
                  onClick={() => onAtivoChange(!ativo)}
                  className="w-full flex items-center justify-between gap-4 rounded-2xl border border-transparent bg-white px-4 py-3 text-left transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <span className="text-primary-text font-nunito text-sm">
                    Ativo
                  </span>
                  <span
                    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                      ativo ? 'bg-[#11B981]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        ativo ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Cartão de Grupos */}
          <div className="col-span-full xl:col-span-1 rounded-[24px] border border-[#E6E9F4] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] p-5">
            <div className="flex flex-col gap-2 mb-4">
              <p className="text-primary-text font-semibold font-exo text-base">
                Grupos de Complementos
              </p>
              <p className="text-xs text-secondary-text font-nunito">
                Selecione os grupos que aparecem quando o produto é vendido.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenComplementosDialog}
              disabled={isLoadingComplementos || !abreComplementos}
              className="w-full h-11 rounded-[18px] bg-[#0A397A] text-white font-semibold font-nunito text-sm flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(10,57,122,0.35)] transition-all hover:bg-[#0b458f] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <MdAdd size={18} />
              Grupos de Complementos
            </button>
            {!abreComplementos && (
              <p className="text-xs text-secondary-text mt-3">
                Ative a opção “Abre Complementos” na seção Geral para vincular os grupos.
              </p>
            )}
            {grupoComplementosIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedComplementos.map((grupo) => (
                  <span
                    key={grupo.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold"
                  >
                    {grupo.nome || 'Grupo'}
                    <button
                      type="button"
                      onClick={() => handleRemoveComplementoChip(grupo.id)}
                      className="text-primary hover:text-primary/70 transition-colors"
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
          <div className="col-span-full xl:col-span-1 rounded-[24px] border border-[#E6E9F4] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] p-5">
            <div className="flex flex-col gap-2 mb-4">
              <p className="text-primary-text font-semibold font-exo text-base">
                Impressoras
              </p>
              <p className="text-xs text-secondary-text font-nunito">
                Escolha em quais impressoras o pedido deve ser enviado.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenImpressorasDialog}
              disabled={isLoadingImpressoras}
              className="w-full h-11 rounded-[18px] bg-[#0A397A] text-white font-semibold font-nunito text-sm flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(10,57,122,0.35)] transition-all hover:bg-[#0b458f] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <MdPrint size={18} />
              Selecionar Impressoras
            </button>
            {impressorasIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedImpressoras.map((impressora) => (
                  <span
                    key={impressora.id}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary-bg text-secondary-text px-3 py-1 text-xs font-semibold"
                  >
                    {impressora.nome || 'Impressora'}
                    <button
                      type="button"
                      onClick={() => handleRemoveImpressoraChip(impressora.id)}
                      className="text-secondary-text hover:text-secondary-text/70 transition-colors"
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
        <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Button
            onClick={onBack}
            className="h-11 px-8 rounded-[30px] bg-[#CFD5E8] text-[#0A397A] font-semibold font-exo text-sm hover:bg-[#bac2da]"
          >
            Voltar
          </Button>
          <Button
            onClick={onSave}
            className="h-11 px-10 rounded-[30px] bg-[#0A397A] text-white font-semibold font-exo text-sm hover:bg-[#0c448f]"
          >
            Salvar
          </Button>
        </div>
      </div>
      {/* Dialog de grupos de complementos */}
      <Dialog
        open={isComplementosDialogOpen}
        onOpenChange={(openState) => {
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
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" size={18} />
            <input
              type="text"
              value={complementoSearch}
              onChange={(event) => setComplementoSearch(event.target.value)}
              placeholder="Buscar grupo..."
              className="w-full h-11 pl-10 pr-4 rounded-[24px] border border-gray-200 bg-white text-sm font-nunito focus:outline-none focus:border-primary"
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {isLoadingComplementos ? (
              <p className="text-center text-secondary-text text-sm py-6">Carregando grupos...</p>
            ) : filteredComplementos.length ? (
              filteredComplementos.map((grupo) => {
                const isSelected = tempComplementosSelection.includes(grupo.id)
                return (
                  <label
                    key={grupo.id}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-colors ${
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
                        <span className="inline-flex text-[10px] uppercase tracking-wide text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full mt-1">
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
              <p className="text-center text-secondary-text text-sm py-6">
                Nenhum grupo encontrado.
              </p>
            )}
          </div>
        </DialogContent>
        <DialogFooter sx={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={handleCancelComplementos}
            className="h-10 px-5 rounded-[24px] border border-gray-300 text-sm font-semibold text-primary-text hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmComplementos}
            className="h-10 px-6 rounded-[24px] bg-primary text-info text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Aplicar seleção
          </button>
        </DialogFooter>
      </Dialog>

      {/* Dialog de impressoras */}
      <Dialog
        open={isImpressorasDialogOpen}
        onOpenChange={(openState) => {
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
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" size={18} />
            <input
              type="text"
              value={impressoraSearch}
              onChange={(event) => setImpressoraSearch(event.target.value)}
              placeholder="Buscar impressora..."
              className="w-full h-11 pl-10 pr-4 rounded-[24px] border border-gray-200 bg-white text-sm font-nunito focus:outline-none focus:border-primary"
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {isLoadingImpressoras ? (
              <p className="text-center text-secondary-text text-sm py-6">Carregando impressoras...</p>
            ) : filteredImpressoras.length ? (
              filteredImpressoras.map((impressora) => {
                const isSelected = tempImpressorasSelection.includes(impressora.id)
                return (
                  <label
                    key={impressora.id}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-colors ${
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
              <p className="text-center text-secondary-text text-sm py-6">
                Nenhuma impressora encontrada.
              </p>
            )}
          </div>
        </DialogContent>
        <DialogFooter sx={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={handleCancelImpressoras}
            className="h-10 px-5 rounded-[24px] border border-gray-300 text-sm font-semibold text-primary-text hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmImpressoras}
            className="h-10 px-6 rounded-[24px] bg-primary text-info text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Aplicar seleção
          </button>
        </DialogFooter>
      </Dialog>
    </>
  )
}

