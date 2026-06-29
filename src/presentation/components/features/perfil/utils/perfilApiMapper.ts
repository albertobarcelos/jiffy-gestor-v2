import type { PerfilDadosExibicao } from '../types/perfilTypes'
import { somenteDigitosTelefone } from './telefoneMask'

export type UsuarioMeApiResponse = {
  id?: string
  username?: string
  nome?: string | null
  apelido?: string | null
  dataNascimento?: string | null
  telefone?: string | null
  departamento?: string | null
  cidade?: string | null
  estado?: string | null
  emailConfirmado?: boolean
}

export function mapUsuarioMeToPerfilDados(
  data: UsuarioMeApiResponse,
  fallbackEmail: string
): PerfilDadosExibicao {
  const nome =
    typeof data.nome === 'string' && data.nome.trim().length > 0
      ? data.nome.trim()
      : fallbackEmail || 'Usuário'

  return {
    nomeCompleto: nome,
    apelido: data.apelido ?? null,
    email:
      typeof data.username === 'string' && data.username.trim().length > 0
        ? data.username.trim()
        : fallbackEmail,
    dataNascimento: data.dataNascimento ?? null,
    telefone: data.telefone ?? null,
    departamento: data.departamento ?? null,
    cidade: data.cidade ?? null,
    estado: data.estado ?? null,
  }
}

export type PerfilDadosPatchPayload = {
  nome?: string
  apelido?: string | null
  dataNascimento?: string | null
  telefone?: string | null
  departamento?: string | null
  cidade?: string | null
  estado?: string | null
}

export function buildPerfilPatchPayload(form: {
  nomeCompleto: string
  apelido: string
  dataNascimento: string
  telefone: string
  departamento: string
  cidade: string
  estado: string
}): PerfilDadosPatchPayload {
  const trimOrNull = (value: string): string | null => {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  const telefoneDigitos = somenteDigitosTelefone(form.telefone)
  const estado = form.estado.trim().toUpperCase()

  return {
    nome: form.nomeCompleto.trim(),
    apelido: trimOrNull(form.apelido),
    dataNascimento: trimOrNull(form.dataNascimento),
    telefone: telefoneDigitos.length > 0 ? telefoneDigitos : null,
    departamento: trimOrNull(form.departamento),
    cidade: trimOrNull(form.cidade),
    estado: estado.length > 0 ? estado : null,
  }
}
