import { ComingSoon } from '@/components/ui/ComingSoon'

export default function JobsPage() {
  return (
    <div className="px-6 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Jobs</h1>
        <p className="text-[13px] text-zinc-500 mt-1">Advanced search, sort, and filtering</p>
      </div>
      <ComingSoon feature="Advanced job view" description="Full-text search, multi-column sort, and saved filters" />
    </div>
  )
}
