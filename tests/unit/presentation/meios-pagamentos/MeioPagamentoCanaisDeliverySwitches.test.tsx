/** @vitest-environment jsdom */
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { MeioPagamentoCanaisDeliverySwitches } from '@/src/presentation/components/features/meios-pagamentos/MeioPagamentoCanaisDeliverySwitches'

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

function renderSwitches(props: {
  entrega: boolean
  retirada: boolean
  updatingEntrega?: boolean
  onToggle?: ReturnType<typeof vi.fn>
}) {
  const onToggle = props.onToggle ?? vi.fn()
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => {
    root.render(
      <MeioPagamentoCanaisDeliverySwitches
        nome="PIX"
        entrega={props.entrega}
        retirada={props.retirada}
        updatingEntrega={props.updatingEntrega}
        onToggle={onToggle}
      />
    )
  })
  return {
    host,
    onToggle,
    cleanup: () => {
      act(() => root.unmount())
      host.remove()
    },
  }
}

describe('MeioPagamentoCanaisDeliverySwitches', () => {
  it('mostra os dois canais independentes', () => {
    const { host, cleanup } = renderSwitches({ entrega: false, retirada: true })
    const entrega = host.querySelector('[aria-label="Entrega — PIX"]')
    const retirada = host.querySelector('[aria-label="Retirada — PIX"]')
    expect(entrega?.getAttribute('aria-checked')).toBe('false')
    expect(retirada?.getAttribute('aria-checked')).toBe('true')
    cleanup()
  })

  it('clicar em entrega não chama retirada', () => {
    const { host, onToggle, cleanup } = renderSwitches({ entrega: false, retirada: true })
    const entrega = host.querySelector('[aria-label="Entrega — PIX"]') as HTMLButtonElement
    act(() => {
      entrega.click()
    })
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith('ativoEntregaDelivery', true)
    expect(host.querySelector('[aria-label="Retirada — PIX"]')?.getAttribute('aria-checked')).toBe(
      'true'
    )
    cleanup()
  })

  it('não dispara enquanto o canal está gravando', () => {
    const { host, onToggle, cleanup } = renderSwitches({
      entrega: false,
      retirada: true,
      updatingEntrega: true,
    })
    const entrega = host.querySelector('[aria-label="Entrega — PIX"]') as HTMLButtonElement
    act(() => {
      entrega.click()
    })
    expect(onToggle).not.toHaveBeenCalled()
    cleanup()
  })
})
