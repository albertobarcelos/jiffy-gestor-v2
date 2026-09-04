import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'

export const PAGE_SIZE_EMPRESAS_FLOW = 10

export function empresaFlowCorrespondeBusca(
  empresa: LoginEmpresaSnapshot,
  buscaRaw: string
): boolean {
  const q = buscaRaw.trim().toLowerCase()
  if (!q) return true
  if (empresa.nomeFantasia.toLowerCase().includes(q)) return true
  if (empresa.cnpj.toLowerCase().includes(q)) return true
  const qDigits = buscaRaw.replace(/\D/g, '')
  if (qDigits.length >= 2) {
    const cnpjDigits = empresa.cnpj.replace(/\D/g, '')
    if (cnpjDigits.includes(qDigits)) return true
  }
  return false
}

export function ordenarEmpresasFlow(
  empresas: readonly LoginEmpresaSnapshot[],
  ultimaId: string | null
): LoginEmpresaSnapshot[] {
  const lista = [...empresas]
  if (!ultimaId) return lista
  const idx = lista.findIndex(e => e.id === ultimaId)
  if (idx <= 0) return lista
  const [ultima] = lista.splice(idx, 1)
  return [ultima, ...lista]
}

export function filtrarEmpresasFlow(
  empresas: readonly LoginEmpresaSnapshot[],
  busca: string,
  ultimaId: string | null
): LoginEmpresaSnapshot[] {
  const filtradas = empresas.filter(e => empresaFlowCorrespondeBusca(e, busca))
  return ordenarEmpresasFlow(filtradas, ultimaId)
}

export function fatiarEmpresasFlow(
  empresas: readonly LoginEmpresaSnapshot[],
  visiveis: number
): LoginEmpresaSnapshot[] {
  return empresas.slice(0, Math.max(0, visiveis))
}

/** Lista ainda não enche o painel, ou o utilizador chegou perto do fim. */
export function deveCarregarMaisEmpresasFlow(input: {
  scrollTop: number
  clientHeight: number
  scrollHeight: number
  temMais: boolean
  limiarPx?: number
}): boolean {
  if (!input.temMais) return false
  const limiar = input.limiarPx ?? 96
  if (input.scrollHeight <= input.clientHeight + 8) return true
  return input.scrollTop + input.clientHeight >= input.scrollHeight - limiar
}
