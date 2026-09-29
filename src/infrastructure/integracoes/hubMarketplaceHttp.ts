import http from 'node:http'
import https from 'node:https'

export type RespostaRedirectHub = {
  status: number
  location: string | null
  body: string | null
}

function lerCorpoLimitado(res: http.IncomingMessage, limite = 4000): Promise<string> {
  return new Promise((resolve, reject) => {
    const pedacos: Buffer[] = []
    let tamanho = 0
    res.on('data', chunk => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      tamanho += buf.length
      if (tamanho <= limite) pedacos.push(buf)
    })
    res.on('end', () => resolve(Buffer.concat(pedacos).toString('utf8')))
    res.on('error', reject)
  })
}

/**
 * GET sem seguir redirect. O `fetch` do Next.js costuma acompanhar o 302
 * até o login e apaga o header Location.
 */
export function getLocationSemSeguir(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<RespostaRedirectHub> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const client = parsed.protocol === 'https:' ? https : http
    const req = client.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'GET',
        headers,
        timeout: timeoutMs,
      },
      res => {
        const raw = res.headers.location
        const location = Array.isArray(raw) ? raw[0] : raw
        void lerCorpoLimitado(res)
          .then(body =>
            resolve({
              status: res.statusCode ?? 0,
              location: location?.trim() || null,
              body: body.trim() || null,
            })
          )
          .catch(reject)
      }
    )
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('timeout'))
    })
    req.on('error', reject)
    req.end()
  })
}
