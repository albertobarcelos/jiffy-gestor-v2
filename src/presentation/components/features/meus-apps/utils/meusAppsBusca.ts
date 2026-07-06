import type { ConvitePendente } from '@/src/presentation/components/features/convites/types'
import type { MeusApp } from '../types'

/** Nome, sigla, CNPJ formatado ou trecho numérico do CNPJ. */
export function appEmpresaCorrespondeBusca(app: MeusApp, buscaRaw: string): boolean {
  const q = buscaRaw.trim().toLowerCase()
  if (!q) {
    return true
  }
  if (app.nome.toLowerCase().includes(q)) {
    return true
  }
  if (app.sigla?.toLowerCase().includes(q)) {
    return true
  }
  const tipo = app.tipo ?? ''
  if (tipo.toLowerCase().includes(q)) {
    return true
  }
  const qDigits = buscaRaw.replace(/\D/g, '')
  if (qDigits.length >= 2) {
    const cnpjDigits = tipo.replace(/\D/g, '')
    if (cnpjDigits.includes(qDigits)) {
      return true
    }
  }
  return false
}

/** Nome da empresa convidada ou e-mail do convite. */
export function conviteCorrespondeBusca(convite: ConvitePendente, buscaRaw: string): boolean {
  const q = buscaRaw.trim().toLowerCase()
  if (!q) {
    return true
  }
  return (
    convite.nomeEmpresa.toLowerCase().includes(q) ||
    convite.email.toLowerCase().includes(q)
  )
}
