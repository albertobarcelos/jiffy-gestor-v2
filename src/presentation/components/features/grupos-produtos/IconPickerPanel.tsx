'use client'

import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@mdi/react'
import { mdiMagnify } from '@mdi/js'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { cn } from '@/src/shared/utils/cn'

export interface IconData {
  name: string
  tags: string[]
  group: string
}

type IconPickerPanelVariant = 'modal' | 'inline'

export type IconPickerPanelProps = {
  enabled?: boolean
  selectedColor?: string
  selectedIconName?: string
  disabled?: boolean
  variant?: IconPickerPanelVariant
  onSelect: (iconName: string) => void
}

export function IconPickerPanel({
  enabled = true,
  selectedColor = '#171A1C',
  selectedIconName,
  disabled = false,
  variant = 'inline',
  onSelect,
}: IconPickerPanelProps) {
  const [icons, setIcons] = useState<IconData[]>([])
  const [filteredIcons, setFilteredIcons] = useState<IconData[]>([])
  const [searchText, setSearchText] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groups, setGroups] = useState<string[]>([])
  const { auth } = useAuthStore()

  const isModal = variant === 'modal'

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
    if (!enabled) return
    void loadIcons()
  }, [enabled, loadIcons])

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

  const tabsClassName = isModal
    ? '-mx-2 -mt-2 bg-info px-4 md:-mx-4 md:px-6'
    : 'rounded-lg bg-info px-2 pt-2'

  const gridClassName = cn(
    'grid gap-1 sm:grid-cols-4 md:gap-2',
    isModal ? 'grid-cols-3 md:grid-cols-5' : 'grid-cols-3 md:grid-cols-4'
  )

  const scrollAreaClassName = cn(
    'min-h-0 overflow-y-auto',
    isModal ? 'min-h-[40vh] flex-1 pb-2' : 'max-h-[min(420px,50vh)] rounded-lg border border-gray-100 p-1'
  )

  const emptyStateMinHeight = isModal ? 'min-h-[40vh]' : 'min-h-[200px]'

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col',
        isModal ? 'flex-1 px-2 pb-2 md:px-4' : 'mt-3 gap-2',
        disabled && 'pointer-events-none opacity-60'
      )}
    >
      {groups.length > 0 ? (
        <div className={cn(tabsClassName, 'shrink-0')}>
          <div className="scrollbar-hide overflow-x-auto">
            <div className="flex min-w-max flex-nowrap gap-1">
              {groups.map((group, index) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setActiveTab(index)}
                  className={cn(
                    'shrink-0 rounded-t-lg px-3 py-1.5 text-xs font-semibold transition-colors md:px-4 md:py-2 md:text-sm',
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
      ) : null}

      <div className={cn('relative shrink-0', isModal ? 'mb-3 pt-1' : '')}>
        <Icon
          path={mdiMagnify}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
          size={1}
        />
        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="Buscar ícone…"
          disabled={disabled}
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-xs text-primary-text placeholder:text-secondary-text focus:outline-none focus:ring-1 focus:ring-secondary/40"
        />
      </div>

      <div className={scrollAreaClassName}>
        {isLoading ? (
          <div
            className={cn(
              emptyStateMinHeight,
              'flex flex-col items-center justify-center gap-2 py-8'
            )}
          >
            <JiffyLoading />
          </div>
        ) : error ? (
          <div
            className={cn(
              emptyStateMinHeight,
              'flex flex-col items-center justify-center gap-3 py-8'
            )}
          >
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
          <div
            className={cn(
              emptyStateMinHeight,
              'flex flex-col items-center justify-center text-center px-4'
            )}
          >
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
          <div className={gridClassName}>
            {filteredIcons.map(icon => (
              <IconCard
                key={icon.name}
                icon={icon}
                selectedColor={selectedColor}
                isSelected={selectedIconName === icon.name}
                compact={!isModal}
                onSelect={() => onSelect(icon.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

type IconCardProps = {
  icon: IconData
  selectedColor: string
  isSelected?: boolean
  compact?: boolean
  onSelect: () => void
}

function IconCard({
  icon,
  selectedColor,
  isSelected = false,
  compact = false,
  onSelect,
}: IconCardProps) {
  const [isHovering, setIsHovering] = useState(false)
  const isActive = isSelected || isHovering

  const backgroundColor = isActive ? selectedColor : '#FFFFFF'
  const iconColor = isActive ? '#FFFFFF' : selectedColor
  const borderColor = isSelected ? selectedColor : isHovering ? selectedColor : '#E5E7EB'

  return (
    <button
      type="button"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={onSelect}
      aria-pressed={isSelected}
      className={cn(
        'flex aspect-square flex-col items-center justify-center rounded-lg border-2 transition-all duration-200',
        compact ? 'p-2' : 'p-3',
        isHovering && !isSelected && 'scale-105',
        isSelected && 'ring-2 ring-offset-1 ring-secondary'
      )}
      style={{
        backgroundColor,
        borderColor: isSelected ? selectedColor : borderColor,
      }}
    >
      <DinamicIcon
        iconName={icon.name}
        color={iconColor}
        size={compact ? 24 : 32}
        className={compact ? 'mb-1' : 'mb-2'}
      />
      <span
        className={cn(
          'font-nunito line-clamp-2 text-center',
          compact ? 'text-[10px] leading-tight' : 'text-xs'
        )}
        style={{ color: iconColor }}
      >
        {(icon.tags.length > 0 ? icon.tags[0] : icon.name).toLocaleUpperCase('pt-BR')}
      </span>
    </button>
  )
}
