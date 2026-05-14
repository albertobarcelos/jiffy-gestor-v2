import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import type { MeusApp } from '../types'

/** Formata CNPJ numérico (14 dígitos) para exibição; se inválido, devolve o original. */
export function formatarCnpjExibicao(cnpj: string): string {
  const digitos = cnpj.replace(/\D/g, '')
  if (digitos.length !== 14) {
    return cnpj.trim()
  }
  return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function siglaDeNomeFantasia(nomeFantasia: string): string {
  const parts = nomeFantasia.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
  }
  return nomeFantasia.trim().slice(0, 2).toUpperCase()
}

/** Mapeia snapshot do login para o modelo exibido nos cards do hub. */
export function empresaParaMeusApp(e: LoginEmpresaSnapshot): MeusApp {
  return {
    id: e.id,
    nome: e.nomeFantasia,
    status: e.bloqueado ? 'inativo' : 'ativo',
    tipo: formatarCnpjExibicao(e.cnpj),
    sigla: siglaDeNomeFantasia(e.nomeFantasia),
  }
}
