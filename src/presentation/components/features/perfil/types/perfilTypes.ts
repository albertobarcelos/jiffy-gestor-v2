/** Dados exibidos na aba Dados Pessoais (campos futuros podem ficar vazios até o backend). */
export type PerfilDadosExibicao = {
  nomeCompleto: string
  apelido: string | null
  email: string
  dataNascimento: string | null
  telefone: string | null
  departamento: string | null
  localizacao: string | null
}

export const PERFIL_CAMPO_VAZIO = '—'

export type PerfilTabId = 'personal' | 'account'

export const PERFIL_TABS: { id: PerfilTabId; label: string }[] = [
  { id: 'personal', label: 'Dados Pessoais' },
  { id: 'account', label: 'Configurações da Conta' },
]

/** Largura única e centralizada do conteúdo da página de perfil. */
export const PERFIL_CONTENT_WIDTH_CLASS = 'mx-auto w-full lg:w-2/3'
