'use client'

import { useState } from 'react'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffySidePanelModal } from './JiffySidePanelModal'

type DemoTab = 'a' | 'b'

/**
 * Demonstração isolada do painel padrão — não está ligada a telas de produção.
 * Importe em uma página ou rota de desenvolvimento para validar layout e animação.
 */
export function JiffySidePanelModalDemo() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<DemoTab>('a')
  const [step, setStep] = useState(1)

  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6">
      <p className="mb-3 font-['Nunito',sans-serif] text-sm text-secondary-text">
        Pré-visualização do <strong>JiffySidePanelModal</strong> (efeito lateral + rodapé padrão).
      </p>
      <Button type="button" variant="contained" color="primary" onClick={() => setOpen(true)}>
        Abrir painel de teste
      </Button>

      <JiffySidePanelModal
        open={open}
        onClose={() => setOpen(false)}
        title="Título do modal"
        subtitle="Subtítulo opcional — mesmo padrão de tipografia do app."
        tabsSlot={
          <div className="flex flex-wrap gap-1 px-2 pb-0">
            {(
              [
                { key: 'a' as const, label: 'Aba A' },
                { key: 'b' as const, label: 'Aba B' },
              ] as const
            ).map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === t.key
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
        footerVariant="bar"
        footerActions={{
          showPrevious: step > 1,
          showNext: step < 3,
          onPrevious: () => setStep(s => Math.max(1, s - 1)),
          onNext: () => setStep(s => Math.min(3, s + 1)),
          showSave: true,
          saveLabel: 'Salvar',
          onSave: async () => {
            await new Promise(r => setTimeout(r, 400))
            setOpen(false)
          },
        }}
      >
        <div className="space-y-3 font-['Nunito',sans-serif] text-sm text-primaryText">
          <p>
            Conteúdo da aba <strong>{tab === 'a' ? 'A' : 'B'}</strong> — passo simulado:{' '}
            <strong>{step}</strong>/3
          </p>
          <p className="text-secondary-text">
            O corpo rola independentemente; o cabeçalho (título + X), as abas e o rodapé permanecem
            fixos na hierarquia visual.
          </p>
        </div>
      </JiffySidePanelModal>
    </div>
  )
}
