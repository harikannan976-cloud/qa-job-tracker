import { ComingSoon } from '@/components/ui/ComingSoon'

export default function CoverLettersPage() {
  return (
    <div className="px-6 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Cover Letters</h1>
        <p className="text-[13px] text-zinc-500 mt-1">All AI-generated cover letters in one place</p>
      </div>
      <ComingSoon feature="Cover letters manager" description="Table view of all generated letters with status, quick-open, and mark-as-sent" />
    </div>
  )
}
