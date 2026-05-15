/**
 * Corrige imports em ficheiros migrados: acrescenta import de fetchGestorApi
 * se o símbolo for usado mas o import estiver em falta.
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

function needsImport(source) {
  if (!source.includes('fetchGestorApi')) return false
  if (source.includes("from '@/src/presentation/utils/fetchGestorApi'")) return false
  if (source.includes('from "@/src/presentation/utils/fetchGestorApi"')) return false
  return true
}

function insertImport(source) {
  const lines = source.split('\n')
  let lastImport = -1
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    if (raw.startsWith('import ')) {
      lastImport = i
      continue
    }
    if (lastImport >= 0) {
      const t = raw.trim()
      if (t === '' || t.startsWith('import ')) continue
      break
    }
  }
  if (lastImport < 0) {
    return IMPORT + source
  }
  lines.splice(lastImport + 1, 0, IMPORT.trimEnd())
  return lines.join('\n')
}

let n = 0
for (const root of roots) {
  const abs = path.join(process.cwd(), root)
  for (const f of walkDir(abs)) {
    const s = fs.readFileSync(f, 'utf8')
    if (!needsImport(s)) continue
    fs.writeFileSync(f, insertImport(s))
    n++
    console.log('fixed', path.relative(process.cwd(), f))
  }
}
console.log('done, fixed:', n)
