'use client'

import type { ReactNode } from 'react'

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'limpar', '0', 'ok'] as const

type ExpedicaoTecladoSenhaProps = {
  senha: string
  erro: string | null
  ocupado: boolean
  titulo?: string
  subtitulo?: string
  rodape?: ReactNode
  onDigito: (digito: string) => void
  onApagar: () => void
  onLimpar: () => void
  onConfirmar: () => void
}

export function ExpedicaoTecladoSenha({
  senha,
  erro,
  ocupado,
  titulo = 'Quem está retirando?',
  subtitulo = 'Digite a senha de 4 dígitos ou bipa o crachá.',
  rodape,
  onDigito,
  onApagar,
  onLimpar,
  onConfirmar,
}: ExpedicaoTecladoSenhaProps) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-8 px-6 py-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">Expedição</p>
        <h1 className="mt-2 text-3xl font-semibold text-primary-text md:text-4xl">{titulo}</h1>
        <p className="mt-2 text-base text-secondary-text">{subtitulo}</p>
      </div>

      <div
        className="flex gap-3"
        aria-label={`Senha, ${senha.length} de 4 dígitos`}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            aria-hidden
            className={`flex h-16 w-14 items-center justify-center rounded-xl border-2 border-primary/30 bg-primary-bg text-3xl font-semibold text-primary-text md:h-20 md:w-16 ${
              ocupado ? 'animate-pulse' : ''
            }`}
          >
            {senha[i] ? '*' : ''}
          </div>
        ))}
      </div>

      {erro ? (
        <p className="text-center text-base font-medium text-red-600" role="alert">
          {erro}
        </p>
      ) : (
        <p className="h-6" />
      )}

      <div className="grid w-full max-w-sm grid-cols-3 gap-3">
        {TECLAS.map(tecla => {
          if (tecla === 'limpar') {
            return (
              <button
                key={tecla}
                type="button"
                disabled={ocupado}
                onClick={senha ? onApagar : onLimpar}
                onDoubleClick={onLimpar}
                className="h-16 rounded-2xl bg-slate-200 text-lg font-semibold text-slate-700 disabled:opacity-50 md:h-20"
              >
                ⌫
              </button>
            )
          }
          if (tecla === 'ok') {
            return (
              <button
                key={tecla}
                type="button"
                disabled={ocupado || senha.length !== 4}
                onClick={onConfirmar}
                className="h-16 rounded-2xl bg-primary text-lg font-semibold text-white disabled:opacity-40 md:h-20"
              >
                {ocupado ? 'Verificando…' : 'OK'}
              </button>
            )
          }
          return (
            <button
              key={tecla}
              type="button"
              disabled={ocupado}
              onClick={() => onDigito(tecla)}
              className="h-16 rounded-2xl bg-white text-2xl font-semibold text-primary-text shadow-sm ring-1 ring-black/5 disabled:opacity-50 md:h-20"
            >
              {tecla}
            </button>
          )
        })}
      </div>
      {rodape}
    </div>
  )
}
