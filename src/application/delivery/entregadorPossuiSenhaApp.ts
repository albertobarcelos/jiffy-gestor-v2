/**
 * O GET de entregador não devolve o PIN (fica só no hash).
 * Se o backend mandar um booleano, usamos; senão a edição trata como já cadastrada.
 */
export function entregadorPossuiSenhaApp(raw: unknown): boolean | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>

  for (const chave of ['senhaCadastrada', 'temSenha', 'possuiSenha', 'senhaDefinida'] as const) {
    const valor = row[chave]
    if (typeof valor === 'boolean') return valor
  }

  if (typeof row.senha === 'string') {
    return row.senha.trim().length > 0
  }

  return null
}
