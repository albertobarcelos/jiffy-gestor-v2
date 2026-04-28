'use client'

import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@mdi/react'
import { mdiMagnify } from '@mdi/js'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { cn } from '@/src/shared/utils/cn'

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
  const [error, setError] = useState<string | null>(null)
  const [groups, setGroups] = useState<string[]>([])
  const { auth } = useAuthStore()

  const loadIcons = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = auth?.getAccessToken()
      if (!token) {
        setError('Sessão inválida. Faça login novamente.')
        setIcons([])
        setFilteredIcons([])
        setGroups([])
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

      const uniqueGroups = Array.from(new Set(iconsList.map((icon: IconData) => icon.group)))
      setGroups(['Todos os Ícones', ...(Array.from(uniqueGroups) as string[])])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar ícones')
      setIcons([])
      setFilteredIcons([])
      setGroups([])
    } finally {
      setIsLoading(false)
    }
  }, [auth])

  useEffect(() => {
    if (!isOpen) return
    void loadIcons()
  }, [isOpen, loadIcons])

  // Filtra ícones baseado na busca e tab ativa
  useEffect(() => {
    let filtered = icons

    if (activeTab > 0 && groups[activeTab]) {
      const activeGroup = groups[activeTab]
      filtered = filtered.filter(icon => icon.group === activeGroup)
    }

    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase()
      filtered = filtered.filter(
        icon =>
          icon.name.toLowerCase().includes(searchLower) ||
          icon.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
          icon.group.toLowerCase().includes(searchLower)
      )
    }

    setFilteredIcons(filtered)
  }, [searchText, activeTab, icons, groups])

  // Mesmo padrão visual das abas em `NovoGrupo` (faixa bg-info + pílulas rounded-t-lg)
  const tabsSlot =
    groups.length > 0 ? (
      <div className="-mx-2 -mt-2 bg-info px-4 md:-mx-4 md:px-6">
        <div className="scrollbar-hide overflow-x-auto">
          <div className="flex min-w-max flex-nowrap gap-1 pt-2">
            {groups.map((group, index) => (
              <button
                key={group}
                type="button"
                onClick={() => setActiveTab(index)}
                className={cn(
                  'shrink-0 rounded-t-lg px-4 py-2 text-xs font-semibold transition-colors md:text-sm',
                  activeTab === index
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
                )}
              >
                {group}
              </button>
            ))}
          </div>
        </div>
      </div>
    ) : null

  return (
    <JiffySidePanelModal
      open={isOpen}
      onClose={onClose}
      title="SELECIONE UM ÍCONE"
      panelClassName="w-[min(32rem,100vw)] max-w-[100vw] sm:w-[min(38rem,90rem)]"
      scrollableBody={false}
      tabsSlot={tabsSlot}
      footerVariant="bar"
      footerActions={{
        showCancel: true,
        cancelLabel: 'Fechar',
        onCancel: onClose,
        cancelVariant: 'primary',
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col px-2 pb-2 md:px-4">
        <div className="relative mb-3 shrink-0 pt-1">
          <Icon
            path={mdiMagnify}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
            size={1}
          />
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="BUSCAR ÍCONE..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-xs text-primary-text placeholder:text-secondary-text focus:outline-none"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-0 pb-2">
          {isLoading ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 py-8">
              <JiffyLoading />
            </div>
          ) : error ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-8">
              <p className="text-center text-sm text-error">{error}</p>
              <button
                type="button"
                onClick={() => void loadIcons()}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-info transition-colors hover:bg-primary/90"
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredIcons.length === 0 ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
              <p className="font-nunito mb-2 font-medium text-secondary-text">
                Nenhum ícone encontrado
              </p>
              <p className="font-nunito text-sm text-tertiary">
                {searchText
                  ? 'Tente uma busca diferente'
                  : 'Nenhum ícone disponível nesta categoria'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 md:gap-2">
              {filteredIcons.map(icon => (
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
    </JiffySidePanelModal>
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
      type="button"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={onSelect}
      className={`flex aspect-square flex-col items-center justify-center rounded-lg border-2 p-3 transition-all duration-200 hover:scale-105`}
      style={{
        backgroundColor,
        borderColor,
      }}
    >
      <DinamicIcon iconName={icon.name} color={iconColor} size={32} className="mb-2" />
      <span className="font-nunito line-clamp-2 text-center text-xs" style={{ color: iconColor }}>
        {(icon.tags.length > 0 ? icon.tags[0] : icon.name).toLocaleUpperCase('pt-BR')}
      </span>
    </button>
  )
}
