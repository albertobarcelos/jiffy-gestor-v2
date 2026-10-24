import { DeliveryRealtimeBridge } from '@/src/presentation/realtime/DeliveryRealtimeBridge'
import { ExpedicaoAppPwa } from '@/src/presentation/expedicao/app/pwa/ExpedicaoAppPwa'

export default function ExpedicaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--color-info,#f4f6f8)]">
      <DeliveryRealtimeBridge />
      <ExpedicaoAppPwa />
      {children}
    </div>
  )
}
