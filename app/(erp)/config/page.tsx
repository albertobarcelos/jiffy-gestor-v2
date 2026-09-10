import { redirect } from 'next/navigation'
import { DELIVERY_HUB_PATH } from '@/src/shared/constants/configuracoesRoutes'

/** `/config` → hub Delivery. */
export default function ConfigIndexPage() {
  redirect(DELIVERY_HUB_PATH)
}
