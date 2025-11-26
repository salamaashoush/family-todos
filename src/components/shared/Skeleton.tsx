interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
  )
}

interface SkeletonCardProps {
  lines?: number
  className?: string
}

export function SkeletonCard({ lines = 2, className = '' }: SkeletonCardProps) {
  return (
    <div className={`bg-white border-2 border-gray-200 rounded-xl p-4 ${className}`}>
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-4 ${i === 0 ? 'w-1/3' : i === lines - 1 ? 'w-1/4' : 'w-2/3'}`}
          />
        ))}
      </div>
    </div>
  )
}

interface SkeletonListProps {
  count?: number
  lines?: number
}

export function SkeletonList({ count = 3, lines = 2 }: SkeletonListProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  )
}
