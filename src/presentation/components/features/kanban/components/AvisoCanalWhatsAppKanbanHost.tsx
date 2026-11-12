'use client'

import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NotificacoesWhatsAppDeliveryTab } from '@/src/presentation/components/features/configuracoes/tabs/NotificacoesWhatsAppDeliveryTab'
import { useAvisoCanalWhatsAppKanban } from '@/src/presentation/components/features/kanban/hooks/useAvisoCanalWhatsAppKanban'

/**
 * Toast de aviso + painel lateral de configuração do canal WhatsApp no Kanban.
 */
export function AvisoCanalWhatsAppKanbanHost() {
  const { painelConfigOpen, fecharPainelConfig } = useAvisoCanalWhatsAppKanban()

  return (
    <JiffySidePanelModal
      open={painelConfigOpen}
      onClose={fecharPainelConfig}
      title="Notificações WhatsApp"
      panelClassName="w-[min(28rem,100vw)] max-w-[100vw]"
      scrollableBody={false}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <NotificacoesWhatsAppDeliveryTab embeddedInPanel />
      </div>
    </JiffySidePanelModal>
  )
}
