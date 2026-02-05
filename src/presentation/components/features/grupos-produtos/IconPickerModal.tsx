import React, { useState, useEffect, useMemo } from 'react'
import { Icon } from '@mdi/react' // Importa o componente Icon do @mdi/react
import { mdiClose, mdiMagnify } from '@mdi/js' // Importa os paths dos ícones MDI específicos
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { useAuthStore } from '@/src/presentation/stores/authStore'

interface IconData {
  name: string
  tags: string[]
  group: string
}

interface IconPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (iconName: string) => void
  selectedColor?: string
}

/**
 * Modal de seleção de ícones
 * Replica o design e funcionalidade do DinamicIconsWidget do Flutter
 */
export function IconPickerModal({
  isOpen,
  onClose,
  onSelect,
  selectedColor = '#171A1C',
}: IconPickerModalProps) {
  const [icons, setIcons] = useState<IconData[]>([])
  const [filteredIcons, setFilteredIcons] = useState<IconData[]>([])
  const [searchText, setSearchText] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [groups, setGroups] = useState<string[]>([])
  const { auth } = useAuthStore()

  // Carrega ícones da API
  useEffect(() => {
    if (!isOpen) return

    const loadIcons = async () => {
      setIsLoading(true)
      try {
        const token = auth?.getAccessToken()
        if (!token) {
          console.error('Token não encontrado')
          return
        }

        const response = await fetch('/api/icones', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Erro ao carregar ícones')
        }

        const data = await response.json()
        const iconsList = Array.isArray(data) ? data : data.items || []

        setIcons(iconsList)
        setFilteredIcons(iconsList)

        // Extrai grupos únicos
        const uniqueGroups = Array.from(
          new Set(iconsList.map((icon: IconData) => icon.group))
        )
        setGroups(['Todos os Ícones', ...(Array.from(uniqueGroups) as string[])])
      } catch (error) {
        console.error('Erro ao carregar ícones:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadIcons()
  }, [isOpen, auth])

  // Filtra ícones baseado na busca e tab ativa
  useEffect(() => {
    let filtered = icons

    // Filtro por grupo (tab ativa)
    if (activeTab > 0 && groups[activeTab]) {
      const activeGroup = groups[activeTab]
      filtered = filtered.filter((icon) => icon.group === activeGroup)
    }

    // Filtro por busca
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase()
      filtered = filtered.filter(
        (icon) =>
          icon.name.toLowerCase().includes(searchLower) ||
          icon.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
          icon.group.toLowerCase().includes(searchLower)
      )
    }

    setFilteredIcons(filtered)
  }, [searchText, activeTab, icons, groups])

  // Fecha modal ao pressionar ESC
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-info rounded-2xl w-[95vw] max-w-6xl h-[85vh] max-h-[700px] flex flex-col shadow-2xl border border-primary/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com busca e fechar */}
        <div className="flex items-center gap-4 p-4 border-b border-secondary/10">
          <div className="flex-1 relative">
            <Icon path={mdiMagnify} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text" size={1} />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar ícone..."
              className="w-full pl-12 pr-4 py-2 bg-primary-bg border-2 border-primary rounded-lg text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary font-nunito"
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 text-secondary-text hover:text-primary-text hover:bg-primary-bg rounded-lg transition-colors"
          >
            <Icon path={mdiClose} className="w-6 h-6" size={1} />
          </button>
        </div>

        {/* Tabs de grupos */}
        <div className="border-b border-secondary/10 overflow-x-auto scrollbar-hide">
          <div className="flex min-w-max">
            {groups.map((group, index) => (
              <button
                key={group}
                onClick={() => setActiveTab(index)}
                className={`
                  md:px-6 px-2 py-4 font-nunito font-semibold md:text-sm text-xs
                  transition-colors whitespace-nowrap
                  relative
                  ${
                    activeTab === index
                      ? 'text-primary-text border-b-2 border-primary'
                      : 'text-secondary-text hover:text-primary-text'
                  }
                `}
              >
                {group}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de ícones */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <img
                src="/images/jiffy-loading.gif"
                alt="Carregando"
                className="w-16 h-16 object-contain"
              />
              <span className="text-sm font-medium font-nunito text-primary-text">Carregando...</span>
            </div>
          ) : filteredIcons.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-secondary-text font-nunito font-medium mb-2">
                Nenhum ícone encontrado
              </p>
              <p className="text-tertiary text-sm font-nunito">
                {searchText
                  ? 'Tente uma busca diferente'
                  : 'Nenhum ícone disponível nesta categoria'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 md:gap-3 gap-2">
              {filteredIcons.map((icon) => (
                <IconCard
                  key={icon.name}
                  icon={icon}
                  selectedColor={selectedColor}
                  onSelect={() => {
                    onSelect(icon.name)
                    onClose()
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface IconCardProps {
  icon: IconData
  selectedColor: string
  onSelect: () => void
}

function IconCard({ icon, selectedColor, onSelect }: IconCardProps) {
  const [isHovering, setIsHovering] = useState(false)

  const backgroundColor = isHovering ? selectedColor : '#FFFFFF'
  const iconColor = isHovering ? '#FFFFFF' : selectedColor
  const borderColor = selectedColor

  return (
    <button
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={onSelect}
      className={`
        aspect-square rounded-lg border-2 p-3
        transition-all duration-200
        flex flex-col items-center justify-center
        hover:scale-105
      `}
      style={{
        backgroundColor,
        borderColor,
      }}
    >
      <DinamicIcon
        iconName={icon.name}
        color={iconColor}
        size={32}
        className="mb-2"
      />
      <span
        className="text-xs text-center font-nunito line-clamp-2"
        style={{ color: iconColor }}
      >
        {icon.tags.length > 0 ? icon.tags[0] : icon.name}
      </span>
    </button>
  )
}