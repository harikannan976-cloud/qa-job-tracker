import type { Job } from '@/lib/airtable'

type AssistantStatus = Job['apply_assistant_status']

const STATUS_CONFIG: Record<Exclude<AssistantStatus, ''>, { label: string; className: string }> = {
  'Not Started':      { label: 'Not Started',      className: 'text-zinc-600 bg-zinc-500/10 border-zinc-500/20' },
  'Opened':           { label: 'Opened',            className: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  'Autofilled':       { label: 'Autofilled',        className: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  'Ready for Review': { label: 'Ready for Review',  className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  'Applied Manually': { label: 'Applied Manually',  className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
}

export default function ApplyAssistantBadge({
  status, size = 'sm',
}: {
  status: AssistantStatus
  size?: 'sm' | 'xs'
}) {
  if (!status) return null

  const config = STATUS_CONFIG[status]
  if (!config) return null

  return (
    <span className={`inline-flex items-center border rounded-full font-medium ${
      size === 'xs'
        ? 'text-[9px] px-1.5 py-0.5'
        : 'text-[10px] px-2 py-0.5'
    } ${config.className}`}>
      {config.label}
    </span>
  )
}
