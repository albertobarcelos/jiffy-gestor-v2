#!/usr/bin/env node
/**
 * Smoke do Cardápio público (sem browser).
 *
 * Uso:
 *   CARDAPIO_PUBLIC_URL=http://localhost:5001 SLUG=minha-loja npm run smoke
 *
 * Variáveis:
 *   CARDAPIO_PUBLIC_URL | NEXT_PUBLIC_CARDAPIO_PUBLIC_URL  (obrigatório)
 *   SLUG                                                 (obrigatório)
 *   GESTOR_URL                                           (opcional — testa 308 /delivery/{slug})
 */

const base = (
  process.env.CARDAPIO_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL ||
  ''
)
  .trim()
  .replace(/\/$/, '')

const slug = (process.env.SLUG || '').trim()
const gestorUrl = (process.env.GESTOR_URL || '').trim().replace(/\/$/, '')

function fail(msg) {
  console.error(`FAIL  ${msg}`)
  process.exitCode = 1
}

function ok(msg) {
  console.log(`OK    ${msg}`)
}

async function check(name, fn) {
  try {
    await fn()
    ok(name)
  } catch (err) {
    fail(`${name}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function main() {
  if (!base) {
    fail('Defina CARDAPIO_PUBLIC_URL (ex.: http://localhost:5001)')
    process.exit(1)
  }
  if (!slug) {
    fail('Defina SLUG da loja (ex.: SLUG=minha-loja)')
    process.exit(1)
  }

  console.log(`Smoke Cardápio → ${base}  slug=${slug}`)

  await check('GET /{slug} responde', async () => {
    const res = await fetch(`${base}/${encodeURIComponent(slug)}`, {
      redirect: 'manual',
    })
    if (res.status >= 500) throw new Error(`HTTP ${res.status}`)
  })

  await check('GET /api/public/delivery/catalogo/{slug}', async () => {
    const res = await fetch(
      `${base}/api/public/delivery/catalogo/${encodeURIComponent(slug)}?limit=1&offset=0`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = await res.json()
    if (!body || typeof body !== 'object') throw new Error('JSON inválido')
    if (!('empresa' in body) && !('catalogo' in body) && !('gruposProdutos' in body)) {
      // aceita envelope flexível; exige algum payload
      if (Object.keys(body).length === 0) throw new Error('corpo vazio')
    }
    const cors = res.headers.get('access-control-allow-origin')
    if (cors !== '*') throw new Error(`CORS ausente (got ${cors})`)
  })

  await check('GET /api/public/delivery/meios-pagamento/{slug}', async () => {
    const res = await fetch(
      `${base}/api/public/delivery/meios-pagamento/${encodeURIComponent(slug)}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  })

  if (gestorUrl) {
    await check('Gestor /delivery/{slug} → 308 Cardápio', async () => {
      const res = await fetch(`${gestorUrl}/delivery/${encodeURIComponent(slug)}`, {
        redirect: 'manual',
      })
      if (res.status !== 308 && res.status !== 307) {
        throw new Error(`esperava 308, got ${res.status}`)
      }
      const loc = res.headers.get('location') || ''
      if (!loc.includes(base) && !loc.startsWith('/')) {
        // location pode ser absoluta apontando para cardapio
      }
      if (!loc.includes(slug)) throw new Error(`Location sem slug: ${loc}`)
    })
  } else {
    console.log('SKIP  redirect Gestor (defina GESTOR_URL para testar)')
  }

  if (process.exitCode) {
    console.error('\nSmoke falhou.')
    process.exit(1)
  }
  console.log('\nSmoke OK.')
}

main().catch(err => {
  fail(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
