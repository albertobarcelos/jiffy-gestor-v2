'use client'

import { useEffect } from 'react'
import { JIFFY_SESSION_BROADCAST_CHANNEL } from '@/src/shared/constants/sessionCoordinator'

/**
 * Responde `hub-pong` quando uma aba do ERP pergunta se o hub (Meus Apps) está vivo.
 */
export function HubSessionPingListener() {
  useEffect(() => {
    const bc = new BroadcastChannel(JIFFY_SESSION_BROADCAST_CHANNEL)
    bc.onmessage = (ev: MessageEvent<{ type?: string }>) => {
      if (ev.data?.type === 'hub-ping') {
        bc.postMessage({ type: 'hub-pong', ts: Date.now() })
      }
    }
    return () => {
      bc.close()
    }
  }, [])

  return null
}
