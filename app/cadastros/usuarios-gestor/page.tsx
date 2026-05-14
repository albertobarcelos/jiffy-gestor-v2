import { redirect } from 'next/navigation'

/** URL antiga do menu; entrada oficial pelo Hub: `/meus-apps/usuarios-gestor`. */
export default function LegacyUsuariosGestorRedirect() {
  redirect('/meus-apps/usuarios-gestor')
}
