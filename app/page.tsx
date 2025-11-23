import { redirect } from 'next/navigation'

/**
 * Página inicial - redireciona para login
 */
export default function HomePage() {
  redirect('/login')
}

