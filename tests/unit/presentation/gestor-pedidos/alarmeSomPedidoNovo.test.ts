import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AlarmeSomPedidoNovo,
  pedidoAindaAguardaTriagem,
  resolverModoSomPedidoNovo,
} from '@/src/presentation/gestor-pedidos/som/alarmeSomPedidoNovo'

describe('resolverModoSomPedidoNovo', () => {
  it('Novos Pedidos aguardam triagem', () => {
    expect(resolverModoSomPedidoNovo('NOVOS_PEDIDOS')).toBe('aguardando_triagem')
  })

  it('producao ja aceita', () => {
    expect(resolverModoSomPedidoNovo('EM_PREPARO')).toBe('ja_aceito')
  })
})

describe('pedidoAindaAguardaTriagem', () => {
  it('recusa cancelado mesmo com etapa novos', () => {
    expect(pedidoAindaAguardaTriagem('NOVOS_PEDIDOS', 'CANCELADO')).toBe(false)
  })

  it('aceita pendente em novos', () => {
    expect(pedidoAindaAguardaTriagem('NOVOS_PEDIDOS', 'PENDENTE')).toBe(true)
  })
})

describe('AlarmeSomPedidoNovo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function criarAlarme(podeTocar = true) {
    const tocar = vi.fn()
    const alarme = new AlarmeSomPedidoNovo({
      tocar,
      podeTocar: () => podeTocar,
      agendar: (fn, ms) => setTimeout(fn, ms),
      cancelar: id => clearTimeout(id),
    })
    return { alarme, tocar, setPodeTocar: (v: boolean) => {
      podeTocar = v
    } }
  }

  it('novos: toca, 2s, toca, 3s, toca, e para ao aceitar', () => {
    const { alarme, tocar } = criarAlarme()
    alarme.onPedidoCriado('p1', 'aguardando_triagem')
    expect(tocar).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1999)
    expect(tocar).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    expect(tocar).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(3000)
    expect(tocar).toHaveBeenCalledTimes(3)

    alarme.onPedidoResolvido('p1')
    vi.advanceTimersByTime(10_000)
    expect(tocar).toHaveBeenCalledTimes(3)
  })

  it('producao: dois toques com 2s', () => {
    const { alarme, tocar } = criarAlarme()
    alarme.onPedidoCriado('p1', 'ja_aceito')
    expect(tocar).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(2000)
    expect(tocar).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(10_000)
    expect(tocar).toHaveBeenCalledTimes(2)
  })

  it('silencio para o loop de novos', () => {
    const ctx = criarAlarme()
    ctx.alarme.onPedidoCriado('p1', 'aguardando_triagem')
    ctx.setPodeTocar(false)
    ctx.alarme.pararPorSilencio()
    vi.advanceTimersByTime(20_000)
    expect(ctx.tocar).toHaveBeenCalledTimes(1)
  })
})
