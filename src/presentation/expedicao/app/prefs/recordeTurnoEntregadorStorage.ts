import {
  chaveStorageRecordeTurno,
  parseRecordeTurnoEntregador,
  type RecordeTurnoEntregador,
} from '@/src/application/expedicao/app/placarTurnoEntregador'

function storageLocal(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function lerRecordeTurnoEntregador(entregadorId: string): RecordeTurnoEntregador | null {
  const storage = storageLocal()
  if (!storage || !entregadorId.trim()) return null
  try {
    return parseRecordeTurnoEntregador(storage.getItem(chaveStorageRecordeTurno(entregadorId)))
  } catch {
    return null
  }
}

export function gravarRecordeTurnoEntregador(entregadorId: string, recorde: RecordeTurnoEntregador): void {
  const storage = storageLocal()
  if (!storage || !entregadorId.trim()) return
  try {
    storage.setItem(chaveStorageRecordeTurno(entregadorId), JSON.stringify(recorde))
  } catch {
    /* quota / modo privado */
  }
}
