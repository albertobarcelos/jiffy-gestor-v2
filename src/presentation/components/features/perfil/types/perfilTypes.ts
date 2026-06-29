/** Dados exibidos na aba Dados Pessoais (campos futuros podem ficar vazios até o backend). */
export type PerfilDadosExibicao = {
  nomeCompleto: string
  apelido: string | null
  email: string
  dataNascimento: string | null
  telefone: string | null
  departamento: string | null
  cidade: string | null
  estado: string | null
}

export const PERFIL_CAMPO_VAZIO = '—'

export type PerfilTabId = 'personal' | 'account'

export const PERFIL_TABS: { id: PerfilTabId; label: string }[] = [
  { id: 'personal', label: 'Dados Pessoais' },
  { id: 'account', label: 'Configurações da Conta' },
]

/** Largura única e centralizada do conteúdo da página de perfil. */
export const PERFIL_CONTENT_WIDTH_CLASS = 'mx-auto w-full lg:w-2/3'

/** Edição de dados pessoais via PATCH /api/auth/usuario/me. */
export const PERFIL_DADOS_PESSOAIS_EDICAO_HABILITADA = true

/** Cidade/UF no card de identidade. */
export const PERFIL_EXIBIR_LOCALIZACAO_CARD = true

/** Compõe "Cidade/UF" a partir de cidade e estado (para exibição). */
export function formatarCidadeUf(
  cidade: string | null,
  estado: string | null
): string | null {
  const c = cidade?.trim()
  const e = estado?.trim().toUpperCase()
  if (c && e) return `${c}/${e}`
  if (c) return c
  if (e) return e
  return null
}
