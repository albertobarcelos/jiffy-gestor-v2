import { redirect } from 'next/navigation'
import { HUB_ROUTES } from '@/src/shared/constants/hubRoutes'

/** URL antiga do menu; entrada oficial pelo Hub: {@link HUB_ROUTES.gerenciarUsuarios}. */
export default function LegacyConvitesGestorRedirect() {
  redirect(HUB_ROUTES.gerenciarUsuarios)
}
