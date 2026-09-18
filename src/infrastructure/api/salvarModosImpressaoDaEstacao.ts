import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import {
  idEstacaoDoTerminal,
  modoFichaDerivado,
  parseModoImpressaoImpressora,
  type ModoImpressaoImpressora,
} from '@/src/domain/types/modoImpressaoImpressora'

type TerminalPatch = {
  terminalId: string
  config: {
    modelo: string
    ativo: boolean
    modoImpressao: ModoImpressaoImpressora
    modoFicha: boolean
    imprimirSenha: boolean
    tipoConexao: string
    ip: string
    porta: string
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  return v as Record<string, unknown>
}

function listaTerminaisRaw(payload: unknown): unknown[] {
  const o = asRecord(payload)
  if (!o) return []
  const list = o.terminaisConfig ?? o.terminais
  return Array.isArray(list) ? list : []
}

function flattenTerminal(raw: unknown): Record<string, unknown> | null {
  const o = asRecord(raw)
  if (!o) return null
  const nested = asRecord(o.config)
  if (!nested) return { ...o }
  return { ...nested, ...o, terminalId: o.terminalId ?? nested.terminalId }
}

function configDeTerminal(
  raw: Record<string, unknown>,
  modo: ModoImpressaoImpressora
): TerminalPatch['config'] {
  return {
    modelo: String(raw.modelo ?? 'generico') || 'generico',
    ativo: raw.ativo !== false && raw.ativo !== 'false',
    modoImpressao: modo,
    modoFicha: modoFichaDerivado(modo),
    imprimirSenha: raw.imprimirSenha !== false && raw.imprimirSenha !== 'false',
    tipoConexao: String(raw.tipoConexao ?? 'ethernet') || 'ethernet',
    ip: String(raw.ip ?? '192.168.1.100') || '192.168.1.100',
    porta: String(raw.porta ?? '9100') || '9100',
  }
}

function modoDoTerminal(raw: Record<string, unknown>): ModoImpressaoImpressora {
  return parseModoImpressaoImpressora(
    raw.modoImpressao ?? raw.modo_impressao,
    raw.modoFicha === true ||
      raw.modoFicha === 'true' ||
      raw.modo_ficha === true ||
      raw.modo_ficha === 'true'
  )
}

export function montarTerminaisComModoDaEstacao(
  printerPayload: unknown,
  estacaoId: string,
  modo: ModoImpressaoImpressora
): { terminais: TerminalPatch[]; changed: boolean } {
  const estacao = estacaoId.trim()
  const desejado = parseModoImpressaoImpressora(modo)
  const terminais: TerminalPatch[] = []
  let found = false
  let changed = false

  for (const raw of listaTerminaisRaw(printerPayload)) {
    const flat = flattenTerminal(raw)
    if (!flat) continue
    const terminalId = idEstacaoDoTerminal(flat)
    if (!terminalId) continue
    const atual = modoDoTerminal(flat)
    const isEstacao = Boolean(estacao) && terminalId === estacao
    if (isEstacao) {
      found = true
      if (atual !== desejado) changed = true
    }
    terminais.push({
      terminalId,
      config: configDeTerminal(flat, isEstacao ? desejado : atual),
    })
  }

  if (!found && estacao && desejado !== 'normal') {
    changed = true
    terminais.push({
      terminalId: estacao,
      config: configDeTerminal({}, desejado),
    })
  }

  return { terminais, changed }
}

async function erroCorpo(res: Response, fallback: string): Promise<string> {
  const body: unknown = await res.json().catch(() => ({}))
  const o = asRecord(body)
  const msg = String(o?.error ?? o?.message ?? '').trim()
  return msg || fallback
}

/**
 * Grava a via de produção no mapa impressora×estação (`terminais` / `impressora_terminal_map`).
 * O PUT de mapeamentos da estação só garante o nome Windows.
 */
export async function salvarModosImpressaoDaEstacao(
  token: string,
  estacaoId: string,
  modos: Record<string, ModoImpressaoImpressora | undefined>
): Promise<void> {
  const accessToken = token.trim()
  const estacao = estacaoId.trim()
  if (!accessToken || !estacao) return

  const entries = Object.entries(modos)
    .map(([id, modo]) => [id.trim(), parseModoImpressaoImpressora(modo)] as const)
    .filter(([id]) => Boolean(id))

  if (entries.length === 0) return

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  }

  await Promise.all(
    entries.map(async ([impressoraId, modo]) => {
      const getRes = await fetchGestorApi(`/api/impressoras/${encodeURIComponent(impressoraId)}`, {
        headers,
        cache: 'no-store',
      })
      if (!getRes.ok) {
        throw new Error(await erroCorpo(getRes, `Não foi possível ler a impressora ${impressoraId}.`))
      }
      const printer = await getRes.json()
      const montado = montarTerminaisComModoDaEstacao(printer, estacao, modo)
      if (!montado.changed) return

      const patchRes = await fetchGestorApi(`/api/impressoras/${encodeURIComponent(impressoraId)}`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ terminais: montado.terminais }),
      })
      if (!patchRes.ok) {
        throw new Error(
          await erroCorpo(patchRes, `Não foi possível salvar a via de produção de ${impressoraId}.`)
        )
      }
    })
  )
}
