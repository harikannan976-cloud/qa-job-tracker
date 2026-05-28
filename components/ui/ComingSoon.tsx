interface Props {
  feature: string
  description?: string
}

export function ComingSoon({ feature, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#16161e] border border-[#252535] flex items-center justify-center mb-4 text-2xl">
        🚧
      </div>
      <h2 className="text-[15px] font-semibold text-zinc-300 mb-1">{feature}</h2>
      {description && (
        <p className="text-[13px] text-zinc-600 max-w-xs leading-relaxed">{description}</p>
      )}
      <span className="mt-4 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[11px] text-indigo-400 font-medium">
        Coming in Phase 2
      </span>
    </div>
  )
}
