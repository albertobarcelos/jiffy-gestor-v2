'use client'

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className ?? ''}`}
      style={{
        backgroundColor:
          'color-mix(in srgb, var(--delivery-text-muted, #9ca3af) 18%, var(--delivery-surface, #ffffff))',
      }}
      aria-hidden
    />
  )
}

function SkeletonProdutoCard() {
  return (
    <div
      className="flex overflow-hidden rounded-lg border"
      style={{ borderColor: 'var(--delivery-border, #e5e7eb)' }}
    >
      <div className="min-w-0 flex-1 space-y-2.5 py-3.5 pl-3.5 pr-3">
        <Bone className="h-4 w-36" />
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-4/5 max-w-[12rem]" />
        <Bone className="mt-2 h-4 w-20" />
      </div>
      <Bone className="w-28 min-h-28 shrink-0 rounded-none @lg:w-36 @lg:min-h-36" />
    </div>
  )
}

/** Skeleton da home pública (layout básico) enquanto o catálogo carrega. */
export function DeliveryPublicoHomeSkeleton() {
  return (
    <div
      className="delivery-basico-catalog-root flex min-h-full flex-col pb-24"
      role="status"
      aria-busy="true"
      aria-label="Carregando cardápio"
    >
      {/* Topnav */}
      <div
        className="flex items-center gap-2 px-3 py-1 @sm:gap-2.5 @sm:px-4 @sm:py-3"
        style={{ backgroundColor: 'var(--delivery-primary-dark, #171717)' }}
      >
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/20 @sm:h-16 @sm:w-16" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3 w-40 max-w-[70%] animate-pulse rounded bg-white/25" />
          <div className="h-3 w-52 max-w-[85%] animate-pulse rounded bg-white/20" />
          <div className="h-2.5 w-24 animate-pulse rounded bg-white/15" />
        </div>
        <div className="flex shrink-0 gap-1">
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/15" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/15" />
        </div>
      </div>

      <div className="delivery-basico-content-column flex min-h-0 w-full flex-1 flex-col">
        {/* Banner / capa */}
        <Bone className="h-36 w-full rounded-none @sm:h-44" />

        {/* Busca */}
        <div className="px-3 pt-3 @sm:px-4">
          <Bone className="h-11 w-full rounded-xl" />
        </div>

        {/* Chips de grupo */}
        <div className="flex gap-2 overflow-hidden px-3 py-3 @sm:px-4">
          <Bone className="h-9 w-24 shrink-0 rounded-full" />
          <Bone className="h-9 w-20 shrink-0 rounded-full" />
          <Bone className="h-9 w-28 shrink-0 rounded-full" />
          <Bone className="h-9 w-16 shrink-0 rounded-full" />
        </div>

        {/* Título de seção + produtos */}
        <div className="px-3 @sm:px-4">
          <div className="mb-3 flex items-center justify-center gap-2 py-2">
            <Bone className="h-5 w-5 rounded-full" />
            <Bone className="h-5 w-28" />
            <Bone className="h-5 w-5 rounded-full" />
          </div>

          <div className="space-y-3">
            <SkeletonProdutoCard />
            <SkeletonProdutoCard />
            <SkeletonProdutoCard />
            <SkeletonProdutoCard />
          </div>
        </div>
      </div>

      <span className="sr-only">Carregando cardápio…</span>
    </div>
  )
}
