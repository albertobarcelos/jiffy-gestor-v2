'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { IconPickerModal } from './IconPickerModal'
import { ColorPickerModal } from './ColorPickerModal'
import { ProdutosPorGrupoList } from './ProdutosPorGrupoList'
import { useQueryClient } from '@tanstack/react-query'

interface NovoGrupoProps {
  grupoId?: string
  isEmbedded?: boolean
  onClose?: () => void
  onSaved?: () => void
  initialTab?: number // 0 = Detalhes do Grupo, 1 = Produtos Vinculados
}

/**
 * Componente para criar/editar grupo de produtos
 * Replica o design e lógica do Flutter NovoGrupoTabbedWidget
 */
export function NovoGrupo({ grupoId, isEmbedded = false, onClose, onSaved, initialTab = 0 }: NovoGrupoProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { auth } = useAuthStore()
  const queryClient = useQueryClient() // Obter a instância do queryClient

  const [nome, setNome] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [corHex, setCorHex] = useState('#530CA3')
  const [iconName, setIconName] = useState('')
  const [ativoDelivery, setAtivoDelivery] = useState(false)
  const [ativoLocal, setAtivoLocal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)

  const hasLoadedGrupoRef = useRef(false)
  const loadedGrupoIdRef = useRef<string | null>(null)

  // Determina se está editando ou criando
  const effectiveGrupoId = grupoId || searchParams.get('id') || null
  const isEditMode = !!effectiveGrupoId

  const normalizeColor = useCallback((value: string) => {
    if (!value) return '#CCCCCC'
    let hex = value.trim().replace('#', '')

    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('')
    }

    if (hex.length === 8) {
      hex = hex.slice(2)
    }

    if (hex.length !== 6) {
      return '#CCCCCC'
    }

    return `#${hex.toUpperCase()}`
  }, [])

  const handleColorSelect = useCallback(
    (color: string) => {
      setCorHex(normalizeColor(color))
    },
    [normalizeColor]
  )

  // Atualiza a aba ativa quando initialTab mudar
  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  // Carrega dados do grupo para edição
  useEffect(() => {
    if (!isEditMode || !effectiveGrupoId) return

    const token = auth?.getAccessToken()
    if (!token) return

    // Evita carregar múltiplas vezes o mesmo grupo
    if (
      hasLoadedGrupoRef.current &&
      loadedGrupoIdRef.current === effectiveGrupoId
    ) {
      return
    }

    const loadGrupo = async () => {
      setIsLoadingData(true)
      try {
        const response = await fetch(`/api/grupos-produtos/${effectiveGrupoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Erro ao carregar grupo')
        }

        const data = await response.json()
        const grupo = GrupoProduto.fromJSON(data)

        setNome(grupo.getNome())
        setAtivo(grupo.isAtivo())
        setCorHex(normalizeColor(grupo.getCorHex()))
        setIconName(grupo.getIconName())
        setAtivoDelivery(grupo.isAtivoDelivery())
        setAtivoLocal(grupo.isAtivoLocal())

        hasLoadedGrupoRef.current = true
        loadedGrupoIdRef.current = effectiveGrupoId
      } catch (error) {
        console.error('Erro ao carregar grupo:', error)
        alert('Erro ao carregar dados do grupo')
      } finally {
        setIsLoadingData(false)
      }
    }

    loadGrupo()
  }, [isEditMode, effectiveGrupoId, auth])

  const handleSave = async () => {
    if (!nome.trim()) {
      alert('Nome do grupo é obrigatório')
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      alert('Token não encontrado')
      return
    }

    setIsLoading(true)

    try {
      const url = isEditMode
        ? `/api/grupos-produtos/${effectiveGrupoId}`
        : '/api/grupos-produtos'
      const method = isEditMode ? 'PATCH' : 'POST'

      const body = isEditMode
        ? {
            nome,
            ativo,
            corHex,
            iconName,
            ativoDelivery,
            ativoLocal,
          }
        : {
            nome,
            ativo,
            corHex,
            iconName,
            ativoDelivery,
            ativoLocal,
          }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao salvar grupo')
      }

      // Sucesso - redireciona para a lista
      if (isEmbedded) {
        onSaved?.()
        onClose?.()
      } else {
        router.push('/cadastros/grupos-produtos')
        router.refresh() // Força a revalidação dos dados da rota para recarregar a lista
        queryClient.invalidateQueries({ queryKey: ['grupos-produtos'], exact: false }) // Invalida todas as queries de grupos de produtos
        queryClient.invalidateQueries({ queryKey: ['produtos', 'infinite'] }) // Invalida o cache do React Query para produtos
      }
    } catch (error: any) {
      console.error('Erro ao salvar grupo:', error)
      alert(error.message || 'Erro ao salvar grupo')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (isEmbedded) {
      onClose?.()
    } else {
      router.push('/cadastros/grupos-produtos')
    }
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-screen bg-info">
        <div className="text-center flex flex-col items-center gap-2">
          <img
            src="/images/jiffy-loading.gif"
            alt="Carregando"
            className="w-20 object-contain"
          />
          <p className="text-primary-text font-nunito">Carregando dados do grupo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-info">
      {/* Header */}
      <div className="h-20 bg-info md:px-[35px] px-2 flex items-center justify-between">
        <h1 className="text-primary md:text-xl text-sm font-exo font-semibold">
          {isEditMode ? 'Editar Grupo de Produtos' : 'Novo Grupo de Produtos'}
        </h1>
        <div className="flex px-1 items-center gap-2">
          <button
            onClick={handleCancel}
            className="px-6 h-8 bg-primary-bg text-primary-text rounded-lg font-nunito md:text-sm text-xs hover:bg-primary-bg/80 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 h-8 bg-primary text-info rounded-lg font-nunito md:text-sm text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 bg-primary-bg rounded-tl-lg overflow-y-auto">
        {/* Tabs */}
        <div className="border-b border-primary/20">
          <div className="flex md:px-8 px-2">
            <button
              onClick={() => setActiveTab(0)}
              className={`md:px-6 py-2 font-nunito md:text-sm text-xs transition-colors ${
                activeTab === 0
                  ? 'text-primary border-b-2 border-primary font-semibold'
                  : 'text-secondary-text'
              }`}
            >
              Detalhes do Grupo
            </button>
            <button
              onClick={() => setActiveTab(1)}
              className={`px-6 py-2 font-nunito md:text-sm text-xs transition-colors ${
                activeTab === 1
                  ? 'text-primary border-b-2 border-primary font-semibold'
                  : 'text-secondary-text'
              }`}
            >
              Produtos Vinculados
            </button>
          </div>
        </div>

        {/* Conteúdo das tabs */}
        <div className="p-1">
          {activeTab === 0 && (
            <div className="max-w-4xl">
              {/* Card de informações */}
              <div className="bg-info rounded-t-lg rounded-b-lg mt-2 md:mx-2 mx-1">
                {/* Header do card */}
                <div className="md:px-5 px-2 py-4 border-b border-primary/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="md:w-12 md:h-12 w-10 h-10 rounded-lg bg-white border-2 flex items-center justify-center"
                        style={{ borderColor: corHex || '#000000' }}
                      >
                        {iconName ? (
                          <DinamicIcon iconName={iconName} color={corHex || '#000000'} size={28} />
                        ) : (
                          <span className="text-tertiary text-2xl"></span>
                        )}
                      </div>
                      <div>
                        <h2 className="text-primary-text md:text-lg text-sm font-nunito font-semibold">
                          {nome.trim() ? nome : 'Nome do Grupo'}
                        </h2>
                        <p className="text-secondary-text md:text-sm text-xs font-nunito">
                          {iconName ? `Ícone selecionado: ${iconName}` : 'Definição do Ícone do Grupo'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-primary-text md:text-sm text-xs font-nunito">
                        {ativo ? 'Grupo ativo' : 'Grupo inativo'}
                      </p>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ativo}
                          onChange={(e) => setAtivo(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-12 h-5 bg-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[16px] after:bg-info after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Formulário */}
                <div className="md:p-5 p-2">
                  <div className="md:space-y-6 space-y-4">
                    {/* Nome */}
                    <div>
                      <label className="block text-primary-text text-sm font-nunito font-semibold mb-2">
                        Nome do Grupo *
                      </label>
                      <input
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Digite o nome do grupo"
                        className="w-full px-4 py-3 bg-primary-bg border border-primary/20 rounded-lg text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary font-nunito"
                        required
                      />
                    </div>

                    {/* Cor e Ícone */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Cor */}
                      <div>
                        <label className="block text-primary-text md:text-sm text-xs font-nunito font-semibold mb-2">
                          Cor do Grupo
                        </label>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsColorPickerOpen(true)}
                              className="md:w-12 md:h-12 w-10 h-10 rounded-lg border border-primary/20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                              style={{ backgroundColor: corHex || '#530CA3' }}
                              aria-label="Selecionar cor do grupo"
                            />
                            
                            <button
                              type="button"
                              onClick={() => setIsColorPickerOpen(true)}
                              className="px-2 py-3 bg-primary text-info rounded-lg font-nunito md:text-sm text-xs font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
                            >
                              Escolher cor
                            </button>
                          </div>
                          
                        </div>
                      </div>

                      {/* Ícone */}
                      <div>
                        <label className="block text-primary-text md:text-sm text-xs font-nunito font-semibold mb-2">
                          Ícone do Grupo
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsIconPickerOpen(true)}
                            className="md:w-12 md:h-12 w-10 h-10 rounded-lg border border-primary/30 bg-white flex items-center justify-center hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            aria-label="Selecionar ícone"
                          >
                            {iconName ? (
                              <DinamicIcon iconName={iconName} color="#000000" size={28} />
                            ) : (
                              <span className="text-xs text-secondary-text">Sem ícone</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsIconPickerOpen(true)}
                            className="px-2 py-3 bg-primary text-info rounded-lg font-nunito md:text-sm text-xs font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
                          >
                            Escolher Ícone
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Preview do ícone */}
                    <div>
                      <label className="block text-primary-text md:text-sm text-xs font-nunito font-semibold mb-2">
                        Preview do Ícone
                      </label>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          
                          className="group cursor-default"
                        >
                          <div
                            className="w-[45px] h-[45px] rounded-lg border-2 flex items-center justify-center transition-all hover:scale-110 hover:shadow-lg cursor-default"
                            style={{
                              backgroundColor: '#FFFFFF',
                              borderColor: corHex,
                            }}
                          >
                            {iconName ? (
                              <DinamicIcon iconName={iconName} color={corHex} size={24} />
                            ) : (
                              <span className="text-lg"></span>
                            )}
                          </div>
                        </button>

                        <button
                          type="button"
                          
                          className="group cursor-default"
                        >
                          <div
                            className="w-[45px] h-[45px] rounded-lg border-2 flex items-center justify-center transition-all hover:scale-110 hover:shadow-lg cursor-default"
                            style={{
                              backgroundColor: corHex || '#000000',
                              borderColor: corHex,
                            }}
                          >
                            {iconName ? (
                              <DinamicIcon iconName={iconName} color="#FFFFFF" size={24} />
                            ) : (
                              <span className="text-lg text-white"></span>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Ativo Delivery e Local */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ativoDelivery}
                            onChange={(e) => setAtivoDelivery(e.target.checked)}
                            className="w-5 h-5 rounded border-primary/60 text-primary focus:ring-primary"
                            style={{ accentColor: 'var(--color-primary)' }}
                          />
                          <span className="text-primary-text md:text-sm text-xs font-nunito">
                            Ativo para Delivery
                          </span>
                        </label>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ativoLocal}
                            onChange={(e) => setAtivoLocal(e.target.checked)}
                            className="w-5 h-5 rounded border-primary/60 text-primary focus:ring-primary"
                            style={{ accentColor: 'var(--color-primary)' }}
                          />
                          <span className="text-primary-text md:text-sm text-xs font-nunito">
                            Ativo para Local
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 1 && (
            <div className="py-6">
              {isEditMode && effectiveGrupoId ? (
                <ProdutosPorGrupoList grupoProdutoId={effectiveGrupoId} />
              ) : (
                <div className="text-center py-12">
                  <p className="text-secondary-text font-nunito">
                    A lista de produtos vinculados aparece no modo de edição.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de seleção de ícones */}
      <IconPickerModal
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        onSelect={(iconName) => {
          setIconName(iconName)
          setIsIconPickerOpen(false)
        }}
        selectedColor={corHex}
      />
      <ColorPickerModal
        open={isColorPickerOpen}
        onClose={() => setIsColorPickerOpen(false)}
        onSelect={handleColorSelect}
      />
    </div>
  )
}

