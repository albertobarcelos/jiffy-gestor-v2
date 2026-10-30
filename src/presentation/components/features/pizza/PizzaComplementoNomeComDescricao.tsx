'use client'

import { useState } from 'react'
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md'

export function PizzaComplementoNomeComDescricao({
  nome,
  descricao,
  titleClassName = 'font-medium text-primary-text',
}: {
  nome: string
  descricao?: string | null
  titleClassName?: string
}) {
  const [aberta, setAberta] = useState(false)
  const texto = descricao?.trim() ?? ''
  const temDescricao = texto.length > 0

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-0.5">
        <h4 className={`min-w-0 truncate ${titleClassName}`}>{nome}</h4>
        {temDescricao ? (
          <button
            type="button"
            onClick={() => setAberta(atual => !atual)}
            className="shrink-0 rounded p-0.5 text-secondary-text hover:bg-gray-100 hover:text-primary-text"
            aria-expanded={aberta}
            aria-label={aberta ? 'Ocultar descrição' : 'Exibir descrição'}
          >
            {aberta ? <MdKeyboardArrowDown size={18} /> : <MdKeyboardArrowUp size={18} />}
          </button>
        ) : null}
      </div>
      {temDescricao && aberta ? (
        <p className="mt-1 text-[11px] leading-tight text-secondary-text">{texto}</p>
      ) : null}
    </div>
  )
}
