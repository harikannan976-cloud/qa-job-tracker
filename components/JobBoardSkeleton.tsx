import { Skeleton } from './ui/Skeleton'

function StatSkeleton() {
  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-xl px-4 py-3">
      <Skeleton className="h-2.5 w-14 mb-3" />
      <Skeleton className="h-6 w-8 mb-1" />
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="bg-[#111118] border border-[#1a1a26] rounded-xl p-5">
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-36" />
          <div className="flex gap-3 pt-0.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-3 w-full mt-1" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
    </div>
  )
}

export default function JobBoardSkeleton() {
  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
        {Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />)}
      </div>
      <div className="flex gap-2 mb-6">
        {[72, 56, 68, 80, 60].map((w, i) => (
          <Skeleton key={i} className="h-8 rounded-full" style={{ width: w } as React.CSSProperties} />
        ))}
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  )
}
