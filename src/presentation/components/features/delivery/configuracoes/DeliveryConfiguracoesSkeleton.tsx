'use client'

import {
  ShimmerFieldRow,
  ShimmerLine,
  ShimmerPanel,
  ShimmerPanelHeader,
  ShimmerRect,
  ShimmerRepeat,
} from '@/src/presentation/components/ui/shimmer'

export function DeliveryConfiguracoesSkeleton() {
  return (
    <div
      className="space-y-4 p-5 md:p-7"
      aria-busy="true"
      aria-label="Carregando configurações"
      role="status"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <ShimmerPanel className="min-w-0">
          <ShimmerPanelHeader />
          <div className="mt-3 space-y-2">
            <ShimmerLine width="34%" height={12} />
            <ShimmerRect height={36} radius={8} />
            <ShimmerLine width="38%" height={12} />
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <ShimmerRect height={36} radius={8} />
              </div>
              <ShimmerRect width={72} height={36} radius={8} />
            </div>
            <ShimmerFieldRow withToggle />
          </div>
        </ShimmerPanel>

        <ShimmerPanel className="min-w-0">
          <ShimmerPanelHeader />
          <div className="mt-3 space-y-2">
            <ShimmerFieldRow withToggle />
            <div className="flex flex-wrap items-center gap-2">
              <ShimmerLine width="38%" height={16} />
              <ShimmerRect width={88} height={28} radius={8} />
              <ShimmerRect width={88} height={28} radius={8} />
            </div>
            <ShimmerFieldRow withToggle />
            <ShimmerRect height={40} radius={8} />
            <ShimmerLine width="40%" height={14} />
            <ShimmerRect width="16rem" height={36} radius={8} />
          </div>
        </ShimmerPanel>
      </div>

      <ShimmerPanel>
        <ShimmerPanelHeader />
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <ShimmerRect height={176} radius={12} />
          <ShimmerRect height={176} radius={12} />
        </div>
      </ShimmerPanel>

      <ShimmerPanel>
        <ShimmerPanelHeader />
        <div className="mt-4 space-y-2">
          <ShimmerRepeat count={3}>{() => <ShimmerRect height={44} radius={8} />}</ShimmerRepeat>
        </div>
      </ShimmerPanel>
    </div>
  )
}
