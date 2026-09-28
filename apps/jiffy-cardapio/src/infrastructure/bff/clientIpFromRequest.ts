/**
 * IP do celular que chegou na Vercel — o 1º de X-Forwarded-For.
 * Sem isso o BFF fala com o backend com o IP de saída da Vercel e
 * todas as cotações da loja caem no mesmo balde de 10/min.
 */
export function clientIpFromRequest(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = request.headers.get('x-real-ip')?.trim()
  return realIp || null
}

export function headersEncaminharIpCliente(request: Request): Record<string, string> {
  const ip = clientIpFromRequest(request)
  if (!ip) return {}
  return {
    'X-Forwarded-For': ip,
    'X-Real-IP': ip,
  }
}
