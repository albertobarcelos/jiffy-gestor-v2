/**
 * Resposta da ViaCEP (campos usados no preenchimento de formulários).
 * Documentação: https://viacep.com.br/
 */
export interface ViaCepEnderecoNormalizado {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
}

/** Remove não dígitos e limita a 8 caracteres */
export function normalizarDigitosCep(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 8)
}

/** Máscara brasileira 00000-000 */
export function formatarCepMascara(valor: string): string {
  const numeros = normalizarDigitosCep(valor)
  if (numeros.length <= 5) return numeros
  return `${numeros.slice(0, 5)}-${numeros.slice(5)}`
}

/**
 * Consulta CEP pela rota Next `/api/consulta-cep` (proxy ViaCEP no servidor).
 */
export async function consultarCepViaApi(cepDigitos: string): Promise<ViaCepEnderecoNormalizado> {
  const cep = normalizarDigitosCep(cepDigitos)
  if (cep.length !== 8) {
    throw new Error('CEP deve conter 8 dígitos')
  }

  const response = await fetch(`/api/consulta-cep?cep=${encodeURIComponent(cep)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const msg =
      typeof payload.error === 'string' ? payload.error : 'Não foi possível consultar o CEP'
    throw new Error(msg)
  }

  const d = payload as Record<string, unknown>
  return {
    cep: String(d.cep ?? cep),
    logradouro: String(d.logradouro ?? ''),
    complemento: String(d.complemento ?? ''),
    bairro: String(d.bairro ?? ''),
    localidade: String(d.localidade ?? ''),
    uf: String(d.uf ?? ''),
  }
}
