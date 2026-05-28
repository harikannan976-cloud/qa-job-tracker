import { CSSProperties } from 'react'

export function Skeleton({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} style={style} />
}
