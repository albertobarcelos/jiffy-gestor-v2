/**
 * Gate CI: falha se o ERP voltar a usar `auth?.getAccessToken` ou `fetch('/api/` cru
 * em paths de feature (fora da allowlist hub/auth/público).
 *
 * Uso: node scripts/check-tenant-auth.mjs
 */
import fs from 'fs'
import path from 'path'

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.next') continue
      walk(p, acc)
    } else if (/\.(ts|tsx)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

/** Paths allowed to use raw fetch('/api/...') or identity `auth`. */
function isAllowlisted(rel) {
  const n = rel.replace(/\\/g, '/')
  return (
    n.includes('/features/auth/') ||
    n.includes('/minhas-empresas/') ||
    n.includes('/components/auth/') ||
    n.endsWith('perfil/Perfil.tsx') ||
    n.endsWith('escolherEmpresaApi.ts') ||
    n.endsWith('loginViaApiRoute.ts') ||
    n.endsWith('disconnectEmpresaTab.ts') ||
    n.endsWith('restoreIdentityFromCookie.ts') ||
    n.endsWith('ensureHubBearerToken.ts') ||
    n.endsWith('fetchGestorApi.ts') ||
    n.endsWith('consultaCep.ts') ||
    n.endsWith('cidade-autocomplete.tsx') ||
    n.endsWith('authStore.ts') ||
    n.includes('/shared/utils/fetchTenantRefresh')
  )
}

const roots = [
  'src/presentation/components/features',
  'src/presentation/hooks',
  'src/infrastructure/api',
  'src/infrastructure/printing',
  'src/application',
]

const violations = []

for (const root of roots) {
  for (const file of walk(root)) {
    const rel = file.replace(/\\/g, '/')
    if (isAllowlisted(rel)) continue
    const text = fs.readFileSync(file, 'utf8')
    const lines = text.split(/\r?\n/)
    lines.forEach((line, i) => {
      if (/auth\?\.getAccessToken\(/.test(line)) {
        violations.push(`${rel}:${i + 1}: auth?.getAccessToken (use tenantAuth)`)
      }
      if (/const \{ auth \} = useAuthStore\(/.test(line)) {
        violations.push(`${rel}:${i + 1}: const { auth } = useAuthStore (use tenantAuth)`)
      }
      if (/\bfetch\(\s*[`'"]\/api\//.test(line) && !/fetchGestorApi/.test(line)) {
        violations.push(`${rel}:${i + 1}: raw fetch('/api/...') (use fetchGestorApi)`)
      }
    })
  }
}

if (violations.length) {
  console.error(`tenant-auth check FAILED (${violations.length}):`)
  for (const v of violations) console.error(' -', v)
  process.exit(1)
}

console.log('tenant-auth check OK')
