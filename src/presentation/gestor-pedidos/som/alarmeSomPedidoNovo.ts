import { lerSomPedidosSilenciado, tocarSomPedidoNovo } from '@/src/presentation/gestor-pedidos/som/somPedidoNovo'

export const INTERVALO_INICIAL_SOM_NOVOS_MS = 2000
export const INCREMENTO_INTERVALO_SOM_NOVOS_MS = 1000
export const INTERVALO_SOM_PRODUCAO_MS = 2000
export const TOQUES_SOM_PRODUCAO = 2

export type ModoSomPedidoNovo = 'aguardando_triagem' | 'ja_aceito'

export function resolverModoSomPedidoNovo(etapaKanban: string): ModoSomPedidoNovo {
  return etapaKanban === 'NOVOS_PEDIDOS' ? 'aguardando_triagem' : 'ja_aceito'
}

export function pedidoAindaAguardaTriagem(
  etapaKanban: string,
  statusOperacional?: string | null
): boolean {
  const status = String(statusOperacional ?? '')
    .trim()
    .toUpperCase()
  if (status === 'CANCELADO' || status === 'CANCELADA') return false
  return etapaKanban === 'NOVOS_PEDIDOS'
}

export function sincronizarAlarmeSomComPedidoDelivery(input: {
  vendaId: string
  etapaKanban?: string | null
  statusOperacional?: string | null
}): void {
  const alarme = obterAlarmeSomPedidoNovo()
  if (pedidoAindaAguardaTriagem(input.etapaKanban ?? '', input.statusOperacional)) {
    alarme.onPedidoAindaAguardando(input.vendaId)
    return
  }
  alarme.onPedidoResolvido(input.vendaId)
}

export function proximoIntervaloSomNovos(intervaloAtualMs: number): number {
  return intervaloAtualMs + INCREMENTO_INTERVALO_SOM_NOVOS_MS
}

export type AlarmeSomPedidoNovoDeps = {
  tocar: () => void
  podeTocar: () => boolean
  agendar: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>
  cancelar: (id: ReturnType<typeof setTimeout>) => void
}

const depsBrowser: AlarmeSomPedidoNovoDeps = {
  tocar: tocarSomPedidoNovo,
  podeTocar: () => !lerSomPedidosSilenciado(),
  agendar: (fn, ms) => setTimeout(fn, ms),
  cancelar: id => clearTimeout(id),
}

/**
 * Fredy: Novos (PENDENTE) — toca, espera 2s, toca, 3s, 4s… até aceitar/recusar.
 * Produção (já aceito) — dois toques com 2s de intervalo.
 */
export class AlarmeSomPedidoNovo {
  private readonly aguardando = new Set<string>()
  private loopId: ReturnType<typeof setTimeout> | null = null
  private intervaloProximoMs = INTERVALO_INICIAL_SOM_NOVOS_MS
  private readonly producaoIds: ReturnType<typeof setTimeout>[] = []

  constructor(private readonly deps: AlarmeSomPedidoNovoDeps) {}

  onPedidoCriado(pedidoId: string, modo: ModoSomPedidoNovo): void {
    if (modo === 'aguardando_triagem') {
      const jaTinha = this.aguardando.size > 0
      this.aguardando.add(pedidoId)
      if (!this.deps.podeTocar()) return
      if (!jaTinha) this.iniciarLoopNovos()
      return
    }
    if (!this.deps.podeTocar()) return
    if (this.aguardando.size > 0) return
    this.tocarProducao()
  }

  onPedidoResolvido(pedidoId: string): void {
    this.aguardando.delete(pedidoId)
    if (this.aguardando.size === 0) this.pararLoopNovos()
  }

  onPedidoAindaAguardando(pedidoId: string): void {
    this.aguardando.add(pedidoId)
  }

  pararPorSilencio(): void {
    this.pararLoopNovos()
    this.cancelarProducao()
  }

  retomarAposSomLigado(): void {
    if (this.aguardando.size === 0 || !this.deps.podeTocar()) return
    this.iniciarLoopNovos()
  }

  destroy(): void {
    this.aguardando.clear()
    this.pararLoopNovos()
    this.cancelarProducao()
  }

  get quantidadeAguardando(): number {
    return this.aguardando.size
  }

  private iniciarLoopNovos(): void {
    this.pararLoopNovos()
    this.intervaloProximoMs = INTERVALO_INICIAL_SOM_NOVOS_MS
    this.deps.tocar()
    this.agendarProximoLoop()
  }

  private agendarProximoLoop(): void {
    this.loopId = this.deps.agendar(() => {
      this.loopId = null
      if (this.aguardando.size === 0 || !this.deps.podeTocar()) return
      this.deps.tocar()
      this.intervaloProximoMs = proximoIntervaloSomNovos(this.intervaloProximoMs)
      this.agendarProximoLoop()
    }, this.intervaloProximoMs)
  }

  private pararLoopNovos(): void {
    if (this.loopId != null) {
      this.deps.cancelar(this.loopId)
      this.loopId = null
    }
    this.intervaloProximoMs = INTERVALO_INICIAL_SOM_NOVOS_MS
  }

  private tocarProducao(): void {
    this.deps.tocar()
    const id = this.deps.agendar(() => {
      this.removerProducaoId(id)
      if (!this.deps.podeTocar()) return
      this.deps.tocar()
    }, INTERVALO_SOM_PRODUCAO_MS)
    this.producaoIds.push(id)
  }

  private cancelarProducao(): void {
    for (const id of this.producaoIds) this.deps.cancelar(id)
    this.producaoIds.length = 0
  }

  private removerProducaoId(id: ReturnType<typeof setTimeout>): void {
    const i = this.producaoIds.indexOf(id)
    if (i >= 0) this.producaoIds.splice(i, 1)
  }
}

let alarmeGlobal: AlarmeSomPedidoNovo | null = null

export function obterAlarmeSomPedidoNovo(): AlarmeSomPedidoNovo {
  if (!alarmeGlobal) {
    alarmeGlobal = new AlarmeSomPedidoNovo(depsBrowser)
  }
  return alarmeGlobal
}

/** Só testes. */
export function resetAlarmeSomPedidoNovoParaTestes(): void {
  alarmeGlobal?.destroy()
  alarmeGlobal = null
}
