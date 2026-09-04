'use client'

import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { IconPickerPanel } from './IconPickerPanel'

interface IconPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (iconName: string) => void
  selectedColor?: string
  zIndex?: number
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
  zIndex = 1300,
}: IconPickerModalProps) {
  return (
    <JiffySidePanelModal
      open={isOpen}
      onClose={onClose}
      zIndex={zIndex}
      title="SELECIONE UM ÍCONE"
      panelClassName="w-[min(32rem,100vw)] max-w-[100vw] sm:w-[min(38rem,90rem)]"
      scrollableBody={false}
      footerVariant="bar"
      footerActions={{
        showCancel: true,
        cancelLabel: 'Fechar',
        onCancel: onClose,
        cancelVariant: 'primary',
      }}
    >
      <IconPickerPanel
        enabled={isOpen}
        selectedColor={selectedColor}
        variant="modal"
        onSelect={iconName => {
          onSelect(iconName)
          onClose()
        }}
      />
    </JiffySidePanelModal>
  )
}
