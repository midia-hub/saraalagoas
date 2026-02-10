'use client'

export interface AlbumGridSkeletonProps {
  count?: number
}

export function AlbumGridSkeleton({ count = 8 }: AlbumGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-pulse"
        >
          <div className="aspect-[4/3] bg-slate-200" />
          <div className="p-3 space-y-2">
            <div className="h-4 w-16 rounded bg-slate-200" />
            <div className="h-5 w-full rounded bg-slate-200" />
            <div className="h-4 w-24 rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  )
}
