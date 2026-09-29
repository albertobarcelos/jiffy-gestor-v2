import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeAll, describe, expect, it } from 'vitest'

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
    true
})
import { DeliveryQuantidadeStepper } from '@/src/presentation/components/features/delivery-publico/shared/components/DeliveryQuantidadeStepper'

function renderStepper(props: {
  value: number
  hideDecreaseWhenMin?: boolean
}) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => {
    root.render(
      <DeliveryQuantidadeStepper
        value={props.value}
        min={0}
        hideDecreaseWhenMin={props.hideDecreaseWhenMin}
        decreaseLabel="Diminuir mostarda"
        increaseLabel="Aumentar mostarda"
        onDecrease={() => undefined}
        onIncrease={() => undefined}
      />
    )
  })
  return {
    host,
    cleanup: () => {
      act(() => root.unmount())
      host.remove()
    },
  }
}

describe('DeliveryQuantidadeStepper', () => {
  it('mostra só o + quando o complemento ainda não foi escolhido', () => {
    const { host, cleanup } = renderStepper({ value: 0, hideDecreaseWhenMin: true })
    expect(host.querySelector('[aria-label="Diminuir mostarda"]')).toBeNull()
    expect(host.querySelector('[aria-label="Quantidade"]')).toBeNull()
    expect(host.querySelector('[aria-label="Aumentar mostarda"]')).not.toBeNull()
    cleanup()
  })

  it('mostra − e a quantidade depois de selecionar', () => {
    const { host, cleanup } = renderStepper({ value: 1, hideDecreaseWhenMin: true })
    expect(host.querySelector('[aria-label="Diminuir mostarda"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="Quantidade"]')?.textContent).toBe('1')
    expect(host.querySelector('[aria-label="Aumentar mostarda"]')).not.toBeNull()
    cleanup()
  })
})
