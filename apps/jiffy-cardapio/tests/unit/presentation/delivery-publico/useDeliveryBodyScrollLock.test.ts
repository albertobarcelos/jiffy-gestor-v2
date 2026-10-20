import { describe, expect, it } from 'vitest'
import {
  lockDeliveryScrollport,
  unlockDeliveryScrollport,
} from '@/src/presentation/components/features/delivery-publico/shared/hooks/useDeliveryBodyScrollLock'

describe('lockDeliveryScrollport', () => {
  it('trava o overflow e restaura a posição ao soltar', () => {
    const el = document.createElement('div')
    el.className = 'delivery-publico-scroll'
    Object.defineProperty(el, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 240,
    })
    document.body.appendChild(el)

    const snapshot = lockDeliveryScrollport(el)

    expect(el.classList.contains('delivery-publico-scroll--locked')).toBe(true)
    expect(el.scrollTop).toBe(240)

    el.scrollTop = 0
    unlockDeliveryScrollport(snapshot)

    expect(el.classList.contains('delivery-publico-scroll--locked')).toBe(false)
    expect(el.scrollTop).toBe(240)

    el.remove()
  })
})
