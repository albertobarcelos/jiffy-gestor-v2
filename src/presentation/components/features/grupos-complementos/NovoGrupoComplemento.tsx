'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MdPlaylistAdd } from 'react-icons/md'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { Complemento } from '@/src/domain/entities/Complemento'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { showToast, handleApiError } from '@/src/shared/utils/toast'
import { useComplementos } from '@/src/presentation/hooks/useComplementos'

interface NovoGrupoComplementoProps {
  grupoId?: string
  isEmbedded?: boolean
  onClose?: () => void
  onSaved?: () => void
}

/**
 * Componente para criar/editar grupo de complementos
 * Replica o design e funcionalidades do Flutter
 */
export function NovoGrupoComplemento({
  grupoId,
  isEmbedded = false,
  onClose,
  onSaved,
}: NovoGrupoComplementoProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const isEditing = !!grupoId

  // Estados do formulário
  const [nome, setNome] = useState('')
  const [qtdMinima, setQtdMinima] = useState('0')
  const [qtdMaxima, setQtdMaxima] = useState('0')
  const [ativo, setAtivo] = useState(true)
  const [selectedComplementosIds, setSelectedComplementosIds] = useState<string[]>([])

  // Estados de loading e dados
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingGrupo, setIsLoadingGrupo] = useState(false)
  const [showComplementosModal, setShowComplementosModal] = useState(false)
  const hasLoadedGrupoRef = useRef(false)

  // Carregar lista de complementos disponíveis usando React Query (com cache)
  const {
    data: complementos = [],
    isLoading: isLoadingComplementos,
  } = useComplementos({
    ativo: true,
    limit: 1000,
  })

  // Carregar dados do grupo se estiver editando
  useEffect(() => {
    if (!isEditing || hasLoadedGrupoRef.current) return

    const loadGrupo = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingGrupo(true)
      hasLoadedGrupoRef.current = true

      try {
        const response = await fetch(`/api/grupos-complementos/${grupoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          try {
            const grupo = GrupoComplemento.fromJSON(data)

            setNome(grupo.getNome())
            setQtdMinima(grupo.getQtdMinima().toString())
            setQtdMaxima(grupo.getQtdMaxima().toString())
            setAtivo(grupo.isAtivo())

            const complementosIds =
              grupo.getComplementosIds()?.length
                ? grupo.getComplementosIds()!
                : (grupo.getComplementos() || [])
                    .map((comp: any) => comp?.id?.toString())
                    .filter(Boolean)

            setSelectedComplementosIds(complementosIds)
          } catch (parseError) {
            console.error('Erro ao processar dados do grupo:', parseError)
            showToast.error('Erro ao carregar dados do grupo. Verifique se as quantidades estão corretas.')
          }
        } else {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao carregar grupo de complementos')
        }
      } catch (error) {
        console.error('Erro ao carregar grupo de complementos:', error)
        const errorMessage = handleApiError(error)
        showToast.error(errorMessage)
      } finally {
        setIsLoadingGrupo(false)
      }
    }

    loadGrupo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, grupoId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    const qtdMinimaNum = parseInt(qtdMinima, 10) || 0
    const qtdMaximaNum = parseInt(qtdMaxima, 10) || 0

    if (qtdMinimaNum > qtdMaximaNum) {
      showToast.error('Quantidade mínima não pode ser maior que máxima')
      return
    }

    const toastId = showToast.loading(
      isEditing ? 'Salvando alterações...' : 'Criando grupo de complementos...'
    )

    setIsLoading(true)

    try {
      const body: any = {
        nome,
        qtdMinima: qtdMinimaNum,
        qtdMaxima: qtdMaximaNum,
        ativo,
        complementosIds: selectedComplementosIds,
      }

      const url = isEditing
        ? `/api/grupos-complementos/${grupoId}`
        : '/api/grupos-complementos'
      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao salvar grupo de complementos')
      }

      showToast.successLoading(
        toastId,
        isEditing ? 'Grupo de complementos atualizado com sucesso!' : 'Grupo de complementos criado com sucesso!'
      )

      if (isEmbedded) {
        onSaved?.()
        onClose?.()
      } else {
        setTimeout(() => {
          router.push('/cadastros/grupos-complementos')
        }, 500)
      }
    } catch (error) {
      console.error('Erro ao salvar grupo de complementos:', error)
      const errorMessage = handleApiError(error)
      showToast.errorLoading(toastId, errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (isEmbedded) {
      onClose?.()
    } else {
      router.push('/cadastros/grupos-complementos')
    }
  }

  const toggleComplemento = (complementoId: string) => {
    setSelectedComplementosIds((prev) => {
      if (prev.includes(complementoId)) {
        return prev.filter((id) => id !== complementoId)
      }
      return [...prev, complementoId]
    })
  }

  if (isLoadingGrupo) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const selectedComplementos = (Array.isArray(complementos) ? complementos : []).filter((c: any) =>
    selectedComplementosIds.includes(c.getId())
  )

  return (
    <div className={`flex flex-col ${isEmbedded ? 'h-full' : 'h-full'}`}>
      {!isEmbedded && (
        <div className="sticky top-0 z-10 bg-primary-bg rounded-tl-[30px] shadow-md px-[30px] py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/25 text-primary flex items-center justify-center">
                <span className="text-2xl">👤</span>
              </div>
              <h1 className="text-primary text-lg font-semibold font-exo">
                {isEditing ? 'Editar Grupo de Complementos' : 'Novo Grupo de Complementos'}
              </h1>
            </div>
            
          </div>
        </div>
      )}

      {/* Formulário com scroll */}
      <div
        className={`flex-1 overflow-y-auto ${isEmbedded ? 'px-6 py-6 bg-info' : 'px-[30px] py-[30px]'}`}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações */}
            <div className="bg-info rounded-[12px] p-5">
              <h2 className="text-secondary text-xl font-semibold font-exo mb-4">
                {nome?.trim().length
                  ? `Grupo de Complementos “${nome.trim()}”`
                  : isEditing
                    ? 'Grupo de Complementos “Grupo”'
                    : 'Grupo de Complementos'}
              </h2>
            <div className="h-px bg-alternate mb-4"></div>
            <div className="flex items-center gap-6 justify-end mb-6">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full">
                <label className="text-primary-text font-medium text-sm">Ativo</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-accent1"></div>
                </label>
              </div>
            </div>
            <div className="space-y-4">
              <Input
                label="Nome do Grupo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Digite o nome do grupo de complementos"
                className="bg-info"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade Mínima *
                  </label>
                  <input
                    type="number"
                    value={qtdMinima}
                    onChange={(e) => setQtdMinima(e.target.value)}
                    required
                    min="0"
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-lg border border-gray-400 bg-info text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-2 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade Máxima *
                  </label>
                  <input
                    type="number"
                    value={qtdMaxima}
                    onChange={(e) => setQtdMaxima(e.target.value)}
                    required
                    min="0"
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-lg border border-gray-400 bg-info text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-2 focus:border-primary"
                  />
                </div>
              </div>

              {/* Seleção de Complementos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complementos
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setShowComplementosModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary text-info font-semibold shadow hover:bg-primary/90 transition-colors"
                  >
                    <MdPlaylistAdd className="text-lg" />
                    Escolher complementos
                  </button>
                </div>
                <div className="mt-3 border border-gray-300 rounded-lg px-4 py-3 bg-white text-sm text-primary-text min-h-[52px]">
                  {selectedComplementos.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedComplementos.map((comp: Complemento) => (
                        <span
                          key={comp.getId()}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold"
                        >
                          {comp.getNome()}
                          <button
                            type="button"
                            onClick={() => toggleComplemento(comp.getId())}
                            className="text-primary hover:text-primary/70"
                            aria-label={`Remover ${comp.getNome()}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-secondary-text">Nenhum complemento selecionado</span>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              onClick={handleCancel}
              variant="outlined"
              className="px-8"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !nome}
              sx={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-info)',
                '&:hover': {
                  backgroundColor: 'var(--color-primary)',
                  opacity: 0.9,
                },
                '&.Mui-disabled': {
                  backgroundColor: 'var(--color-primary)',
                  opacity: 0.4,
                  color: 'var(--color-info)',
                },
              }}
            >
              {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>

      {/* Modal de seleção de complementos */}
      {showComplementosModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-info rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-primary-text">
                Selecionar Complementos
              </h3>
              <button
                onClick={() => setShowComplementosModal(false)}
                className="text-secondary-text hover:text-primary-text"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoadingComplementos ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {(Array.isArray(complementos) ? complementos : []).map((comp: any) => {
                    const isSelected = selectedComplementosIds.includes(comp.getId())
                    return (
                      <label
                        key={comp.getId()}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/20 border-2 border-primary'
                            : 'bg-primary-bg border-2 border-transparent hover:bg-primary-bg/80'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleComplemento(comp.getId())}
                          className="w-5 h-5 rounded border-gray-400 text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-primary-text">{comp.getNome()}</p>
                          {comp.getDescricao() && (
                            <p className="text-sm text-secondary-text">{comp.getDescricao()}</p>
                          )}
                          {comp.getValor() > 0 && (
                            <p className="text-sm text-secondary-text">
                              R$ {comp.getValor().toFixed(2)}
                            </p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-alternate">
              <Button
                type="button"
                onClick={() => setShowComplementosModal(false)}
                variant="outlined"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

