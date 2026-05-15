'use client'

import Image from 'next/image'
import { MeusAppsTopNav } from '@/src/presentation/components/features/meus-apps/components/MeusAppsTopNav'

interface EmBrevePageProps {
  titulo: string
}

export function EmBrevePage({ titulo }: EmBrevePageProps) {
  return (
    <div className="flex h-full min-h-screen min-w-0 flex-col bg-[#fafafa]">
      <MeusAppsTopNav />

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
        <h1 className="font-nunito text-xl font-bold text-primary-text md:text-2xl">
          {titulo}
        </h1>
        <p className="max-w-md text-center font-nunito text-sm text-secondary-text md:text-base">
          Esta página está sendo desenvolvida e estará disponível em breve.
        </p>
        <div className="relative h-48 w-48 md:h-64 md:w-64">
          <Image
            src="/images/jiffy-acenando.png"
            alt="Jiffy acenando"
            fill
            sizes="256px"
            className="object-contain"
            priority
          />
        </div>
      </div>
    </div>
  )
}
