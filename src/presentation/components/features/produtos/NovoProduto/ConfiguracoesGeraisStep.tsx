'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/src/presentation/components/ui/button'
import { useAuthStore } from '@/src/presentation/stores/authStore'

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

  const handleComplementosSelect = () => {
    // TODO: Implementar modal de seleção múltipla
    alert('Seleção de complementos será implementada')
  }

  const handleImpressorasSelect = () => {
    // TODO: Implementar modal de seleção múltipla
    alert('Seleção de impressoras será implementada')
  }

  return (
    <div className="bg-info rounded-[10px] p-5">
      {/* Título */}
      <div className="flex items-center gap-5 mb-5">
        <h3 className="text-secondary text-xl font-semibold font-exo">
          Configurações Gerais
        </h3>
        <div className="flex-1 h-px bg-alternate" />
      </div>

      <div className="space-y-5">
        {/* Seção Geral */}
        <div className="bg-info rounded-lg shadow-md p-2 min-h-[300px]">
          <div className="px-3 py-2">
            <h4 className="text-primary-text font-semibold font-exo text-sm mb-4">
              Geral
            </h4>

            <div className="space-y-4 px-3">
              {/* Favorito */}
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={favorito}
                    onChange={(e) => onFavoritoChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-primary-bg rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-alternate" />
                </label>
                <span className="text-primary-text font-nunito text-sm">
                  Favorito
                </span>
              </div>

              {/* Permite Desconto */}
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permiteDesconto}
                    onChange={(e) => onPermiteDescontoChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-primary-bg rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-alternate" />
                </label>
                <span className="text-primary-text font-nunito text-sm">
                  Permite Desconto
                </span>
              </div>

              {/* Permite Acréscimo */}
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permiteAcrescimo}
                    onChange={(e) => onPermiteAcrescimoChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-primary-bg rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-alternate" />
                </label>
                <span className="text-primary-text font-nunito text-sm">
                  Permite Acréscimo
                </span>
              </div>

              {/* Abre Complementos */}
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={abreComplementos}
                    onChange={(e) => onAbreComplementosChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-primary-bg rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-alternate" />
                </label>
                <span className="text-primary-text font-nunito text-sm">
                  Abre Complementos
                </span>
              </div>

              {/* Status Ativo (apenas em modo edição) */}
              {isEditMode && (
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={(e) => onAtivoChange(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-primary-bg rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent1" />
                  </label>
                  <span className="text-primary-text font-nunito text-sm">
                    Ativo
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grupos de Complementos */}
        {abreComplementos && (
          <div>
            <label className="block text-sm font-nunito mb-2 text-primary-text">
              Grupos de Complementos
            </label>
            <button
              onClick={handleComplementosSelect}
              className="w-full h-10 px-3 rounded-lg border border-[#CCCCCC] bg-info text-primary-text text-left font-nunito text-sm hover:border-primary transition-colors"
            >
              {grupoComplementosIds.length > 0
                ? `${grupoComplementosIds.length} selecionado(s)`
                : 'Selecione os grupos de complementos'}
            </button>
          </div>
        )}

        {/* Impressoras */}
        <div>
          <label className="block text-sm font-nunito mb-2 text-primary-text">
            Impressoras
          </label>
          <button
            onClick={handleImpressorasSelect}
            className="w-full h-10 px-3 rounded-lg border border-[#CCCCCC] bg-info text-primary-text text-left font-nunito text-sm hover:border-primary transition-colors"
          >
            {impressorasIds.length > 0
              ? `${impressorasIds.length} selecionada(s)`
              : 'Selecione as impressoras'}
          </button>
        </div>

        {/* Botões de ação */}
        <div className="flex justify-between pt-5">
          <Button
            onClick={onBack}
            className="h-9 px-[26px] bg-primary/14 text-primary rounded-[30px] font-semibold font-exo text-sm hover:bg-primary/20 transition-colors"
          >
            Voltar
          </Button>
          <Button
            onClick={onSave}
            className="h-9 px-[26px] bg-primary text-info rounded-[30px] font-semibold font-exo text-sm hover:bg-primary/90 transition-colors"
          >
            Salvar
          </Button>
        </div>
      </div>
    </div>
  )
}

