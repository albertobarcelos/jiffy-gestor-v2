'use client'

import Image from 'next/image'
import type { MouseEvent } from 'react'

type BotaoWazeAppProps = {
  href: string
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}

export function BotaoWazeApp({ href, onClick }: BotaoWazeAppProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Abrir no Waze"
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center rounded-xl bg-[#33CCFF]"
    >
      <Image
        src="/images/expedicao/waze_logo.webp"
        alt=""
        width={120}
        height={40}
        className="h-9 w-auto"
      />
    </a>
  )
}
