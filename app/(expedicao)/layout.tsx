import { DeliveryRealtimeBridge } from '@/src/presentation/realtime/DeliveryRealtimeBridge'
import { ExpedicaoAppPwa } from '@/src/presentation/expedicao/app/pwa/ExpedicaoAppPwa'

export default function ExpedicaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DeliveryRealtimeBridge />
      <ExpedicaoAppPwa />
      {children}
    </>
  )
}
