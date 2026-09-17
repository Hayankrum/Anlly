import type { CSSProperties } from 'react'

const baseStyle: CSSProperties = { backgroundColor: 'var(--bg-tertiary)' }

export function Skeleton({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg ${className}`}
      style={{ ...baseStyle, ...style }}
    />
  )
}

export function ListaSkeleton({ itens = 5, altura = 'h-16' }: { itens?: number; altura?: string }) {
  return (
    <div role="status" aria-label="Carregando..." className="flex flex-col gap-2">
      <span className="sr-only">Carregando...</span>
      {Array.from({ length: itens }).map((_, i) => (
        <Skeleton key={i} className={`${altura} w-full`} />
      ))}
    </div>
  )
}

export function ConfigSkeleton() {
  return (
    <div role="status" aria-label="Carregando..." className="flex flex-col gap-6">
      <span className="sr-only">Carregando...</span>
      <Skeleton className="h-7 w-40" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  )
}

export function PostCardSkeleton() {
  return (
    <div className="rounded-lg p-5" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <Skeleton className="h-6 w-2/3 mb-2" />
      <Skeleton className="h-3 w-24 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-1/2 mb-4" />
      <Skeleton className="h-4 w-20" />
    </div>
  )
}

export function PostListaSkeleton({ itens = 3 }: { itens?: number }) {
  return (
    <div id="skeleton-lista" role="status" aria-label="Carregando..." className="flex flex-col gap-4">
      <span className="sr-only">Carregando...</span>
      {Array.from({ length: itens }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function PostDetalheSkeleton() {
  return (
    <div role="status" aria-label="Carregando..." className="flex flex-col gap-6">
      <span className="sr-only">Carregando...</span>
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div role="status" aria-label="Carregando..." className="flex flex-col gap-6">
      <span className="sr-only">Carregando...</span>
      <Skeleton className="h-7 w-1/3" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}