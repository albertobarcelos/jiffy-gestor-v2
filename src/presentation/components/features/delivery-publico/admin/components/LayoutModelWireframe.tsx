'use client'

import type { ReactElement } from 'react'
import { cn } from '@/src/shared/utils/cn'
import type { DeliveryLayoutId } from '../../shared/types/deliveryPublicoDesignConfig'

function Block({ className }: { className?: string }) {
  return <div className={cn('rounded-sm bg-gray-300/70', className)} />
}

function BlockSoft({ className }: { className?: string }) {
  return <div className={cn('rounded-sm bg-gray-200/90', className)} />
}

function BasicoWireframe() {
  return (
    <div className="space-y-1.5">
      <Block className="h-4 w-full" />
      <div className="flex gap-1">
        <BlockSoft className="h-2 w-1/2 rounded-full" />
        <BlockSoft className="h-2 w-1/2 rounded-full" />
      </div>
      <BlockSoft className="mx-auto h-1.5 w-2/3" />
      <BlockSoft className="h-2.5 w-full rounded-full" />
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <BlockSoft key={index} className="h-3 w-3 shrink-0 rounded-full" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div className="min-w-0 flex-1 space-y-0.5">
            <BlockSoft className="h-1.5 w-full" />
            <BlockSoft className="h-1.5 w-4/5" />
          </div>
          <Block className="h-5 w-5 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  )
}

function VitrineWireframe() {
  return (
    <div className="space-y-1.5">
      <Block className="h-5 w-full" />
      <Block className="h-8 w-full rounded-md" />
      <div className="flex gap-1 border-b border-gray-200 pb-1">
        <BlockSoft className="h-2 w-1/4 bg-gray-300/80" />
        <BlockSoft className="h-2 w-1/4" />
        <BlockSoft className="h-2 w-1/4" />
      </div>
      <Block className="h-10 w-full rounded-md" />
      <Block className="h-10 w-full rounded-md" />
    </div>
  )
}

function GradeWireframe() {
  return (
    <div className="space-y-1.5">
      <Block className="h-5 w-full rounded-b-lg" />
      <BlockSoft className="mx-auto h-2 w-3/4 rounded-full" />
      <BlockSoft className="h-2.5 w-full rounded-full" />
      <div className="grid grid-cols-2 gap-1.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-1">
            <Block className="aspect-square w-full rounded-md" />
            <BlockSoft className="h-1.5 w-full" />
            <BlockSoft className="h-1 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

function CatalogoWireframe() {
  return (
    <div className="space-y-1.5">
      <Block className="h-4 w-full" />
      <BlockSoft className="h-2 w-full rounded-full" />
      <BlockSoft className="h-2 w-2/3 rounded-full" />
      <BlockSoft className="h-1.5 w-1/3 bg-gray-300/80" />
      <div className="flex gap-1.5 overflow-hidden">
        <Block className="h-8 w-[55%] shrink-0 rounded-md" />
        <Block className="h-8 w-[40%] shrink-0 rounded-md opacity-70" />
      </div>
      <div className="flex gap-1.5 overflow-hidden">
        <Block className="h-7 w-[55%] shrink-0 rounded-md" />
        <Block className="h-7 w-[40%] shrink-0 rounded-md opacity-70" />
      </div>
    </div>
  )
}

const WIREFRAMES: Record<DeliveryLayoutId, () => ReactElement> = {
  basico: BasicoWireframe,
  vitrine: VitrineWireframe,
  grade: GradeWireframe,
  catalogo: CatalogoWireframe,
}

export function LayoutModelWireframe({ layoutId }: { layoutId: DeliveryLayoutId }) {
  const Content = WIREFRAMES[layoutId]

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="mx-auto w-full max-w-[9.5rem] rounded-md border border-gray-200 bg-white p-2 shadow-sm">
        <Content />
      </div>
    </div>
  )
}
