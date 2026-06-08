'use client'

import { MdInfo } from 'react-icons/md'

interface InfoHintProps {
  text: string
}

export function InfoHint({ text }: InfoHintProps) {
  return (
    <span className="group/info-hint relative inline-flex shrink-0 align-middle">
      <button
        type="button"
        tabIndex={0}
        className="rounded-full p-0.5 text-secondary-text outline-none transition-colors hover:text-alternate focus-visible:ring-2 focus-visible:ring-alternate/40"
        aria-label={text}
      >
        <MdInfo size={18} aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-1.5 w-[min(calc(100vw-2rem),18rem)] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs font-normal leading-snug text-gray-700 shadow-lg opacity-0 ring-1 ring-black/5 transition-opacity duration-150 group-hover/info-hint:visible group-hover/info-hint:opacity-100 group-focus-within/info-hint:visible group-focus-within/info-hint:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}
