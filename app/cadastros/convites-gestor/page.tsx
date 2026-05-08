import { redirect } from 'next/navigation'

/** URL antiga do menu; entrada oficial pelo Hub: `/meus-apps/convidar-usuarios`. */
export default function LegacyConvitesGestorRedirect() {
  redirect('/meus-apps/convidar-usuarios')
}
