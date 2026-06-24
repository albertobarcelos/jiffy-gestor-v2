'use client'

import { Toaster, ToastBar, toast, type Toast } from 'react-hot-toast'
import { MdClose } from 'react-icons/md'

const toastOptions = {
  duration: 4000,
  style: {
    background: '#fff',
    color: '#333',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  success: {
    iconTheme: {
      primary: '#10b981',
      secondary: '#fff',
    },
  },
  error: {
    duration: 5000,
    iconTheme: {
      primary: '#ef4444',
      secondary: '#fff',
    },
  },
}

function JiffyToastBar({ toast: t }: { toast: Toast }) {
  return (
    <ToastBar toast={t} position={t.position}>
      {({ icon, message }) => (
        <>
          {icon}
          {message}
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            aria-label="Fechar notificação"
            className="ml-1 shrink-0 self-center rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <MdClose className="h-4 w-4" aria-hidden />
          </button>
        </>
      )}
    </ToastBar>
  )
}

/**
 * Toaster global com botão X em cada notificação.
 * Durações por tipo continuam vindas de `showToast` / chamadas diretas a `toast`.
 */
export function AppToaster() {
  return (
    <Toaster position="top-right" toastOptions={toastOptions}>
      {(t) => <JiffyToastBar toast={t} />}
    </Toaster>
  )
}
