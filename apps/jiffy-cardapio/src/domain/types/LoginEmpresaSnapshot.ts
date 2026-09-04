/**
 * Dados mínimos da empresa retornados no login multi-empresa (hub gestor).
 */
export interface LoginEmpresaSnapshot {
  id: string
  nomeFantasia: string
  cnpj: string
  bloqueado: boolean
}
