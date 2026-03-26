/**
 * Store mínima para abrir o modal de “regenerar vs aguardar” a partir de
 * `abrirDocumentoFiscalPdf` (função utilitária fora da árvore React).
 */

export type DocumentoFiscalPdfRetryChoice = 'regenerar' | 'aguardar'

type EstadoFechado = { open: false }
type EstadoAberto = {
  open: true
  errorMessage: string
  documentoLabel: string
  resolve: (choice: DocumentoFiscalPdfRetryChoice | null) => void
}

export type DocumentoFiscalPdfRetryModalState = EstadoFechado | EstadoAberto

let state: DocumentoFiscalPdfRetryModalState = { open: false }
const listeners = new Set<() => void>()

function notificar() {
  listeners.forEach(cb => cb())
}

export function subscribeDocumentoFiscalPdfRetryModal(onChange: () => void) {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function getDocumentoFiscalPdfRetryModalSnapshot(): DocumentoFiscalPdfRetryModalState {
  return state
}

/** Referência estável para SSR/hidratação — useSyncExternalStore exige o mesmo objeto em chamadas repetidas no servidor */
const SNAPSHOT_SERVIDOR_FECHADO: DocumentoFiscalPdfRetryModalState = { open: false }

export function getDocumentoFiscalPdfRetryModalServerSnapshot(): DocumentoFiscalPdfRetryModalState {
  return SNAPSHOT_SERVIDOR_FECHADO
}

/** Abre o modal e retorna a escolha do usuário (null = fechou sem escolher). */
export function requestDocumentoFiscalPdfRetryChoice(params: {
  errorMessage: string
  documentoLabel: string
}): Promise<DocumentoFiscalPdfRetryChoice | null> {
  return new Promise(resolve => {
    state = {
      open: true,
      errorMessage: params.errorMessage,
      documentoLabel: params.documentoLabel,
      resolve,
    }
    notificar()
  })
}

export function finishDocumentoFiscalPdfRetryModal(choice: DocumentoFiscalPdfRetryChoice | null) {
  if (!state.open) return
  const { resolve } = state
  state = { open: false }
  notificar()
  resolve(choice)
}
