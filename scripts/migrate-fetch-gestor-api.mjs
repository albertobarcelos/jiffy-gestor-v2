/**
 * Substitui `await fetch(` por `await fetchGestorApi(` em ficheiros que chamam `/api/`
 * e acrescenta o import de `fetchGestorApi` se ainda não existir.
 */
import fs from 'node:fs'
import path from 'node:path'

const IMPORT = "import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'\n"

const roots = [
  path.join('src', 'presentation', 'hooks'),
  path.join('src', 'presentation', 'components', 'features', 'convites-gestao', 'services'),
]

function walkDir(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) out.push(...walkDir(p))
    else if (name.endsWith('.ts') || name.endsWith('.tsx')) out.push(p)
  }
  return out
}

function insertImport(source) {
  if (source.includes("from '@/src/presentation/utils/fetchGestorApi'")) {
    return source
  }
  const lines = source.split('\n')
  let lastImport = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith('import ')) lastImport = i
    else if (lastImport >= 0 && line !== '' && !line.startsWith('import ')) break
  }
  if (lastImport < 0) {
    return IMPORT + source
  }
  lines.splice(lastImport + 1, 0, IMPORT.trimEnd())
  return lines.join('\n')
}

function migrateFile(filePath) {
  let s = fs.readFileSync(filePath, 'utf8')
  if (!s.includes('/api/')) return false
  if (!s.includes('await fetch(')) return false
  const next = s.replace(/await fetch\(/g, 'await fetchGestorApi(')
  if (next === s) return false
  const withImport = insertImport(next)
  fs.writeFileSync(filePath, withImport)
  return true
}

let n = 0
for (const root of roots) {
  const abs = path.join(process.cwd(), root)
  for (const f of walkDir(abs)) {
    if (migrateFile(f)) {
      n++
      console.log('migrated', path.relative(process.cwd(), f))
    }
  }
}
console.log('done, files migrated:', n)
