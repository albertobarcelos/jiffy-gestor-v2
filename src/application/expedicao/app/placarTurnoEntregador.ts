export const STORAGE_RECORDE_TURNO_ENTREGADOR = 'jiffy.expedicao.app.recorde-turno'

export type RecordeTurnoEntregador = {
  quantidade: number
  dia: string
}

export type PlacarTurnoEntregador = {
  quantidade: number
  totalTaxas: number
  recorde: number
  linhaRecorde: string | null
}

export type EstouroFinalizarEntrega = {
  taxa: number
  quantidadeHoje: number
  recorde: number
  novoRecorde: boolean
  ordinal: string
}

export function chaveDiaLocalTurno(agora = new Date()): string {
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}

export function chaveStorageRecordeTurno(entregadorId: string): string {
  return `${STORAGE_RECORDE_TURNO_ENTREGADOR}:${entregadorId.trim()}`
}

export function parseRecordeTurnoEntregador(raw: string | null | undefined): RecordeTurnoEntregador | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<RecordeTurnoEntregador>
    const quantidade = Number(parsed.quantidade)
    const dia = typeof parsed.dia === 'string' ? parsed.dia.trim() : ''
    if (!Number.isFinite(quantidade) || quantidade < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null
    return { quantidade: Math.floor(quantidade), dia }
  } catch {
    return null
  }
}

export function aplicarRecordeTurnoEntregador(
  recorde: RecordeTurnoEntregador | null,
  hoje: { quantidade: number; dia: string }
): RecordeTurnoEntregador {
  const quantidade = Math.max(0, Math.floor(hoje.quantidade))
  if (quantidade <= 0) return recorde ?? { quantidade: 0, dia: hoje.dia }
  if (!recorde || recorde.quantidade < quantidade) return { quantidade, dia: hoje.dia }
  return recorde
}

export function montarPlacarTurnoEntregador(input: {
  quantidadeHoje: number
  totalTaxasHoje: number
  recorde: RecordeTurnoEntregador | null
  diaHoje: string
}): PlacarTurnoEntregador {
  const quantidade = Math.max(0, Math.floor(input.quantidadeHoje))
  const recordeQtd = input.recorde?.quantidade ?? 0
  const recordeEhHoje = Boolean(input.recorde && input.recorde.dia === input.diaHoje && recordeQtd > 0)

  let linhaRecorde: string | null = null
  if (quantidade === 0 && recordeQtd > 0) {
    linhaRecorde = `Recorde · ${recordeQtd}`
  } else if (recordeQtd > quantidade) {
    linhaRecorde = `Faltam ${recordeQtd - quantidade} p/ o recorde (${recordeQtd})`
  } else if (recordeQtd > 0 && recordeQtd === quantidade && !recordeEhHoje) {
    linhaRecorde = `Igualou o recorde · ${recordeQtd}`
  } else if (recordeEhHoje && quantidade > 0) {
    linhaRecorde = `Recorde de hoje · ${quantidade}`
  }

  return {
    quantidade,
    totalTaxas: input.totalTaxasHoje,
    recorde: recordeQtd,
    linhaRecorde,
  }
}

export function montarEstouroFinalizarEntrega(input: {
  taxa: number | null
  quantidadeHoje: number
  recordeAntes: RecordeTurnoEntregador | null
  recordeDepois: RecordeTurnoEntregador
}): EstouroFinalizarEntrega {
  const quantidadeHoje = Math.max(1, Math.floor(input.quantidadeHoje))
  const taxa = input.taxa != null && Number.isFinite(input.taxa) ? input.taxa : 0
  return {
    taxa,
    quantidadeHoje,
    recorde: input.recordeDepois.quantidade,
    novoRecorde: input.recordeDepois.quantidade > (input.recordeAntes?.quantidade ?? 0),
    ordinal: `${quantidadeHoje}ª`,
  }
}
